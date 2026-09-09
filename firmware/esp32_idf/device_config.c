/**
 * @file device_config.c
 * @brief ESP32-S3 Hardware Profile Implementations
 *
 * Configurable Single-Device Architecture:
 * 1 physical device can be set as any 1 gang: 1, 2, 3, 4, 6, 8, 12, 16, etc.
 */

#include "device_config.h"
#include <stdio.h>
#include <string.h>
#include "esp_log.h"

static const char *TAG = "DEVICE_CFG";

/* Master channel definition table for up to 16 hardware gangs on ESP32-S3 */
static const esp_channel_manifest_t s_master_channel_table[MAX_GANG_CHANNELS] = {
    { .gang_id = 1,  .gpio_pin = 4,  .load_type = LOAD_TYPE_CHANDELIER, .factory_name = "Main Chandelier",     .active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0,    .is_factory_locked = true },
    { .gang_id = 2,  .gpio_pin = 5,  .load_type = LOAD_TYPE_FAN,        .factory_name = "Ceiling Fan",         .active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0,    .is_factory_locked = true },
    { .gang_id = 3,  .gpio_pin = 6,  .load_type = LOAD_TYPE_DOORBELL,   .factory_name = "Front Door Bell",     .active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_PULSE,    .pulse_duration_ms = 500,  .is_factory_locked = true },
    { .gang_id = 4,  .gpio_pin = 7,  .load_type = LOAD_TYPE_LIGHT,      .factory_name = "Balcony Accent Light",.active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0,    .is_factory_locked = true },
    { .gang_id = 5,  .gpio_pin = 8,  .load_type = LOAD_TYPE_SOCKET,     .factory_name = "Media Console Socket",.active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0,    .is_factory_locked = true },
    { .gang_id = 6,  .gpio_pin = 9,  .load_type = LOAD_TYPE_FAN,        .factory_name = "Exhaust Booster",     .active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0,    .is_factory_locked = true },
    { .gang_id = 7,  .gpio_pin = 10, .load_type = LOAD_TYPE_AC,         .factory_name = "Air Conditioner",     .active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0,    .is_factory_locked = true },
    { .gang_id = 8,  .gpio_pin = 11, .load_type = LOAD_TYPE_HEATER,     .factory_name = "Water Geyser",        .active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0,    .is_factory_locked = true },
    { .gang_id = 9,  .gpio_pin = 12, .load_type = LOAD_TYPE_LIGHT,      .factory_name = "Auxiliary Light 9",   .active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0,    .is_factory_locked = true },
    { .gang_id = 10, .gpio_pin = 13, .load_type = LOAD_TYPE_LIGHT,      .factory_name = "Terrace Spotlight",   .active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0,    .is_factory_locked = true },
    { .gang_id = 11, .gpio_pin = 14, .load_type = LOAD_TYPE_LIGHT,      .factory_name = "Cove LED Driver",     .active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0,    .is_factory_locked = true },
    { .gang_id = 12, .gpio_pin = 15, .load_type = LOAD_TYPE_SOCKET,     .factory_name = "Garden Valve Socket", .active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_PULSE,    .pulse_duration_ms = 3000, .is_factory_locked = true },
    { .gang_id = 13, .gpio_pin = 16, .load_type = LOAD_TYPE_SOCKET,     .factory_name = "Gate Solenoid",       .active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_PULSE,    .pulse_duration_ms = 500,  .is_factory_locked = true },
    { .gang_id = 14, .gpio_pin = 17, .load_type = LOAD_TYPE_LIGHT,      .factory_name = "Security Floodlight", .active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0,    .is_factory_locked = true },
    { .gang_id = 15, .gpio_pin = 18, .load_type = LOAD_TYPE_LIGHT,      .factory_name = "Night Pathway Light", .active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0,    .is_factory_locked = true },
    { .gang_id = 16, .gpio_pin = 21, .load_type = LOAD_TYPE_FAN,        .factory_name = "Master Exhaust Fan",  .active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0,    .is_factory_locked = true },
};

/* Single active device manifest instance */
static esp_device_manifest_t s_active_device;
static esp_channel_manifest_t s_active_channels[MAX_GANG_CHANNELS];
static bool s_is_initialized = false;

esp_err_t device_config_set_gang_count(uint8_t gang_count) {
    if (gang_count < 1 || gang_count > MAX_GANG_CHANNELS) {
        ESP_LOGE(TAG, "Invalid gang count: %d (supported: 1 to %d)", gang_count, MAX_GANG_CHANNELS);
        return ESP_ERR_INVALID_ARG;
    }

    s_active_device.hardware_gang_count = gang_count;
    snprintf(s_active_device.model_id, sizeof(s_active_device.model_id), "LUMIERE-S3-%dG-TOUCH", gang_count);
    snprintf(s_active_device.serial_no, sizeof(s_active_device.serial_no), "SN:ESP32S3-%dG-2026-X%04X", gang_count, gang_count * 1111);
    strncpy(s_active_device.hardware_rev, "v2.4-SMD", sizeof(s_active_device.hardware_rev));

    /* Populate the active channels for this single device */
    for (uint8_t i = 0; i < gang_count; i++) {
        s_active_channels[i] = s_master_channel_table[i];
    }
    s_active_device.channels = s_active_channels;
    s_is_initialized = true;

    ESP_LOGI(TAG, "Device configured as %d-Gang Switch (Model: %s, SN: %s)",
             gang_count, s_active_device.model_id, s_active_device.serial_no);
    return ESP_OK;
}

esp_err_t device_config_init(void) {
    if (!s_is_initialized) {
        return device_config_set_gang_count(CONFIG_DEVICE_GANG_COUNT);
    }
    return ESP_OK;
}

uint8_t device_config_get_gang_count(void) {
    if (!s_is_initialized) {
        device_config_init();
    }
    return s_active_device.hardware_gang_count;
}

const esp_device_manifest_t* device_config_get_active_profile(void) {
    if (!s_is_initialized) {
        device_config_init();
    }
    return &s_active_device;
}

const esp_device_manifest_t* device_config_get_profile(uint8_t gang_count) {
    device_config_set_gang_count(gang_count);
    return &s_active_device;
}

const esp_device_manifest_t* device_config_get_profile_4gang(void) {
    return device_config_get_profile(4);
}

const esp_device_manifest_t* device_config_get_profile_2gang(void) {
    return device_config_get_profile(2);
}
