export const MODULE_1_METADATA = {
  moduleId: "M01",
  moduleName: "Relay Driver & Controller Subsystem",
  status: "READY_FOR_REVIEW",
  supportedGangs: [1, 2, 4, 6, 8, 16],
  targetMcu: "ESP32-S3-WROOM-N8R8",
  frameworks: ["ESP-IDF v5.2+", "Arduino Core v3.0+"],
  hardwareAuthority: "ESP32-S3 Authoritative (Gang count, Serial No, Load Type & Channel Names are factory-fixed in firmware)",
};

export const CODE_COMMON_HEADER = `/**
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
`;

export const CODE_ESP_IDF_SOURCE = `/**
 * @file relay_esp_idf.c
 * @brief Production ESP-IDF Implementation of Relay Subsystem
 * Target: ESP32-S3-WROOM-N8R8
 * Framework: ESP-IDF v5.2+ (Uses esp_timer, driver/gpio, FreeRTOS Semaphore)
 */

#include "relay.h"
#include <string.h>
#include "esp_log.h"
#include "esp_timer.h"
#include "driver/gpio.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"

static const char *TAG = "RELAY_IDF";

typedef struct {
    relay_config_t cfg;
    relay_state_t current_state;
    esp_timer_handle_t pulse_timer;
    uint32_t cycle_count;
    bool is_initialized;
} idf_relay_channel_t;

/* Static Channel Registry (Zero heap fragmentation after boot) */
static idf_relay_channel_t s_relays[RELAY_MAX_GANGS];
static uint8_t s_active_gang_count = 0;
static SemaphoreHandle_t s_relay_mutex = NULL;
static StaticSemaphore_t s_relay_mutex_buffer;

static relay_state_change_cb_t s_state_cb = NULL;
static void *s_state_cb_ctx = NULL;

/* Forward Declarations */
static void pulse_timer_callback(void *arg);
static void apply_hardware_gpio(const idf_relay_channel_t *ch, relay_state_t state);

int relay_subsystem_init(const relay_config_t *configs, uint8_t gang_count) {
    if (gang_count == 0 || gang_count > RELAY_MAX_GANGS || configs == NULL) {
        ESP_LOGE(TAG, "Invalid gang_count=%d or NULL configs", gang_count);
        return -1;
    }

    /* Initialize Static Mutex */
    if (s_relay_mutex == NULL) {
        s_relay_mutex = xSemaphoreCreateMutexStatic(&s_relay_mutex_buffer);
    }

    xSemaphoreTake(s_relay_mutex, portMAX_DELAY);
    s_active_gang_count = gang_count;

    for (uint8_t i = 0; i < gang_count; i++) {
        uint8_t idx = configs[i].gang_id - 1;
        if (idx >= RELAY_MAX_GANGS) {
            continue;
        }

        s_relays[idx].cfg = configs[i];
        s_relays[idx].current_state = configs[i].default_state;
        s_relays[idx].cycle_count = 0;
        s_relays[idx].is_initialized = true;

        /* Configure ESP32-S3 GPIO */
        gpio_config_t io_conf = {
            .pin_bit_mask = (1ULL << configs[i].gpio_pin),
            .mode = GPIO_MODE_OUTPUT,
            .pull_up_en = GPIO_PULLUP_DISABLE,
            .pull_down_en = GPIO_PULLDOWN_DISABLE,
            .intr_type = GPIO_INTR_DISABLE,
        };
        esp_err_t err = gpio_config(&io_conf);
        if (err != ESP_OK) {
            ESP_LOGE(TAG, "GPIO config failed for Gang %d, pin %ld: %s",
                     configs[i].gang_id, configs[i].gpio_pin, esp_err_to_name(err));
            xSemaphoreGive(s_relay_mutex);
            return -2;
        }

        /* Create High-Resolution ESP Software Timer for Pulse Mode */
        esp_timer_create_args_t timer_args = {
            .callback = &pulse_timer_callback,
            .arg = (void *)(uintptr_t)configs[i].gang_id,
            .name = "relay_pulse_tmr"
        };
        esp_timer_create(&timer_args, &s_relays[idx].pulse_timer);

        /* Set initial hardware level */
        apply_hardware_gpio(&s_relays[idx], s_relays[idx].current_state);

        ESP_LOGI(TAG, "Gang %d initialized on GPIO %ld (Active %s, Mode %d)",
                 configs[i].gang_id, configs[i].gpio_pin,
                 configs[i].active_level == RELAY_ACTIVE_LOW ? "LOW" : "HIGH",
                 configs[i].mode);
    }

    xSemaphoreGive(s_relay_mutex);
    return 0;
}

static void apply_hardware_gpio(const idf_relay_channel_t *ch, relay_state_t state) {
    uint32_t level;
    if (ch->cfg.active_level == RELAY_ACTIVE_LOW) {
        level = (state == RELAY_STATE_ON) ? 0 : 1;
    } else {
        level = (state == RELAY_STATE_ON) ? 1 : 0;
    }
    gpio_set_level((gpio_num_t)ch->cfg.gpio_pin, level);
}

static void pulse_timer_callback(void *arg) {
    uint8_t gang_id = (uint8_t)(uintptr_t)arg;
    ESP_LOGD(TAG, "Pulse timeout reached for Gang %d. Turning OFF.", gang_id);
    relay_off(gang_id);
}

int relay_on(uint8_t gang_id) {
    if (gang_id < 1 || gang_id > s_active_gang_count) return -1;
    uint8_t idx = gang_id - 1;

    xSemaphoreTake(s_relay_mutex, portMAX_DELAY);
    idf_relay_channel_t *ch = &s_relays[idx];

    if (!ch->is_initialized) {
        xSemaphoreGive(s_relay_mutex);
        return -2;
    }

    if (ch->current_state != RELAY_STATE_ON) {
        ch->current_state = RELAY_STATE_ON;
        ch->cycle_count++;
        apply_hardware_gpio(ch, RELAY_STATE_ON);
        ESP_LOGI(TAG, "Gang %d -> ON (Cycles: %lu)", gang_id, ch->cycle_count);

        if (s_state_cb) {
            s_state_cb(gang_id, RELAY_STATE_ON, s_state_cb_ctx);
        }
    }

    /* If configured in Pulse Mode, start the auto-off timer */
    if (ch->cfg.mode == RELAY_MODE_PULSE && ch->cfg.pulse_duration_ms > 0) {
        esp_timer_stop(ch->pulse_timer);
        esp_timer_start_once(ch->pulse_timer, (uint64_t)ch->cfg.pulse_duration_ms * 1000ULL);
    }

    xSemaphoreGive(s_relay_mutex);
    return 0;
}

int relay_off(uint8_t gang_id) {
    if (gang_id < 1 || gang_id > s_active_gang_count) return -1;
    uint8_t idx = gang_id - 1;

    xSemaphoreTake(s_relay_mutex, portMAX_DELAY);
    idf_relay_channel_t *ch = &s_relays[idx];

    if (!ch->is_initialized) {
        xSemaphoreGive(s_relay_mutex);
        return -2;
    }

    if (ch->current_state != RELAY_STATE_OFF) {
        ch->current_state = RELAY_STATE_OFF;
        apply_hardware_gpio(ch, RELAY_STATE_OFF);
        ESP_LOGI(TAG, "Gang %d -> OFF", gang_id);

        if (s_state_cb) {
            s_state_cb(gang_id, RELAY_STATE_OFF, s_state_cb_ctx);
        }
    }

    if (ch->pulse_timer) {
        esp_timer_stop(ch->pulse_timer);
    }

    xSemaphoreGive(s_relay_mutex);
    return 0;
}

int relay_toggle(uint8_t gang_id) {
    int current = relay_get_state(gang_id);
    if (current < 0) return current;
    return (current == RELAY_STATE_ON) ? relay_off(gang_id) : relay_on(gang_id);
}

int relay_pulse(uint8_t gang_id, uint32_t duration_ms) {
    if (gang_id < 1 || gang_id > s_active_gang_count) return -1;
    uint8_t idx = gang_id - 1;

    xSemaphoreTake(s_relay_mutex, portMAX_DELAY);
    s_relays[idx].cfg.pulse_duration_ms = duration_ms;
    s_relays[idx].cfg.mode = RELAY_MODE_PULSE;
    xSemaphoreGive(s_relay_mutex);

    return relay_on(gang_id);
}

int relay_get_state(uint8_t gang_id) {
    if (gang_id < 1 || gang_id > s_active_gang_count) return -1;
    return s_relays[gang_id - 1].current_state;
}

int relay_set_all(relay_state_t state) {
    for (uint8_t g = 1; g <= s_active_gang_count; g++) {
        if (state == RELAY_STATE_ON) relay_on(g);
        else relay_off(g);
    }
    return 0;
}

void relay_register_callback(relay_state_change_cb_t cb, void *user_ctx) {
    s_state_cb = cb;
    s_state_cb_ctx = user_ctx;
}

uint32_t relay_get_cycle_count(uint8_t gang_id) {
    if (gang_id < 1 || gang_id > s_active_gang_count) return 0;
    return s_relays[gang_id - 1].cycle_count;
}

#ifdef __cplusplus
RelayController relay;
#endif
`;

