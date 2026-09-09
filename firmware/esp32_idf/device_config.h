/**
 * @file device_config.h
 * @brief ESP32-S3 Hardware Profile & Device Configuration Definitions
 * Target: ESP32-S3-WROOM-1-N8R8
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

#define MAX_GANG_CHANNELS 16

typedef enum {
    LOAD_TYPE_LIGHT = 0,
    LOAD_TYPE_FAN,
    LOAD_TYPE_CHANDELIER,
    LOAD_TYPE_SOCKET,
    LOAD_TYPE_AC,
    LOAD_TYPE_HEATER
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

/* Device Profiles */
const esp_device_manifest_t* device_config_get_profile_4gang(void);
const esp_device_manifest_t* device_config_get_profile_2gang(void);
const esp_device_manifest_t* device_config_get_active_profile(void);

#ifdef __cplusplus
}
#endif
