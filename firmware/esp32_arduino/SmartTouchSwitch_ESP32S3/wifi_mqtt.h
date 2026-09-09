/**
 * @file wifi_mqtt.h
 * @brief Wi-Fi & MQTT Client Module Header for Arduino ESP32
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef void (*arduino_mqtt_cb_t)(const char *topic, const char *payload);

void arduino_network_init(const char *ssid, const char *pass, const char *mqtt_broker);
void arduino_network_loop(void);
bool arduino_network_publish(const char *topic, const char *payload);
void arduino_network_register_cb(arduino_mqtt_cb_t cb);

#ifdef __cplusplus
}
#endif
