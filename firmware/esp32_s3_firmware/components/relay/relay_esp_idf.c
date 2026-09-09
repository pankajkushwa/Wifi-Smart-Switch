/**
 * @file relay_esp_idf.c
 * @brief Production ESP-IDF Implementation of Relay Subsystem
 * Target: ESP32-S3-WROOM-N8R8
 * Framework: ESP-IDF v5.2+ (Uses esp_timer, driver/gpio, FreeRTOS Semaphore)
 */

#include "relay.h"
#include <string.h>
#include <stdio.h>
#include "esp_log.h"
#include "esp_timer.h"
#include "driver/gpio.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"

static const char *TAG = "RELAY_IDF";

typedef struct {
    esp_channel_manifest_t manifest;
    relay_state_t current_state;
    esp_timer_handle_t pulse_timer;
    uint32_t cycle_count;
    bool is_initialized;
} idf_relay_channel_t;

/* Static Channel Registry (Zero heap fragmentation after boot) */
static idf_relay_channel_t s_relays[RELAY_MAX_GANGS];
static uint8_t s_active_gang_count = 0;
static const esp_device_manifest_t *s_board_manifest = NULL;
static SemaphoreHandle_t s_relay_mutex = NULL;
static StaticSemaphore_t s_relay_mutex_buffer;

static relay_state_change_cb_t s_state_cb = NULL;
static void *s_state_cb_ctx = NULL;

/* Forward Declarations */
static void pulse_timer_callback(void *arg);
static void apply_hardware_gpio(const idf_relay_channel_t *ch, relay_state_t state);

int relay_subsystem_init(const esp_device_manifest_t *manifest) {
    if (manifest == NULL || manifest->hardware_gang_count == 0 || manifest->hardware_gang_count > RELAY_MAX_GANGS) {
        ESP_LOGE(TAG, "Invalid manifest or gang_count");
        return -1;
    }

    s_board_manifest = manifest;

    /* Initialize Static Mutex */
    if (s_relay_mutex == NULL) {
        s_relay_mutex = xSemaphoreCreateMutexStatic(&s_relay_mutex_buffer);
    }

    xSemaphoreTake(s_relay_mutex, portMAX_DELAY);
    s_active_gang_count = manifest->hardware_gang_count;

    for (uint8_t i = 0; i < s_active_gang_count; i++) {
        const esp_channel_manifest_t *cm = &manifest->channels[i];
        uint8_t idx = cm->gang_id - 1;
        if (idx >= RELAY_MAX_GANGS) continue;

        s_relays[idx].manifest = *cm;
        s_relays[idx].current_state = RELAY_STATE_OFF;
        s_relays[idx].cycle_count = 0;
        s_relays[idx].is_initialized = true;

        /* Configure ESP32-S3 GPIO */
        gpio_config_t io_conf = {
            .pin_bit_mask = (1ULL << cm->gpio_pin),
            .mode = GPIO_MODE_OUTPUT,
            .pull_up_en = GPIO_PULLUP_DISABLE,
            .pull_down_en = GPIO_PULLDOWN_DISABLE,
            .intr_type = GPIO_INTR_DISABLE,
        };
        esp_err_t err = gpio_config(&io_conf);
        if (err != ESP_OK) {
            ESP_LOGE(TAG, "GPIO config failed for Gang %d, pin %ld: %s",
                     cm->gang_id, cm->gpio_pin, esp_err_to_name(err));
            xSemaphoreGive(s_relay_mutex);
            return -2;
        }

        /* Create High-Resolution ESP Software Timer for Pulse Mode */
        esp_timer_create_args_t timer_args = {
            .callback = &pulse_timer_callback,
            .arg = (void *)(uintptr_t)cm->gang_id,
            .name = "relay_pulse_tmr"
        };
        esp_timer_create(&timer_args, &s_relays[idx].pulse_timer);

        /* Set initial hardware level */
        apply_hardware_gpio(&s_relays[idx], s_relays[idx].current_state);

        ESP_LOGI(TAG, "Gang %d [%s] initialized on GPIO %ld (Active %s)",
                 cm->gang_id, cm->factory_name, cm->gpio_pin,
                 cm->active_level == RELAY_ACTIVE_LOW ? "LOW" : "HIGH");
    }

    xSemaphoreGive(s_relay_mutex);
    return 0;
}

const esp_device_manifest_t* relay_get_manifest(void) {
    return s_board_manifest;
}

static void apply_hardware_gpio(const idf_relay_channel_t *ch, relay_state_t state) {
    uint32_t level;
    if (ch->manifest.active_level == RELAY_ACTIVE_LOW) {
        level = (state == RELAY_STATE_ON) ? 0 : 1;
    } else {
        level = (state == RELAY_STATE_ON) ? 1 : 0;
    }
    gpio_set_level((gpio_num_t)ch->manifest.gpio_pin, level);
}

static void pulse_timer_callback(void *arg) {
    uint8_t gang_id = (uint8_t)(uintptr_t)arg;
    ESP_LOGD(TAG, "Pulse timeout reached for Gang %d. Turning OFF.", gang_id);
    relay_off(gang_id);
}

