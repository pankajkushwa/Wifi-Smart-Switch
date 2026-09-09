/**
 * @file device_config.c
 * @brief ESP32-S3 Hardware Profile Implementations
 */

#include "device_config.h"

/* Profile 1: 4-Gang Touch Switch (Living Room / Master Controller DEV001) */
static const esp_channel_manifest_t s_channels_4gang[4] = {
    { .gang_id = 1, .gpio_pin = 4, .load_type = LOAD_TYPE_CHANDELIER, .factory_name = "Main Chandelier",   .active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0, .is_factory_locked = true },
    { .gang_id = 2, .gpio_pin = 5, .load_type = LOAD_TYPE_FAN,        .factory_name = "Ceiling Fan",       .active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0, .is_factory_locked = true },
    { .gang_id = 3, .gpio_pin = 6, .load_type = LOAD_TYPE_LIGHT,      .factory_name = "Ambient Downlights",.active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0, .is_factory_locked = true },
    { .gang_id = 4, .gpio_pin = 7, .load_type = LOAD_TYPE_LIGHT,      .factory_name = "Balcony Strip Light",.active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0, .is_factory_locked = true }
};

static const esp_device_manifest_t s_device_4gang = {
    .serial_no = "SN:ESP32S3-4G-2026-X883B",
    .model_id = "LUMIERE-S3-4G-TOUCH",
    .hardware_rev = "v2.4-SMD",
    .hardware_gang_count = 4,
    .channels = s_channels_4gang
};

/* Profile 2: 2-Gang Touch Switch (Bedroom / Secondary Node DEV002) */
static const esp_channel_manifest_t s_channels_2gang[2] = {
    { .gang_id = 1, .gpio_pin = 4, .load_type = LOAD_TYPE_LIGHT,      .factory_name = "Bedside Reading Lamp", .active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0, .is_factory_locked = true },
    { .gang_id = 2, .gpio_pin = 5, .load_type = LOAD_TYPE_FAN,        .factory_name = "Quiet Night Fan",      .active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0, .is_factory_locked = true }
};

static const esp_device_manifest_t s_device_2gang = {
    .serial_no = "SN:ESP32S3-2G-2026-Y412A",
    .model_id = "LUMIERE-S3-2G-TOUCH",
    .hardware_rev = "v2.4-SMD",
    .hardware_gang_count = 2,
    .channels = s_channels_2gang
};

const esp_device_manifest_t* device_config_get_profile_4gang(void) {
    return &s_device_4gang;
}

const esp_device_manifest_t* device_config_get_profile_2gang(void) {
    return &s_device_2gang;
}

const esp_device_manifest_t* device_config_get_active_profile(void) {
#if defined(CONFIG_DEVICE_PROFILE_2GANG)
    return &s_device_2gang;
#else
    return &s_device_4gang;
#endif
}