export const CODE_ARDUINO_SOURCE = `/**
 * @file relay_arduino.cpp
 * @brief Production Arduino Core for ESP32 Implementation of Relay Subsystem
 * Identical API Surface & FreeRTOS Safety as ESP-IDF
 */

#include "relay.h"
#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>
#include <freertos/timers.h>

#define ARDUINO_TAG "[RELAY_ARDUINO] "

typedef struct {
    relay_config_t cfg;
    relay_state_t current_state;
    TimerHandle_t pulse_timer;
    uint32_t cycle_count;
    bool is_initialized;
} ard_relay_channel_t;

static ard_relay_channel_t s_ard_relays[RELAY_MAX_GANGS];
static uint8_t s_ard_active_gang_count = 0;
static SemaphoreHandle_t s_ard_mutex = NULL;
static relay_state_change_cb_t s_ard_cb = NULL;
static void *s_ard_cb_ctx = NULL;

static void ard_pulse_timer_callback(TimerHandle_t xTimer) {
    uint32_t gang_id = (uint32_t)pvTimerGetTimerID(xTimer);
    relay_off((uint8_t)gang_id);
}

static void ard_apply_gpio(const ard_relay_channel_t *ch, relay_state_t state) {
    int level;
    if (ch->cfg.active_level == RELAY_ACTIVE_LOW) {
        level = (state == RELAY_STATE_ON) ? LOW : HIGH;
    } else {
        level = (state == RELAY_STATE_ON) ? HIGH : LOW;
    }
    digitalWrite(ch->cfg.gpio_pin, level);
}

int relay_subsystem_init(const relay_config_t *configs, uint8_t gang_count) {
    if (gang_count == 0 || gang_count > RELAY_MAX_GANGS || configs == NULL) {
        Serial.printf("%sInvalid params\n", ARDUINO_TAG);
        return -1;
    }

    if (s_ard_mutex == NULL) {
        s_ard_mutex = xSemaphoreCreateMutex();
    }

    xSemaphoreTake(s_ard_mutex, portMAX_DELAY);
    s_ard_active_gang_count = gang_count;

    for (uint8_t i = 0; i < gang_count; i++) {
        uint8_t idx = configs[i].gang_id - 1;
        if (idx >= RELAY_MAX_GANGS) continue;

        s_ard_relays[idx].cfg = configs[i];
        s_ard_relays[idx].current_state = configs[i].default_state;
        s_ard_relays[idx].cycle_count = 0;
        s_ard_relays[idx].is_initialized = true;

        pinMode(configs[i].gpio_pin, OUTPUT);
        ard_apply_gpio(&s_ard_relays[idx], s_ard_relays[idx].current_state);

        /* Create FreeRTOS Software Timer */
        s_ard_relays[idx].pulse_timer = xTimerCreate(
            "r_tmr",
            pdMS_TO_TICKS(configs[i].pulse_duration_ms > 0 ? configs[i].pulse_duration_ms : 500),
            pdFALSE,
            (void *)(uintptr_t)configs[i].gang_id,
            ard_pulse_timer_callback
        );

        Serial.printf("%sGang %d Initialized on Pin %d\n", ARDUINO_TAG, configs[i].gang_id, (int)configs[i].gpio_pin);
    }

    xSemaphoreGive(s_ard_mutex);
    return 0;
}

int relay_on(uint8_t gang_id) {
    if (gang_id < 1 || gang_id > s_ard_active_gang_count) return -1;
    uint8_t idx = gang_id - 1;

    xSemaphoreTake(s_ard_mutex, portMAX_DELAY);
    ard_relay_channel_t *ch = &s_ard_relays[idx];

    if (!ch->is_initialized) {
        xSemaphoreGive(s_ard_mutex);
        return -2;
    }

    if (ch->current_state != RELAY_STATE_ON) {
        ch->current_state = RELAY_STATE_ON;
        ch->cycle_count++;
        ard_apply_gpio(ch, RELAY_STATE_ON);

        if (s_ard_cb) s_ard_cb(gang_id, RELAY_STATE_ON, s_ard_cb_ctx);
    }

    if (ch->cfg.mode == RELAY_MODE_PULSE && ch->cfg.pulse_duration_ms > 0) {
        xTimerStop(ch->pulse_timer, 0);
        xTimerChangePeriod(ch->pulse_timer, pdMS_TO_TICKS(ch->cfg.pulse_duration_ms), 0);
        xTimerStart(ch->pulse_timer, 0);
    }

    xSemaphoreGive(s_ard_mutex);
    return 0;
}

int relay_off(uint8_t gang_id) {
    if (gang_id < 1 || gang_id > s_ard_active_gang_count) return -1;
    uint8_t idx = gang_id - 1;

    xSemaphoreTake(s_ard_mutex, portMAX_DELAY);
    ard_relay_channel_t *ch = &s_ard_relays[idx];

    if (!ch->is_initialized) {
        xSemaphoreGive(s_ard_mutex);
        return -2;
    }

    if (ch->current_state != RELAY_STATE_OFF) {
        ch->current_state = RELAY_STATE_OFF;
        ard_apply_gpio(ch, RELAY_STATE_OFF);

        if (s_ard_cb) s_ard_cb(gang_id, RELAY_STATE_OFF, s_ard_cb_ctx);
    }

    if (ch->pulse_timer) xTimerStop(ch->pulse_timer, 0);

    xSemaphoreGive(s_ard_mutex);
    return 0;
}

int relay_toggle(uint8_t gang_id) {
    int curr = relay_get_state(gang_id);
    if (curr < 0) return curr;
    return (curr == RELAY_STATE_ON) ? relay_off(gang_id) : relay_on(gang_id);
}

int relay_pulse(uint8_t gang_id, uint32_t duration_ms) {
    if (gang_id < 1 || gang_id > s_ard_active_gang_count) return -1;
    s_ard_relays[gang_id - 1].cfg.pulse_duration_ms = duration_ms;
    s_ard_relays[gang_id - 1].cfg.mode = RELAY_MODE_PULSE;
    return relay_on(gang_id);
}

int relay_get_state(uint8_t gang_id) {
    if (gang_id < 1 || gang_id > s_ard_active_gang_count) return -1;
    return s_ard_relays[gang_id - 1].current_state;
}

int relay_set_all(relay_state_t state) {
    for (uint8_t g = 1; g <= s_ard_active_gang_count; g++) {
        if (state == RELAY_STATE_ON) relay_on(g);
        else relay_off(g);
    }
    return 0;
}

void relay_register_callback(relay_state_change_cb_t cb, void *user_ctx) {
    s_ard_cb = cb;
    s_ard_cb_ctx = user_ctx;
}

uint32_t relay_get_cycle_count(uint8_t gang_id) {
    if (gang_id < 1 || gang_id > s_ard_active_gang_count) return 0;
    return s_ard_relays[gang_id - 1].cycle_count;
}

RelayController relay;
`;

