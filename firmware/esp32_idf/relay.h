/**
 * @file relay.h
 * @brief Thread-Safe Relay Subsystem Driver for ESP-IDF
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>
#include "esp_err.h"
#include "device_config.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    RELAY_STATE_OFF = 0,
    RELAY_STATE_ON  = 1
} relay_state_t;

typedef void (*relay_callback_t)(uint8_t gang_id, relay_state_t new_state, void *user_ctx);

esp_err_t relay_init(const esp_device_manifest_t *manifest);
esp_err_t relay_set_state(uint8_t gang_id, relay_state_t state);
relay_state_t relay_get_state(uint8_t gang_id);
esp_err_t relay_toggle(uint8_t gang_id);
esp_err_t relay_set_all(relay_state_t state);
uint32_t relay_get_cycle_count(uint8_t gang_id);
void relay_register_callback(relay_callback_t cb, void *user_ctx);

#ifdef __cplusplus
}
#endif
