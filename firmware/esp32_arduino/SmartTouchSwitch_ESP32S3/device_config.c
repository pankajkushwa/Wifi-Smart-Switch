/**
 * @file device_config.c
 * @brief ESP32-S3 Hardware Profile Implementations for Arduino Core
 *
 * Configurable Single-Device Architecture:
 * 1 physical device can be set as any 1 gang: 1, 2, 3, 4, 6, 8, 12, 16, etc.
 */

#include "device_config.h"
#include <stdio.h>
#include <string.h>

/* Master channel definition table for up to 16 hardware gangs on ESP32-S3 */
static const channel_profile_t s_master_channels[MAX_GANGS] = {
    { .gang_id = 1,  .gpio_pin = 4,  .load_type = LOAD_CHANDELIER, .name = "Main Chandelier",     .active_high = true },
    { .gang_id = 2,  .gpio_pin = 5,  .load_type = LOAD_FAN,        .name = "Ceiling Fan",         .active_high = true },
    { .gang_id = 3,  .gpio_pin = 6,  .load_type = LOAD_LIGHT,      .name = "Ambient Downlights",  .active_high = true },
    { .gang_id = 4,  .gpio_pin = 7,  .load_type = LOAD_LIGHT,      .name = "Balcony Accent Light",.active_high = true },
    { .gang_id = 5,  .gpio_pin = 8,  .load_type = LOAD_SOCKET,     .name = "Media Console Socket",.active_high = true },
    { .gang_id = 6,  .gpio_pin = 9,  .load_type = LOAD_FAN,        .name = "Exhaust Booster",     .active_high = true },
    { .gang_id = 7,  .gpio_pin = 10, .load_type = LOAD_AC,         .name = "Air Conditioner",     .active_high = true },
    { .gang_id = 8,  .gpio_pin = 11, .load_type = LOAD_HEATER,     .name = "Water Geyser",        .active_high = true },
    { .gang_id = 9,  .gpio_pin = 12, .load_type = LOAD_LIGHT,      .name = "Auxiliary Light 9",   .active_high = true },
    { .gang_id = 10, .gpio_pin = 13, .load_type = LOAD_LIGHT,      .name = "Terrace Spotlight",   .active_high = true },
    { .gang_id = 11, .gpio_pin = 14, .load_type = LOAD_LIGHT,      .name = "Cove LED Driver",     .active_high = true },
    { .gang_id = 12, .gpio_pin = 15, .load_type = LOAD_SOCKET,     .name = "Garden Valve Socket", .active_high = true },
    { .gang_id = 13, .gpio_pin = 16, .load_type = LOAD_SOCKET,     .name = "Gate Solenoid",       .active_high = true },
    { .gang_id = 14, .gpio_pin = 17, .load_type = LOAD_LIGHT,      .name = "Security Floodlight", .active_high = true },
    { .gang_id = 15, .gpio_pin = 18, .load_type = LOAD_LIGHT,      .name = "Night Pathway Light", .active_high = true },
    { .gang_id = 16, .gpio_pin = 21, .load_type = LOAD_FAN,        .name = "Master Exhaust Fan",  .active_high = true },
};

/* Single active device manifest instance */
static switch_device_profile_t s_device_profile;
static channel_profile_t s_active_channels[MAX_GANGS];
static bool s_is_init = false;

bool set_device_gang_count(uint8_t gang_count) {
    if (gang_count < 1 || gang_count > MAX_GANGS) {
        return false;
    }

    s_device_profile.gang_count = gang_count;
    snprintf(s_device_profile.model_id, sizeof(s_device_profile.model_id), "LUMIERE-S3-%dG-TOUCH", gang_count);
    snprintf(s_device_profile.serial_no, sizeof(s_device_profile.serial_no), "SN:ESP32S3-%dG-2026-X%04X", gang_count, gang_count * 1111);

    for (uint8_t i = 0; i < gang_count; i++) {
        s_active_channels[i] = s_master_channels[i];
    }
    s_device_profile.channels = s_active_channels;
    s_is_init = true;
    return true;
}

static void ensure_init(void) {
    if (!s_is_init) {
        set_device_gang_count(CONFIG_DEVICE_GANG_COUNT);
    }
}

uint8_t get_device_gang_count(void) {
    ensure_init();
    return s_device_profile.gang_count;
}

const switch_device_profile_t* get_active_device_profile(void) {
    ensure_init();
    return &s_device_profile;
}

const switch_device_profile_t* get_device_profile(uint8_t gang_count) {
    set_device_gang_count(gang_count);
    return &s_device_profile;
}

const switch_device_profile_t* get_device_profile_4gang(void) {
    return get_device_profile(4);
}

const switch_device_profile_t* get_device_profile_2gang(void) {
    return get_device_profile(2);
}