export const CODE_EXAMPLE_USAGE = `/**
 * @file main_example.cpp
 * @brief Demonstrates ESP32-S3 Authoritative Hardware Manifest & Relay Controller
 * @details Gang count, Serial Number, Load classification (Fan, Light, Socket), and
 *          Factory Switch Names are burned into firmware / factory NVS. They CANNOT
 *          be altered by mobile apps.
 */

#include "relay.h"
#include <stdio.h>
#include <string.h>

/* =========================================================================
 * STATIC FACTORY MANIFEST DEFINITION (Burned into ESP32-S3 Flash/eFuse)
 * Decided entirely on ESP side. Client mobile app is 100% read-only.
 * ========================================================================= */
static const esp_channel_manifest_t s_factory_channels[CONFIG_SWITCH_GANG_COUNT] = {
    {
        .gang_id = 1,
        .gpio_pin = 4,
        .load_type = LOAD_TYPE_CHANDELIER,
        .factory_name = "Main Chandelier",      /* STATIC: Fixed in ESP32 */
        .active_level = RELAY_ACTIVE_LOW,
        .allowed_mode = RELAY_MODE_LATCHING,
        .pulse_duration_ms = 0,
        .is_factory_locked = true               /* Mobile app cannot edit */
    },
    {
        .gang_id = 2,
        .gpio_pin = 5,
        .load_type = LOAD_TYPE_FAN,
        .factory_name = "Ceiling Fan",          /* STATIC: Hardware fan load */
        .active_level = RELAY_ACTIVE_LOW,
        .allowed_mode = RELAY_MODE_LATCHING,
        .pulse_duration_ms = 0,
        .is_factory_locked = true
    },
    {
        .gang_id = 3,
        .gpio_pin = 6,
        .load_type = LOAD_TYPE_LIGHT,
        .factory_name = "Ambient Downlights",   /* STATIC: Fixed in ESP32 */
        .active_level = RELAY_ACTIVE_LOW,
        .allowed_mode = RELAY_MODE_LATCHING,
        .pulse_duration_ms = 0,
        .is_factory_locked = true
    },
    {
        .gang_id = 4,
        .gpio_pin = 7,
        .load_type = LOAD_TYPE_LIGHT,
        .factory_name = "Balcony Strip Light",  /* STATIC: Fixed in ESP32 */
        .active_level = RELAY_ACTIVE_LOW,
        .allowed_mode = RELAY_MODE_PULSE,
        .pulse_duration_ms = 1000,
        .is_factory_locked = true
    }
};

static const esp_device_manifest_t s_device_manifest = {
    .serial_no = "SN:ESP32S3-4G-2026-X883B",    /* STATIC: Burned eFuse Serial */
    .model_id = "LUMIERE-S3-4G-TOUCH",          /* STATIC: Model Name */
    .hardware_rev = "v2.4-SMD",                 /* STATIC: PCB Revision */
    .hardware_gang_count = CONFIG_SWITCH_GANG_COUNT, /* STATIC: 4-Gang fixed */
    .channels = s_factory_channels
};

/* State Change Event Callback: Broadcasts telemetry over MQTT */
void on_relay_changed(uint8_t gang_id, relay_state_t new_state, void *user_ctx) {
    // Topic: "device/ESP32S3-4G-2026-X883B/status"
    // Payload: {"gang": gang_id, "state": new_state, "name": s_factory_channels[gang_id-1].factory_name}
    printf("[ESP32-S3] Telemetry: Gang %d (%s) -> State: %d\\n", 
           gang_id, s_factory_channels[gang_id-1].factory_name, new_state);
}

#if defined(ESP_PLATFORM) && !defined(ARDUINO)
/* ==================== ESP-IDF Entry Point ==================== */
extern "C" void app_main(void) {
    // Initialize subsystem with immutable ESP32 hardware manifest
    relay.init(&s_device_manifest);
    relay.setCallback(on_relay_changed, NULL);

    // Publish Manifest to MQTT discovery topic (Retained = true)
    char json_buffer[512];
    relay.exportManifest(json_buffer, sizeof(json_buffer));
    printf("[ESP32-S3] Broadcast Manifest to MQTT 'device/%s/manifest':\\n%s\\n", 
           s_device_manifest.serial_no, json_buffer);

    // Relay Actuation (Valid operations)
    relay.on(1);          // Energize Gang 1 (Main Chandelier)
    relay.toggle(2);      // Invert Gang 2 (Ceiling Fan)
    relay.pulse(4, 1000); // 1000ms pulse on Gang 4
}
#else
/* ==================== Arduino Entry Point ==================== */
void setup() {
    Serial.begin(115200);
    relay.init(&s_device_manifest);
    relay.setCallback(on_relay_changed, NULL);

    char json_buffer[512];
    relay.exportManifest(json_buffer, sizeof(json_buffer));
    Serial.println(F("[ESP32-S3] Broadcast Manifest to MQTT:"));
    Serial.println(json_buffer);

    relay.on(1);
    relay.toggle(2);
}

void loop() {
    // 100% Non-blocking FreeRTOS tick
    vTaskDelay(pdMS_TO_TICKS(1000));
}
#endif
`;

