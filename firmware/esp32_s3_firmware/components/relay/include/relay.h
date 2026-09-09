/**
 * @file relay.h
 * @brief Thread-safe Relay Subsystem & Static Hardware Manifest for ESP32-S3 Commercial Smart Switch
 * @architecture Layered Hardware Abstraction Layer (HAL) with FreeRTOS Synchronization
 * @authority ESP32-Authoritative: Gang count, Serial Number, Load Type, and Switch Names are burned
 *            into firmware/factory NVS and CANNOT be modified by client applications.
 * @copyright Commercial Smart Switch Ecosystem
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

/* Compile-time Gang Configuration (Decided on ESP32-side: 1, 2, 4, 6, 8, or 16) */
#ifndef CONFIG_SWITCH_GANG_COUNT
#define CONFIG_SWITCH_GANG_COUNT  4   /* Compile-time physical board profile: 1, 2, 4, 6, 8, 16 */
#endif

#define RELAY_MAX_GANGS           16
#define RELAY_ALL_GANGS           0xFF

/* Relay Operation Modes */
typedef enum {
    RELAY_MODE_LATCHING = 0,   /**< Persistent ON/OFF state */
    RELAY_MODE_MOMENTARY,      /**< Active only while trigger held */
    RELAY_MODE_PULSE          /**< Turn ON, auto-off after pulse_ms duration */
} relay_mode_t;

/* Active Level (Relay board coil driver polarity) */
typedef enum {
    RELAY_ACTIVE_LOW  = 0,     /**< Optocoupler relay modules (0V = Coil Energized) */
    RELAY_ACTIVE_HIGH = 1      /**< NPN/MOSFET driven coil (3.3V = Coil Energized) */
} relay_active_level_t;

/* Physical Load Types (Hardware-fixed: Switch, Fan, Socket, Chandelier, etc.) */
typedef enum {
    LOAD_TYPE_LIGHT = 0,
    LOAD_TYPE_FAN,
    LOAD_TYPE_CHANDELIER,
    LOAD_TYPE_SOCKET,
    LOAD_TYPE_AC,
    LOAD_TYPE_HEATER
} esp_load_type_t;

/* Relay State */
typedef enum {
    RELAY_STATE_OFF = 0,
    RELAY_STATE_ON  = 1
} relay_state_t;

/* =========================================================================
 * STATIC HARDWARE MANIFEST (Burned in ESP32 Flash / eFuse / Factory NVS)
 * Client applications (Mobile/Web) are strictly read-only for these fields.
 * ========================================================================= */
typedef struct {
    uint8_t gang_id;                 /**< 1-indexed (1 .. CONFIG_SWITCH_GANG_COUNT) */
    int32_t gpio_pin;                /**< ESP32-S3 Physical GPIO Pin */
    esp_load_type_t load_type;       /**< STATIC: Fan, Light, Socket, etc. (Non-editable from app) */
    const char factory_name[28];     /**< STATIC: Factory channel label (Non-editable from app) */
    relay_active_level_t active_level;
    relay_mode_t allowed_mode;
    uint32_t pulse_duration_ms;     /**< Used when mode == RELAY_MODE_PULSE */
    bool is_factory_locked;          /**< TRUE: Reject all remote rename / retype attempts */
} esp_channel_manifest_t;

typedef struct {
    const char serial_no[32];        /**< STATIC: Unique eFuse/NVS burned Serial (Non-editable) */
    const char model_id[28];         /**< STATIC: Hardware Model (e.g. LUMIERE-S3-4G-TOUCH) */
    const char hardware_rev[12];     /**< STATIC: PCB Rev e.g. "v2.4-SMD" */
    uint8_t hardware_gang_count;     /**< STATIC: Physical Gang Count (Fixed on ESP side) */
    const esp_channel_manifest_t *channels;
} esp_device_manifest_t;

/* Per-Gang Runtime Configuration */
typedef struct {
    uint8_t gang_id;
    int32_t gpio_pin;
    relay_active_level_t active_level;
    relay_mode_t mode;
    uint32_t pulse_duration_ms;
    bool restore_last_state;
    relay_state_t default_state;
} relay_config_t;

/* State Change Event Callback Type */
typedef void (*relay_state_change_cb_t)(uint8_t gang_id, relay_state_t new_state, void *user_ctx);

/**
 * @brief Initialize the Relay Subsystem using the static ESP32 hardware manifest.
 */
int relay_subsystem_init(const esp_device_manifest_t *manifest);

/**
 * @brief Retrieve the immutable hardware manifest of this ESP32 board.
 */
const esp_device_manifest_t* relay_get_manifest(void);

/**
 * @brief Serialize static hardware manifest to JSON for MQTT discovery.
 * Published to: "device/{serial_no}/manifest" with retain=true
 */
int relay_export_manifest_json(char *buffer, size_t max_len);

/**
 * @brief Validate incoming client JSON payload.
 * Strictly REJECTS any attempt by client apps to modify gang_count, serial_no,
 * load_type, or factory switch names!
 */
int relay_validate_client_command(const char *json_payload);

int relay_on(uint8_t gang_id);
int relay_off(uint8_t gang_id);
int relay_toggle(uint8_t gang_id);
int relay_pulse(uint8_t gang_id, uint32_t duration_ms);
int relay_get_state(uint8_t gang_id);
int relay_set_all(relay_state_t state);
void relay_register_callback(relay_state_change_cb_t cb, void *user_ctx);
uint32_t relay_get_cycle_count(uint8_t gang_id);

#ifdef __cplusplus
}

class RelayController {
public:
    inline int init(const esp_device_manifest_t *manifest) {
        return relay_subsystem_init(manifest);
    }
    inline const esp_device_manifest_t* getManifest() const {
        return relay_get_manifest();
    }
    inline int exportManifest(char *buf, size_t len) {
        return relay_export_manifest_json(buf, len);
    }
    inline int on(uint8_t gang_id) {
        return relay_on(gang_id);
    }
    inline int off(uint8_t gang_id) {
        return relay_off(gang_id);
    }
    inline int toggle(uint8_t gang_id) {
        return relay_toggle(gang_id);
    }
    inline int pulse(uint8_t gang_id, uint32_t duration_ms) {
        return relay_pulse(gang_id, duration_ms);
    }
    inline int getState(uint8_t gang_id) {
        return relay_get_state(gang_id);
    }
    inline int setAll(relay_state_t state) {
        return relay_set_all(state);
    }
    inline void setCallback(relay_state_change_cb_t cb, void *user_ctx = nullptr) {
        relay_register_callback(cb, user_ctx);
    }
    inline uint32_t getCycleCount(uint8_t gang_id) {
        return relay_get_cycle_count(gang_id);
    }
};

extern RelayController relay;
#endif
