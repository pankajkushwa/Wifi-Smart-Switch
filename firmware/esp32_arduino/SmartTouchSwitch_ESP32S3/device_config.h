/**
 * @file device_config.h
 * @brief ESP32-S3 Hardware Profile Definitions for Arduino Core
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

#ifdef __cplusplus
extern "C" {
#endif

#define MAX_GANGS 16

/* Fixed gang count burned when loading code to ESP32 (e.g. 1, 2, 3, 4, 6, 8, 12, 16) */
#ifndef CONFIG_DEVICE_GANG_COUNT
#define CONFIG_DEVICE_GANG_COUNT 4
#endif

typedef enum {
    LOAD_LIGHT = 0,
    LOAD_FAN,
    LOAD_CHANDELIER,
    LOAD_SOCKET,
    LOAD_AC,
    LOAD_HEATER,
    LOAD_DOORBELL,
    LOAD_SWITCH
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

/* Primary Device API */
bool set_device_gang_count(uint8_t gang_count);
uint8_t get_device_gang_count(void);
const switch_device_profile_t* get_active_device_profile(void);

/* Helper / Compatibility functions */
const switch_device_profile_t* get_device_profile(uint8_t gang_count);
const switch_device_profile_t* get_device_profile_4gang(void);
const switch_device_profile_t* get_device_profile_2gang(void);

#ifdef __cplusplus
}
#endif