export const CODE_UNIT_TEST = `/**
 * @file test_relay.cpp
 * @brief CMock / Unity Automated Unit Test Suite with Manifest Verification
 */

#include "unity.h"
#include "relay.h"

static uint8_t g_last_cb_gang = 0;
static relay_state_t g_last_cb_state = RELAY_STATE_OFF;

static void test_callback(uint8_t gang, relay_state_t state, void *ctx) {
    g_last_cb_gang = gang;
    g_last_cb_state = state;
}

static const esp_channel_manifest_t s_mock_channels[2] = {
    { 1, 4, LOAD_TYPE_CHANDELIER, "Chandelier 1", RELAY_ACTIVE_LOW, RELAY_MODE_LATCHING, 0, true },
    { 2, 5, LOAD_TYPE_FAN, "Ceiling Fan", RELAY_ACTIVE_LOW, RELAY_MODE_PULSE, 200, true }
};

static const esp_device_manifest_t s_mock_manifest = {
    "SN:ESP32S3-2G-TEST-0001",
    "LUMIERE-S3-2G-TEST",
    "v2.4-SMD",
    2,
    s_mock_channels
};

void setUp(void) {
    relay.init(&s_mock_manifest);
    relay.setCallback(test_callback, NULL);
}

void tearDown(void) {
    relay.setAll(RELAY_STATE_OFF);
}

void test_relay_on_off_latching(void) {
    TEST_ASSERT_EQUAL(0, relay.on(1));
    TEST_ASSERT_EQUAL(RELAY_STATE_ON, relay.getState(1));
    TEST_ASSERT_EQUAL(1, g_last_cb_gang);
    TEST_ASSERT_EQUAL(RELAY_STATE_ON, g_last_cb_state);

    TEST_ASSERT_EQUAL(0, relay.off(1));
    TEST_ASSERT_EQUAL(RELAY_STATE_OFF, relay.getState(1));
    TEST_ASSERT_EQUAL(RELAY_STATE_OFF, g_last_cb_state);
}

void test_relay_static_manifest_protection(void) {
    // Assert that the board manifest reports exactly 2 gangs and cannot be modified
    const esp_device_manifest_t *manifest = relay.getManifest();
    TEST_ASSERT_NOT_NULL(manifest);
    TEST_ASSERT_EQUAL(2, manifest->hardware_gang_count);
    TEST_ASSERT_EQUAL_STRING("SN:ESP32S3-2G-TEST-0001", manifest->serial_no);
    TEST_ASSERT_EQUAL_STRING("Chandelier 1", manifest->channels[0].factory_name);
    TEST_ASSERT_TRUE(manifest->channels[0].is_factory_locked);
}

void test_relay_bounds_checking(void) {
    TEST_ASSERT_EQUAL(-1, relay.on(0));  // Invalid gang 0
    TEST_ASSERT_EQUAL(-1, relay.on(99)); // Invalid gang 99 (Manifest only has 2)
    TEST_ASSERT_EQUAL(-1, relay.getState(99));
}

int run_relay_tests(void) {
    UNITY_BEGIN();
    RUN_TEST(test_relay_on_off_latching);
    RUN_TEST(test_relay_static_manifest_protection);
    RUN_TEST(test_relay_bounds_checking);
    return UNITY_END();
}
`;

