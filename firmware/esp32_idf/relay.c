/**
 * @file relay.c
 * @brief Thread-Safe Relay Subsystem Driver Implementation for ESP-IDF
 */

#include "relay.h"
#include <string.h>
#include "esp_log.h"
#include "driver/gpio.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"

static const char *TAG = "RELAY_HAL";

typedef struct {
    esp_channel_manifest_t manifest;
    relay_state_t state;
    uint32_t cycle_count;
    bool active;
} relay_slot_t;

static relay_slot_t s_relays[MAX_GANG_CHANNELS];
static uint8_t s_channel_count = 0;
static SemaphoreHandle_t s_relay_mutex = NULL;
static relay_callback_t s_cb = NULL;
static void *s_cb_ctx = NULL;

esp_err_t relay_init(const esp_device_manifest_t *manifest) {
    if (!manifest) return ESP_ERR_INVALID_ARG;

    if (!s_relay_mutex) {
        s_relay_mutex = xSemaphoreCreateMutex();
        if (!s_relay_mutex) return ESP_ERR_NO_MEM;
    }

    xSemaphoreTake(s_relay_mutex, portMAX_DELAY);
    s_channel_count = manifest->hardware_gang_count;
    memset(s_relays, 0, sizeof(s_relays));

    for (int i = 0; i < s_channel_count; i++) {
        s_relays[i].manifest = manifest->channels[i];
        s_relays[i].state = RELAY_STATE_OFF;
        s_relays[i].cycle_count = 0;
        s_relays[i].active = true;

        gpio_config_t io_conf = {
            .pin_bit_mask = (1ULL << manifest->channels[i].gpio_pin),
            .mode = GPIO_MODE_OUTPUT,
            .pull_down_en = GPIO_PULLDOWN_DISABLE,
            .pull_up_en = GPIO_PULLUP_DISABLE,
            .intr_type = GPIO_INTR_DISABLE
        };
        gpio_config(&io_conf);

        int level = (manifest->channels[i].active_level == RELAY_ACTIVE_HIGH) ? 0 : 1;
        gpio_set_level((gpio_num_t)manifest->channels[i].gpio_pin, level);
    }
    xSemaphoreGive(s_relay_mutex);

    ESP_LOGI(TAG, "Relay subsystem initialized with %d channels", s_channel_count);
    return ESP_OK;
}

esp_err_t relay_set_state(uint8_t gang_id, relay_state_t state) {
    if (gang_id < 1 || gang_id > s_channel_count || !s_relay_mutex) return ESP_ERR_INVALID_ARG;

    xSemaphoreTake(s_relay_mutex, portMAX_DELAY);
    int idx = gang_id - 1;
    if (s_relays[idx].state != state) {
        s_relays[idx].state = state;
        s_relays[idx].cycle_count++;

        int level = 0;
        if (s_relays[idx].manifest.active_level == RELAY_ACTIVE_HIGH) {
            level = (state == RELAY_STATE_ON) ? 1 : 0;
        } else {
            level = (state == RELAY_STATE_ON) ? 0 : 1;
        }
        gpio_set_level((gpio_num_t)s_relays[idx].manifest.gpio_pin, level);

        ESP_LOGI(TAG, "Gang %d set to %s (pin %ld)", gang_id, state == RELAY_STATE_ON ? "ON" : "OFF", s_relays[idx].manifest.gpio_pin);

        if (s_cb) {
            s_cb(gang_id, state, s_cb_ctx);
        }
    }
    xSemaphoreGive(s_relay_mutex);
    return ESP_OK;
}

relay_state_t relay_get_state(uint8_t gang_id) {
    if (gang_id < 1 || gang_id > s_channel_count || !s_relay_mutex) return RELAY_STATE_OFF;
    xSemaphoreTake(s_relay_mutex, portMAX_DELAY);
    relay_state_t s = s_relays[gang_id - 1].state;
    xSemaphoreGive(s_relay_mutex);
    return s;
}

esp_err_t relay_toggle(uint8_t gang_id) {
    relay_state_t cur = relay_get_state(gang_id);
    return relay_set_state(gang_id, (cur == RELAY_STATE_ON) ? RELAY_STATE_OFF : RELAY_STATE_ON);
}

esp_err_t relay_set_all(relay_state_t state) {
    for (uint8_t g = 1; g <= s_channel_count; g++) {
        relay_set_state(g, state);
    }
    return ESP_OK;
}

uint32_t relay_get_cycle_count(uint8_t gang_id) {
    if (gang_id < 1 || gang_id > s_channel_count || !s_relay_mutex) return 0;
    xSemaphoreTake(s_relay_mutex, portMAX_DELAY);
    uint32_t c = s_relays[gang_id - 1].cycle_count;
    xSemaphoreGive(s_relay_mutex);
    return c;
}

void relay_register_callback(relay_callback_t cb, void *user_ctx) {
    s_cb = cb;
    s_cb_ctx = user_ctx;
}
