/**
 * @file wifi_mqtt.h
 * @brief Wi-Fi Connection & MQTT Client Handler for ESP-IDF
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef void (*mqtt_command_handler_t)(const char *topic, const char *payload, size_t len);

esp_err_t wifi_mqtt_init(const char *ssid, const char *password, const char *broker_uri);
esp_err_t wifi_mqtt_publish_state(uint8_t gang_id, bool is_on);
esp_err_t wifi_mqtt_publish_telemetry(void);
void wifi_mqtt_register_cmd_handler(mqtt_command_handler_t handler);
bool wifi_mqtt_is_connected(void);

#ifdef __cplusplus
}
#endif
