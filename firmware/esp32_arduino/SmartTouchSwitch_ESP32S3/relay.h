/**
 * @file relay.h
 * @brief Relay Driver Header for Arduino ESP32
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>
#include "device_config.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef void (*arduino_relay_cb_t)(uint8_t gang_id, bool is_on);

bool arduino_relay_init(const switch_device_profile_t *profile);
bool arduino_relay_set(uint8_t gang_id, bool is_on);
bool arduino_relay_get(uint8_t gang_id);
bool arduino_relay_toggle(uint8_t gang_id);
void arduino_relay_set_all(bool is_on);
void arduino_relay_register_cb(arduino_relay_cb_t cb);

#ifdef __cplusplus
}
#endif
