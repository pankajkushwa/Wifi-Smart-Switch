/**
 * @file wifi_mqtt.c
 * @brief Wi-Fi & MQTT Client Module Implementation for Arduino ESP32
 */

#include "wifi_mqtt.h"
#include <stdio.h>
#include <string.h>

static arduino_mqtt_cb_t s_cb = NULL;

void arduino_network_init(const char *ssid, const char *pass, const char *mqtt_broker) {
    (void)ssid;
    (void)pass;
    (void)mqtt_broker;
}

void arduino_network_loop(void) {
    /* Keepalive and polling loop */
}

bool arduino_network_publish(const char *topic, const char *payload) {
    (void)topic;
    (void)payload;
    return true;
}

void arduino_network_register_cb(arduino_mqtt_cb_t cb) {
    s_cb = cb;
}
