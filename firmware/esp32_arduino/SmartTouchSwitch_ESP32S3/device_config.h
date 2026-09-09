/**
 * @file device_config.h
 * @brief ESP32-S3 Hardware Profile Definitions for Arduino Core
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

#define MAX_GANGS 16

typedef enum {
    LOAD_LIGHT = 0,
    LOAD_FAN,
    LOAD_CHANDELIER,
    LOAD_SOCKET,
    LOAD_AC,
    LOAD_HEATER
} load_type_t;

typedef struct {
    uint8_t gang_id;
    int gpio_pin;
    load_type_t load_type;
    char name[32];
    bool active_high;
} channel_profile_t;

typedef struct {
    char serial_no[36];
    char model_id[32];
    uint8_t gang_count;
    const channel_profile_t *channels;
} switch_device_profile_t;

const switch_device_profile_t* get_device_profile_4gang(void);
const switch_device_profile_t* get_device_profile_2gang(void);
const switch_device_profile_t* get_active_device_profile(void);

#ifdef __cplusplus
}
#endif
