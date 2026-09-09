/**
 * @file device_config.c
 * @brief ESP32-S3 Hardware Profile Implementations for Arduino Core
 */

#include "device_config.h"

static const channel_profile_t s_channels_4g[4] = {
    { .gang_id = 1, .gpio_pin = 4, .load_type = LOAD_CHANDELIER, .name = "Main Chandelier",   .active_high = true },
    { .gang_id = 2, .gpio_pin = 5, .load_type = LOAD_FAN,        .name = "Ceiling Fan",       .active_high = true },
    { .gang_id = 3, .gpio_pin = 6, .load_type = LOAD_LIGHT,      .name = "Ambient Downlights",.active_high = true },
    { .gang_id = 4, .gpio_pin = 7, .load_type = LOAD_LIGHT,      .name = "Balcony Strip Light",.active_high = true }
};

static const switch_device_profile_t s_profile_4g = {
    .serial_no = "SN:ESP32S3-4G-2026-X883B",
    .model_id = "LUMIERE-S3-4G-TOUCH",
    .gang_count = 4,
    .channels = s_channels_4g
};

static const channel_profile_t s_channels_2g[2] = {
    { .gang_id = 1, .gpio_pin = 4, .load_type = LOAD_LIGHT,      .name = "Bedside Lamp", .active_high = true },
    { .gang_id = 2, .gpio_pin = 5, .load_type = LOAD_FAN,        .name = "Bedroom Fan",  .active_high = true }
};

static const switch_device_profile_t s_profile_2g = {
    .serial_no = "SN:ESP32S3-2G-2026-Y412A",
    .model_id = "LUMIERE-S3-2G-TOUCH",
    .gang_count = 2,
    .channels = s_channels_2g
};

const switch_device_profile_t* get_device_profile_4gang(void) {
    return &s_profile_4g;
}

const switch_device_profile_t* get_device_profile_2gang(void) {
    return &s_profile_2g;
}

const switch_device_profile_t* get_active_device_profile(void) {
#if defined(PROFILE_2GANG)
    return &s_profile_2g;
#else
    return &s_profile_4g;
#endif
}