int relay_on(uint8_t gang_id) {
    if (gang_id < 1 || gang_id > s_active_gang_count) return -1;
    uint8_t idx = gang_id - 1;

    xSemaphoreTake(s_relay_mutex, portMAX_DELAY);
    idf_relay_channel_t *ch = &s_relays[idx];

    if (!ch->is_initialized) {
        xSemaphoreGive(s_relay_mutex);
        return -2;
    }

    if (ch->current_state != RELAY_STATE_ON) {
        ch->current_state = RELAY_STATE_ON;
        ch->cycle_count++;
        apply_hardware_gpio(ch, RELAY_STATE_ON);
        ESP_LOGI(TAG, "Gang %d -> ON (Cycles: %lu)", gang_id, ch->cycle_count);

        if (s_state_cb) {
            s_state_cb(gang_id, RELAY_STATE_ON, s_state_cb_ctx);
        }
    }

    if (ch->manifest.allowed_mode == RELAY_MODE_PULSE && ch->manifest.pulse_duration_ms > 0) {
        esp_timer_stop(ch->pulse_timer);
        esp_timer_start_once(ch->pulse_timer, (uint64_t)ch->manifest.pulse_duration_ms * 1000ULL);
    }

    xSemaphoreGive(s_relay_mutex);
    return 0;
}

int relay_off(uint8_t gang_id) {
    if (gang_id < 1 || gang_id > s_active_gang_count) return -1;
    uint8_t idx = gang_id - 1;

    xSemaphoreTake(s_relay_mutex, portMAX_DELAY);
    idf_relay_channel_t *ch = &s_relays[idx];

    if (!ch->is_initialized) {
        xSemaphoreGive(s_relay_mutex);
        return -2;
    }

    if (ch->current_state != RELAY_STATE_OFF) {
        ch->current_state = RELAY_STATE_OFF;
        apply_hardware_gpio(ch, RELAY_STATE_OFF);
        ESP_LOGI(TAG, "Gang %d -> OFF", gang_id);

        if (s_state_cb) {
            s_state_cb(gang_id, RELAY_STATE_OFF, s_state_cb_ctx);
        }
    }

    if (ch->pulse_timer) {
        esp_timer_stop(ch->pulse_timer);
    }

    xSemaphoreGive(s_relay_mutex);
    return 0;
}

int relay_toggle(uint8_t gang_id) {
    int current = relay_get_state(gang_id);
    if (current < 0) return current;
    return (current == RELAY_STATE_ON) ? relay_off(gang_id) : relay_on(gang_id);
}

int relay_pulse(uint8_t gang_id, uint32_t duration_ms) {
    if (gang_id < 1 || gang_id > s_active_gang_count) return -1;
    uint8_t idx = gang_id - 1;

    xSemaphoreTake(s_relay_mutex, portMAX_DELAY);
    s_relays[idx].manifest.pulse_duration_ms = duration_ms;
    s_relays[idx].manifest.allowed_mode = RELAY_MODE_PULSE;
    xSemaphoreGive(s_relay_mutex);

    return relay_on(gang_id);
}

int relay_get_state(uint8_t gang_id) {
    if (gang_id < 1 || gang_id > s_active_gang_count) return -1;
    return s_relays[gang_id - 1].current_state;
}

int relay_set_all(relay_state_t state) {
    for (uint8_t g = 1; g <= s_active_gang_count; g++) {
        if (state == RELAY_STATE_ON) relay_on(g);
        else relay_off(g);
    }
    return 0;
}

void relay_register_callback(relay_state_change_cb_t cb, void *user_ctx) {
    s_state_cb = cb;
    s_state_cb_ctx = user_ctx;
}

uint32_t relay_get_cycle_count(uint8_t gang_id) {
    if (gang_id < 1 || gang_id > s_active_gang_count) return 0;
    return s_relays[gang_id - 1].cycle_count;
}

int relay_export_manifest_json(char *buffer, size_t max_len) {
    if (!s_board_manifest || !buffer || max_len < 128) return -1;
    
    int written = snprintf(buffer, max_len,
        "{\"serial_no\":\"%s\",\"model_id\":\"%s\",\"hw_rev\":\"%s\",\"gang_count\":%d,\"channels\":[",
        s_board_manifest->serial_no, s_board_manifest->model_id,
        s_board_manifest->hardware_rev, s_board_manifest->hardware_gang_count);
    
    for (int i = 0; i < s_board_manifest->hardware_gang_count; i++) {
        const esp_channel_manifest_t *c = &s_board_manifest->channels[i];
        int n = snprintf(buffer + written, max_len - written,
            "%s{\"gang_id\":%d,\"name\":\"%s\",\"type\":\"%d\",\"gpio\":%ld,\"state\":%d}",
            (i > 0 ? "," : ""), c->gang_id, c->factory_name, c->load_type, c->gpio_pin, relay_get_state(c->gang_id));
        if (n < 0 || written + n >= max_len) return -2;
        written += n;
    }
    
    int end = snprintf(buffer + written, max_len - written, "]}");
    return (end > 0) ? (written + end) : -2;
}
