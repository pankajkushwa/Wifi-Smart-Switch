/**
 * @file main.c
 * @brief Main Application Engine Implementation for Arduino ESP32
 */

#include "main.h"
#include "device_config.h"
#include "relay.h"
#include "schedule_sync.h"
#include "wifi_mqtt.h"
#include "nvs_storage.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

static const switch_device_profile_t *s_prof = NULL;

static void on_relay_changed(uint8_t gang_id, bool is_on) {
    char topic[48];
    char payload[8];
    snprintf(topic, sizeof(topic), "stat/switch/POWER%d", gang_id);
    snprintf(payload, sizeof(payload), "%s", is_on ? "ON" : "OFF");
    arduino_network_publish(topic, payload);
    arduino_nvs_save_state(gang_id, is_on);
}

void arduino_app_setup(void) {
    s_prof = get_active_device_profile();
    arduino_nvs_init();

    arduino_relay_init(s_prof);
    arduino_relay_register_cb(on_relay_changed);

    arduino_schedule_init();
    arduino_network_init("MySSID", "MyPass", "mqtt://broker.hivemq.com:1883");
}

void arduino_app_loop(void) {
    arduino_network_loop();
}

void arduino_app_handle_cmd(const char *cmd_str) {
    if (!cmd_str) return;

    if (cmd_str[0] >= '1' && cmd_str[0] <= '9') {
        uint8_t gang = (uint8_t)(cmd_str[0] - '0');
        arduino_relay_toggle(gang);
    } else if (cmd_str[0] == 'a' || cmd_str[0] == 'A') {
        arduino_relay_set_all(true);
    } else if (cmd_str[0] == 'o' || cmd_str[0] == 'O') {
        arduino_relay_set_all(false);
    }
}