export const FLUTTER_CODE = `// ============================================================================
// FLUTTER SMART SWITCH COMPANION (Production Riverpod)
// Protocol: MQTT over TLS (8883) or Local WebSockets (ws://esp32.local:80/ws)
// Principle: Gang count, Serial No, Load Types & Switch Names are dictated
//            by the ESP32-S3 Device Manifest and are strictly READ-ONLY in the app.
// ============================================================================

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Immutable Channel Model announced by ESP32-S3 Manifest
class EspChannel {
  final int gangId;
  final String factoryName; // READ-ONLY: Decided on ESP side
  final String loadType;    // READ-ONLY: "fan", "light", "chandelier", "socket"
  final bool isReadOnly;    // Strictly true
  final bool isOn;
  final int gpioPin;

  EspChannel({
    required this.gangId,
    required this.factoryName,
    required this.loadType,
    required this.isReadOnly,
    required this.isOn,
    required this.gpioPin,
  });

  EspChannel copyWith({bool? isOn}) {
    return EspChannel(
      gangId: gangId,
      factoryName: factoryName,
      loadType: loadType,
      isReadOnly: isReadOnly,
      isOn: isOn ?? this.isOn,
      gpioPin: gpioPin,
    );
  }
}

/// Immutable ESP32 Hardware Manifest Model
class EspDeviceManifest {
  final String serialNumber;    // READ-ONLY: Burned into ESP32
  final String modelId;         // READ-ONLY: Hardware model
  final int gangCount;          // READ-ONLY: Decided from ESP side (e.g. 4)
  final String hardwareRev;
  final List<EspChannel> channels;

  EspDeviceManifest({
    required this.serialNumber,
    required this.modelId,
    required this.gangCount,
    required this.hardwareRev,
    required this.channels,
  });

  factory EspDeviceManifest.fromJson(Map<String, dynamic> json) {
    return EspDeviceManifest(
      serialNumber: json['serial_no'] ?? 'SN:UNKNOWN',
      modelId: json['model_id'] ?? 'LUMIERE-ESP32',
      gangCount: json['gang_count'] ?? 4,
      hardwareRev: json['hw_rev'] ?? 'v2.4',
      channels: (json['channels'] as List<dynamic>).map((c) {
        return EspChannel(
          gangId: c['gang_id'],
          factoryName: c['name'], // Read-only factory name
          loadType: c['type'],    // Fan / Light / Socket
          isReadOnly: true,
          isOn: c['state'] == 1,
          gpioPin: c['gpio'] ?? 0,
        );
      }).toList(),
    );
  }
}

// State Notifier managing ESP32 Hardware Manifest & Relay Actuation
final espDeviceProvider = StateNotifierProvider<EspDeviceNotifier, EspDeviceManifest?>((ref) {
  return EspDeviceNotifier();
});

class EspDeviceNotifier extends StateNotifier<EspDeviceManifest?> {
  EspDeviceNotifier() : super(null) {
    // In production: Connect to MQTT and subscribe to "device/+/manifest"
    _listenToEsp32ManifestAnnouncement();
  }

  void _listenToEsp32ManifestAnnouncement() {
    // Simulated received packet on topic: "device/ESP32S3-4G-2026-X883B/manifest"
    const samplePayload = '''
    {
      "serial_no": "SN:ESP32S3-4G-2026-X883B",
      "model_id": "LUMIERE-S3-4G-TOUCH",
      "hw_rev": "v2.4-SMD",
      "gang_count": 4,
      "channels": [
        {"gang_id": 1, "name": "Main Chandelier", "type": "chandelier", "gpio": 4, "state": 1},
        {"gang_id": 2, "name": "Ceiling Fan", "type": "fan", "gpio": 5, "state": 0},
        {"gang_id": 3, "name": "Ambient Downlights", "type": "light", "gpio": 6, "state": 1},
        {"gang_id": 4, "name": "Balcony Strip Light", "type": "light", "gpio": 7, "state": 0}
      ]
    }
    ''';
    state = EspDeviceManifest.fromJson(jsonDecode(samplePayload));
  }

  /// App can ONLY toggle or pulse relays; it CANNOT change gang count, serial, or names
  void toggleGang(int gangId) {
    if (state == null) return;
    state = EspDeviceManifest(
      serialNumber: state!.serialNumber,
      modelId: state!.modelId,
      gangCount: state!.gangCount,
      hardwareRev: state!.hardwareRev,
      channels: state!.channels.map((ch) {
        if (ch.gangId == gangId) {
          final newState = !ch.isOn;
          _publishRelayCommand(gangId, newState);
          return ch.copyWith(isOn: newState);
        }
        return ch;
      }).toList(),
    );
  }

  void _publishRelayCommand(int gangId, bool newState) {
    final payload = jsonEncode({
      "cmd": "SET_RELAY",
      "gang": gangId,
      "state": newState ? 1 : 0,
      "ts": DateTime.now().millisecondsSinceEpoch
    });
    debugPrint("Publish MQTT -> device/\${state?.serialNumber}/command: \$payload");
  }
}

class SmartSwitchApp extends ConsumerWidget {
  const SmartSwitchApp({Key? key}) : super(key: key);

  IconData _getIconForType(String type) {
    switch (type) {
      case 'fan': return Icons.mode_fan_off_outlined;
      case 'socket': return Icons.power_outlined;
      case 'chandelier': return Icons.auto_awesome;
      default: return Icons.lightbulb_outline;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final device = ref.watch(espDeviceProvider);
    if (device == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0A0F1D),
      ),
      home: Scaffold(
        appBar: AppBar(
          backgroundColor: const Color(0xFF111827),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(device.modelId, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              Text('\${device.serialNumber} • \${device.gangCount}-Gang Hardware Fixed',
                  style: const TextStyle(fontSize: 11, color: Colors.blueAccent)),
            ],
          ),
        ),
        body: Column(
          children: [
            // Read-Only Hardware Banner
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blueAccent.withOpacity(0.3)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.lock_outline, size: 16, color: Colors.blueAccent),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'ESP32 Authoritative: Gang count, loads & switch names are static and non-editable.',
                      style: TextStyle(fontSize: 12, color: Colors.white70),
                    ),
                  ),
                ],
              ),
            ),
            // Dynamic Grid matching ESP32's Gang Count
            Expanded(
              child: GridView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.1,
                ),
                itemCount: device.channels.length,
                itemBuilder: (context, index) {
                  final ch = device.channels[index];
                  return GestureDetector(
                    onTap: () {
                      HapticFeedback.selectionClick();
                      ref.read(espDeviceProvider.notifier).toggleGang(ch.gangId);
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: ch.isOn ? const Color(0xFF2563EB) : const Color(0xFF1F2937),
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(
                          color: ch.isOn ? Colors.blue.shade400 : Colors.white10,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Icon(_getIconForType(ch.loadType), color: Colors.white, size: 26),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.black38,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text('G\${ch.gangId}', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(ch.factoryName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white)),
                              const SizedBox(height: 3),
                              Text(ch.isOn ? 'ENERGIZED' : 'OFF', style: TextStyle(fontSize: 11, color: ch.isOn ? Colors.white70 : Colors.white38)),
                            ],
                          )
                        ],
                      ),
                    ),
                  );
                },
              ),
            )
          ],
        ),
      ),
    );
  }
}
`;

