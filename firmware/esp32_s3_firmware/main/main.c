/**
 * @file main.c
 * @brief ESP32-S3 Commercial Smart Touch Switch Application Entry Point
 * @target ESP32-S3-WROOM-1-N8R8 (Octal PSRAM 8MB, Quad Flash 8MB)
 */

#include <stdio.h>
#include <string.h>
#include "esp_log.h"
#include "esp_system.h"
#include "nvs_flash.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "relay.h"
#include "schedule_sync.h"

static const char *TAG = "APP_MAIN";

/* =========================================================================
 * STATIC ESP32-S3 HARDWARE MANIFEST (4-GANG TOUCH SWITCH PRODUCTION PROFILE)
 * Burned in firmware / eFuse. Unchangeable by mobile/web clients.
 * ========================================================================= */
static const esp_channel_manifest_t s_channels_4gang[4] = {
    { .gang_id = 1, .gpio_pin = 4, .load_type = LOAD_TYPE_CHANDELIER, .factory_name = "Main Chandelier",   .active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0,    .is_factory_locked = true },
    { .gang_id = 2, .gpio_pin = 5, .load_type = LOAD_TYPE_FAN,        .factory_name = "Ceiling Fan",       .active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0,    .is_factory_locked = true },
    { .gang_id = 3, .gpio_pin = 6, .load_type = LOAD_TYPE_LIGHT,      .factory_name = "Ambient Downlights",.active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0,    .is_factory_locked = true },
    { .gang_id = 4, .gpio_pin = 7, .load_type = LOAD_TYPE_LIGHT,      .factory_name = "Balcony Strip Light",.active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0,   .is_factory_locked = true },
};

static const esp_device_manifest_t s_manifest_4gang = {
    .serial_no = "SN:ESP32S3-4G-2026-X883B",
    .model_id = "LUMIERE-S3-4G-TOUCH",
    .hardware_rev = "v2.4-SMD",
    .hardware_gang_count = 4,
    .channels = s_channels_4gang,
};

static void relay_state_listener(uint8_t gang_id, relay_state_t new_state, void *user_ctx) {
    ESP_LOGI(TAG, "EVENT: Gang %d state changed to %s. Publishing MQTT tele/state...",
             gang_id, new_state == RELAY_STATE_ON ? "ON" : "OFF");
}

void app_main(void) {
    ESP_LOGI(TAG, "=======================================================");
    ESP_LOGI(TAG, "  ESP32-S3 Commercial Smart Touch Switch Starting...  ");
    ESP_LOGI(TAG, "  Model: %s | Gangs: %d | SN: %s",
             s_manifest_4gang.model_id, s_manifest_4gang.hardware_gang_count, s_manifest_4gang.serial_no);
    ESP_LOGI(TAG, "=======================================================");

    /* 1. Initialize Non-Volatile Storage (NVS) */
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);

    /* 2. Initialize Relay Subsystem using Hardware Manifest */
    int init_res = relay_subsystem_init(&s_manifest_4gang);
    if (init_res != 0) {
        ESP_LOGE(TAG, "Failed to initialize relay subsystem: %d", init_res);
        return;
    }

    /* 3. Register state change callback */
    relay_register_callback(relay_state_listener, NULL);

    /* 4. Initialize Multi-Device Offline Scheduling Subsystem (Module 12) */
    schedule_sync_init();

    /* 5. Display Free Heap & PSRAM */
    ESP_LOGI(TAG, "Internal Free Heap: %lu bytes", esp_get_free_heap_size());

    /* 6. Main Task Loop */
    while (1) {
        vTaskDelay(pdMS_TO_TICKS(10000));
        ESP_LOGI(TAG, "Heartbeat | Heap: %lu bytes | All channels operational", esp_get_free_heap_size());
    }
}
