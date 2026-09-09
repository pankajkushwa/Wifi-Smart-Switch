/**
 * @file main.c
 * @brief ESP32-S3 Smart Touch Switch Application Entry Point (ESP-IDF)
 */

#include "main.h"
#include <stdio.h>
#include <string.h>
#include "esp_log.h"
#include "esp_system.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "device_config.h"
#include "mqtt_config.h"
#include "relay.h"
#include "schedule_sync.h"
#include "wifi_mqtt.h"
#include "nvs_storage.h"

static const char *TAG = "APP_MAIN";
static const esp_device_manifest_t *s_active_manifest = NULL;

static void on_relay_state_changed(uint8_t gang_id, relay_state_t new_state, void *user_ctx) {
    ESP_LOGI(TAG, "EVENT: Gang %d -> %s", gang_id, new_state == RELAY_STATE_ON ? "ON" : "OFF");
    nvs_storage_save_relay_state(gang_id, (uint8_t)new_state);
    wifi_mqtt_publish_state(gang_id, new_state == RELAY_STATE_ON);
}

void app_handle_cloud_command(const char *topic, const char *payload, size_t len) {
    ESP_LOGI(TAG, "Incoming Cloud MQTT Cmd on topic: %s", topic);

    if (strstr(topic, "POWER")) {
        char *ptr = strstr(topic, "POWER");
        int gang = atoi(ptr + 5);
        if (gang >= 1 && gang <= s_active_manifest->hardware_gang_count) {
            if (strcasecmp(payload, "ON") == 0 || strcmp(payload, "1") == 0) {
                relay_set_state(gang, RELAY_STATE_ON);
            } else if (strcasecmp(payload, "OFF") == 0 || strcmp(payload, "0") == 0) {
                relay_set_state(gang, RELAY_STATE_OFF);
            } else if (strcasecmp(payload, "TOGGLE") == 0) {
                relay_toggle(gang);
            }
        }
    } else if (strstr(topic, "SCHEDULE_SYNC")) {
        schedule_sync_process_mqtt_payload(payload, s_active_manifest->serial_no);
    }
}

void app_init_subsystems(void) {
    s_active_manifest = device_config_get_active_profile();

    ESP_LOGI(TAG, "=======================================================");
    ESP_LOGI(TAG, "  ESP32-S3 Commercial Smart Touch Switch Starting...  ");
    ESP_LOGI(TAG, "  Model: %s | Gangs: %d | Serial: %s",
             s_active_manifest->model_id, s_active_manifest->hardware_gang_count, s_active_manifest->serial_no);
    ESP_LOGI(TAG, "  Version: %s", APP_VERSION_STR);
    ESP_LOGI(TAG, "=======================================================");

    /* 1. NVS Flash Storage */
    nvs_storage_init();

    /* 2. Relay Subsystem */
    relay_init(s_active_manifest);
    relay_register_callback(on_relay_state_changed, NULL);

    /* 3. Blackout State Recovery from NVS */
    for (uint8_t g = 1; g <= s_active_manifest->hardware_gang_count; g++) {
        uint8_t saved_state = 0;
        if (nvs_storage_load_relay_state(g, &saved_state) == ESP_OK && saved_state == 1) {
            relay_set_state(g, RELAY_STATE_ON);
        }
    }

    /* 4. Offline Schedule Synchronizer */
    schedule_sync_init();

    /* 5. Wi-Fi & MQTT Networking (Configured via mqtt_config.h) */
    wifi_mqtt_init(CONFIG_WIFI_SSID, CONFIG_WIFI_PASSWORD, CONFIG_MQTT_BROKER_URI);
    wifi_mqtt_register_cmd_handler(app_handle_cloud_command);
}

void app_main(void) {
    app_init_subsystems();

    while (1) {
        vTaskDelay(pdMS_TO_TICKS(APP_HEARTBEAT_INTERVAL_MS));
        ESP_LOGI(TAG, "Heartbeat | Free Heap: %lu bytes | All %d channels operational",
                 esp_get_free_heap_size(), s_active_manifest->hardware_gang_count);
        wifi_mqtt_publish_telemetry();
    }
}
