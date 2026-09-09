/**
 * @file device_config.h
 * @brief ESP32-S3 Hardware Profile & Device Configuration
 * Target: ESP32-S3-WROOM-1-N8R8
 *
 * ESP32 HARDWARE AUTHORITY ARCHITECTURE:
 * The ESP32 firmware holds sole authority for:
 * 1. Fixed Gang Count (1, 2, 3, 4, 6, 8, 12, 16, etc.)
 *    If 1 switch is implemented, it exposes 1 gang; if 2 switches, it exposes 2 gangs.
 * 2. Model Number (e.g. LUMIERE-S3-4G-TOUCH)
 * 3. Serial Number (e.g. SN:ESP32S3-4G-2026-X883B)
 * 4. Peripherals: Any switch channel can be assigned any peripheral:
 *    Switch/Light, Fan, Door Bell, Socket, Heater, Chandelier, AC.
 *
 * The mobile application NEVER decides the gang count. It reads whatever
 * the ESP32 broadcasts on boot/discovery.
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

#define MAX_GANG_CHANNELS 16

/* Fixed gang count burned when loading code to ESP32 (e.g. 1, 2, 3, 4, 6, 8, 12, 16) */
#ifndef CONFIG_DEVICE_GANG_COUNT
#define CONFIG_DEVICE_GANG_COUNT 4
#endif

typedef enum {
    LOAD_TYPE_LIGHT = 0,
    LOAD_TYPE_FAN,
    LOAD_TYPE_CHANDELIER,
    LOAD_TYPE_SOCKET,
    LOAD_TYPE_AC,
    LOAD_TYPE_HEATER,
    LOAD_TYPE_DOORBELL,
    LOAD_TYPE_SWITCH
} esp_load_type_t;

typedef enum {
    RELAY_ACTIVE_LOW = 0,
    RELAY_ACTIVE_HIGH = 1
} relay_active_level_t;

typedef enum {
    RELAY_MODE_LATCHING = 0,
    RELAY_MODE_MOMENTARY,
    RELAY_MODE_PULSE
} relay_mode_t;

typedef struct {
    uint8_t gang_id;
    int32_t gpio_pin;
    esp_load_type_t load_type;
    char factory_name[32];
    relay_active_level_t active_level;
    relay_mode_t allowed_mode;
    uint32_t pulse_duration_ms;
    bool is_factory_locked;
} esp_channel_manifest_t;

typedef struct {
    char serial_no[36];
    char model_id[32];
    char hardware_rev[16];
    uint8_t hardware_gang_count;
    const esp_channel_manifest_t *channels;
} esp_device_manifest_t;

/* Primary Device API */
esp_err_t device_config_init(void);
esp_err_t device_config_set_gang_count(uint8_t gang_count);
uint8_t device_config_get_gang_count(void);
const esp_device_manifest_t* device_config_get_active_profile(void);

/* Helper / Compatibility functions */
const esp_device_manifest_t* device_config_get_profile(uint8_t gang_count);
const esp_device_manifest_t* device_config_get_profile_4gang(void);
const esp_device_manifest_t* device_config_get_profile_2gang(void);

#ifdef __cplusplus
}
#endif