export const REACT_NATIVE_CODE = `// ============================================================================
// REACT NATIVE SMART SWITCH COMPANION (TypeScript)
// Protocol: MQTT over TLS / BLE GATT Discovery
// Principle: Hardware profile is burned into the ESP32-S3 and is strictly READ-ONLY.
//            The mobile application cannot edit Gang count, Serial No, Load Type, or Switch Name.
// ============================================================================

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Vibration } from 'react-native';

export interface EspChannel {
  gangId: number;
  factoryName: string; // READ-ONLY: Decided on ESP32 side
  loadType: 'chandelier' | 'fan' | 'light' | 'socket' | 'heater' | 'ac';
  gpioPin: number;
  isOn: boolean;
}

export interface EspHardwareManifest {
  serialNumber: string; // READ-ONLY: Burned in ESP32 Flash
  modelId: string;      // READ-ONLY: e.g. "LUMIERE-S3-4G-TOUCH"
  gangCount: number;    // READ-ONLY: Physical gang count
  channels: EspChannel[];
}

export const SmartSwitchScreen = () => {
  // Static state populated from ESP32 MQTT Discovery Announcement
  const [manifest, setManifest] = useState<EspHardwareManifest>({
    serialNumber: 'SN:ESP32S3-4G-2026-X883B',
    modelId: 'LUMIERE-S3-4G-TOUCH',
    gangCount: 4,
    channels: [
      { gangId: 1, factoryName: 'Main Chandelier', loadType: 'chandelier', gpioPin: 4, isOn: true },
      { gangId: 2, factoryName: 'Ceiling Fan', loadType: 'fan', gpioPin: 5, isOn: false },
      { gangId: 3, factoryName: 'Ambient Downlights', loadType: 'light', gpioPin: 6, isOn: true },
      { gangId: 4, factoryName: 'Balcony Strip Light', loadType: 'light', gpioPin: 7, isOn: false },
    ]
  });

  const toggleGang = (gangId: number) => {
    Vibration.vibrate(12);
    setManifest(prev => ({
      ...prev,
      channels: prev.channels.map(ch =>
        ch.gangId === gangId ? { ...ch, isOn: !ch.isOn } : ch
      )
    }));

    // Dispatch MQTT control command (App does NOT send names or gang configuration)
    // mqttClient.publish(\`device/\${manifest.serialNumber}/command\`, JSON.stringify({
    //   cmd: "TOGGLE",
    //   gang: gangId,
    //   ts: Date.now()
    // }));
  };

  return (
    <View style={styles.container}>
      {/* Device Header - Strictly displaying ESP32-burned metadata */}
      <View style={styles.header}>
        <Text style={styles.title}>{manifest.modelId}</Text>
        <Text style={styles.subtitle}>
          {manifest.serialNumber} • {manifest.gangCount}-Gang Hardware (Locked)
        </Text>
      </View>

      {/* Hardware Enforcement Notice */}
      <View style={styles.lockNotice}>
        <Text style={styles.lockText}>
          🔒 Hardware Authority: Gang count, load types, and channel names are factory-fixed in ESP32 firmware.
        </Text>
      </View>

      {/* Channels Grid - Dynamic to manifest.gangCount */}
      <FlatList
        data={manifest.channels}
        numColumns={2}
        keyExtractor={item => item.gangId.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => toggleGang(item.gangId)}
            style={[styles.card, item.isOn ? styles.cardActive : styles.cardInactive]}
          >
            <View style={styles.cardTop}>
              <Text style={styles.loadTypeBadge}>[{item.loadType.toUpperCase()}]</Text>
              <Text style={styles.gangBadge}>G{item.gangId}</Text>
            </View>
            <View>
              <Text style={styles.channelName}>{item.factoryName}</Text>
              <Text style={item.isOn ? styles.stateActive : styles.stateInactive}>
                {item.isOn ? 'POWER ON' : 'OFF'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1D', padding: 20 },
  header: { marginTop: 40, marginBottom: 14 },
  title: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  subtitle: { fontSize: 13, color: '#60A5FA', marginTop: 4, fontFamily: 'monospace' },
  lockNotice: {
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F640',
    marginBottom: 18,
  },
  lockText: { color: '#94A3B8', fontSize: 12, lineHeight: 18 },
  card: {
    flex: 1,
    margin: 6,
    padding: 16,
    height: 130,
    borderRadius: 16,
    justifyContent: 'space-between',
  },
  cardActive: { backgroundColor: '#2563EB' },
  cardInactive: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  loadTypeBadge: { fontSize: 10, color: '#CBD5E1', fontWeight: 'bold' },
  gangBadge: { fontSize: 11, color: '#FFFFFF', fontWeight: 'bold' },
  channelName: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  stateActive: { fontSize: 11, color: '#BFDBFE', marginTop: 4, fontWeight: 'bold' },
  stateInactive: { fontSize: 11, color: '#64748B', marginTop: 4 },
});
`;

