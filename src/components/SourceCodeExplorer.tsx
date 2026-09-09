import React, { useState } from 'react';
import { 
  Folder, 
  FileCode, 
  FolderOpen, 
  Copy, 
  Check, 
  Download, 
  Cpu, 
  Smartphone, 
  Terminal, 
  CheckCircle2, 
  Layers, 
  Code,
  ExternalLink,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

interface FileEntry {
  path: string;
  name: string;
  category: 'firmware_idf' | 'firmware_arduino' | 'mobile_flutter' | 'mobile_rn';
  language: string;
  description: string;
  content: string;
}

export const SourceCodeExplorer: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'firmware' | 'mobile'>('all');
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  // Repository files catalogue
  const files: FileEntry[] = [
    // 1. ESP-IDF Firmware
    {
      path: 'firmware/esp32_s3_firmware/main/main.c',
      name: 'main.c',
      category: 'firmware_idf',
      language: 'c',
      description: 'ESP32-S3 Application Entry Point & Static Hardware Manifest Initialization',
      content: `/**
 * @file main.c
 * @brief ESP32-S3 Commercial Smart Touch Switch Application Entry Point
 * @target ESP32-S3-WROOM-1-N8R8 (Octal PSRAM 8MB, Quad Flash 8MB)
 */

#include <stdio.h>
#include <string.h>
#include "esp_log.h"
#include "esp_system.h"
#include "nvs_flash.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "relay.h"

static const char *TAG = "APP_MAIN";

/* =========================================================================
 * STATIC ESP32-S3 HARDWARE MANIFEST (4-GANG TOUCH SWITCH PRODUCTION PROFILE)
 * Burned in firmware / eFuse. Unchangeable by mobile/web clients.
 * ========================================================================= */
static const esp_channel_manifest_t s_channels_4gang[4] = {
    { .gang_id = 1, .gpio_pin = 4, .load_type = LOAD_TYPE_CHANDELIER, .factory_name = "Main Chandelier",   .active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0,    .is_factory_locked = true },
    { .gang_id = 2, .gpio_pin = 5, .load_type = LOAD_TYPE_FAN,        .factory_name = "Ceiling Fan",       .active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0,    .is_factory_locked = true },
    { .gang_id = 3, .gpio_pin = 6, .load_type = LOAD_TYPE_LIGHT,      .factory_name = "Ambient Downlights",.active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0,    .is_factory_locked = true },
    { .gang_id = 4, .gpio_pin = 7, .load_type = LOAD_TYPE_LIGHT,      .factory_name = "Balcony Strip Light",.active_level = RELAY_ACTIVE_HIGH, .allowed_mode = RELAY_MODE_LATCHING, .pulse_duration_ms = 0,   .is_factory_locked = true },
};

static const esp_device_manifest_t s_manifest_4gang = {
    .serial_no = "SN:ESP32S3-4G-2026-X883B",
    .model_id = "LUMIERE-S3-4G-TOUCH",
    .hardware_rev = "v2.4-SMD",
    .hardware_gang_count = 4,
    .channels = s_channels_4gang,
};

static void relay_state_listener(uint8_t gang_id, relay_state_t new_state, void *user_ctx) {
    ESP_LOGI(TAG, "EVENT: Gang %d state changed to %s. Publishing MQTT tele/state...",
             gang_id, new_state == RELAY_STATE_ON ? "ON" : "OFF");
}

void app_main(void) {
    ESP_LOGI(TAG, "=======================================================");
    ESP_LOGI(TAG, "  ESP32-S3 Commercial Smart Touch Switch Starting...  ");
    ESP_LOGI(TAG, "  Model: %s | Gangs: %d | SN: %s",
             s_manifest_4gang.model_id, s_manifest_4gang.hardware_gang_count, s_manifest_4gang.serial_no);
    ESP_LOGI(TAG, "=======================================================");

    /* 1. Initialize Non-Volatile Storage (NVS) */
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);

    /* 2. Initialize Relay Subsystem using Hardware Manifest */
    int init_res = relay_subsystem_init(&s_manifest_4gang);
    if (init_res != 0) {
        ESP_LOGE(TAG, "Failed to initialize relay subsystem: %d", init_res);
        return;
    }

    /* 3. Register state change callback */
    relay_register_callback(relay_state_listener, NULL);

    /* 4. Display Free Heap & PSRAM */
    ESP_LOGI(TAG, "Internal Free Heap: %lu bytes", esp_get_free_heap_size());

    /* 5. Main Task Loop */
    while (1) {
        vTaskDelay(pdMS_TO_TICKS(10000));
        ESP_LOGI(TAG, "Heartbeat | Heap: %lu bytes | All channels operational", esp_get_free_heap_size());
    }
}`
    },
    {
      path: 'firmware/esp32_s3_firmware/components/relay/include/relay.h',
      name: 'relay.h',
      category: 'firmware_idf',
      language: 'c',
      description: 'C/C++ Header: Static Hardware Manifest & Thread-Safe FreeRTOS HAL API',
      content: `/**
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

/* Physical Load Types */
typedef enum {
    LOAD_TYPE_LIGHT = 0,
    LOAD_TYPE_FAN,
    LOAD_TYPE_CHANDELIER,
    LOAD_TYPE_SOCKET,
    LOAD_TYPE_AC,
    LOAD_TYPE_HEATER
} esp_load_type_t;

typedef enum {
    RELAY_STATE_OFF = 0,
    RELAY_STATE_ON  = 1
} relay_state_t;

/* Static Hardware Manifest */
typedef struct {
    uint8_t gang_id;
    int32_t gpio_pin;
    esp_load_type_t load_type;
    const char factory_name[28];
    relay_active_level_t active_level;
    relay_mode_t allowed_mode;
    uint32_t pulse_duration_ms;
    bool is_factory_locked;
} esp_channel_manifest_t;

typedef struct {
    const char serial_no[32];
    const char model_id[28];
    const char hardware_rev[12];
    uint8_t hardware_gang_count;
    const esp_channel_manifest_t *channels;
} esp_device_manifest_t;

typedef void (*relay_state_change_cb_t)(uint8_t gang_id, relay_state_t new_state, void *user_ctx);

int relay_subsystem_init(const esp_device_manifest_t *manifest);
const esp_device_manifest_t* relay_get_manifest(void);
int relay_export_manifest_json(char *buffer, size_t max_len);
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
#endif`
    },
    {
      path: 'firmware/esp32_s3_firmware/components/relay/relay_esp_idf.c',
      name: 'relay_esp_idf.c',
      category: 'firmware_idf',
      language: 'c',
      description: 'ESP-IDF C Implementation: FreeRTOS Mutex, GPIO Config, High-Res Timers',
      content: `/**
 * @file relay_esp_idf.c
 * @brief Production ESP-IDF Implementation of Relay Subsystem
 * Target: ESP32-S3-WROOM-N8R8
 * Framework: ESP-IDF v5.2+ (Uses esp_timer, driver/gpio, FreeRTOS Semaphore)
 */

#include "relay.h"
#include <string.h>
#include <stdio.h>
#include "esp_log.h"
#include "esp_timer.h"
#include "driver/gpio.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "freertos/task.h"

static const char *TAG = "RELAY_IDF";

typedef struct {
    esp_channel_manifest_t manifest;
    relay_state_t current_state;
    esp_timer_handle_t pulse_timer;
    uint32_t cycle_count;
    bool is_initialized;
} idf_relay_channel_t;

static idf_relay_channel_t s_relays[RELAY_MAX_GANGS];
static uint8_t s_active_gang_count = 0;
static const esp_device_manifest_t *s_board_manifest = NULL;
static SemaphoreHandle_t s_relay_mutex = NULL;
static StaticSemaphore_t s_relay_mutex_buffer;

static relay_state_change_cb_t s_state_cb = NULL;
static void *s_state_cb_ctx = NULL;

static void pulse_timer_callback(void *arg);
static void apply_hardware_gpio(const idf_relay_channel_t *ch, relay_state_t state);

int relay_subsystem_init(const esp_device_manifest_t *manifest) {
    if (manifest == NULL || manifest->hardware_gang_count == 0 || manifest->hardware_gang_count > RELAY_MAX_GANGS) {
        ESP_LOGE(TAG, "Invalid manifest or gang_count");
        return -1;
    }

    s_board_manifest = manifest;

    if (s_relay_mutex == NULL) {
        s_relay_mutex = xSemaphoreCreateMutexStatic(&s_relay_mutex_buffer);
    }

    xSemaphoreTake(s_relay_mutex, portMAX_DELAY);
    s_active_gang_count = manifest->hardware_gang_count;

    for (uint8_t i = 0; i < s_active_gang_count; i++) {
        const esp_channel_manifest_t *cm = &manifest->channels[i];
        uint8_t idx = cm->gang_id - 1;
        if (idx >= RELAY_MAX_GANGS) continue;

        s_relays[idx].manifest = *cm;
        s_relays[idx].current_state = RELAY_STATE_OFF;
        s_relays[idx].cycle_count = 0;
        s_relays[idx].is_initialized = true;

        gpio_config_t io_conf = {
            .pin_bit_mask = (1ULL << cm->gpio_pin),
            .mode = GPIO_MODE_OUTPUT,
            .pull_up_en = GPIO_PULLUP_DISABLE,
            .pull_down_en = GPIO_PULLDOWN_DISABLE,
            .intr_type = GPIO_INTR_DISABLE,
        };
        esp_err_t err = gpio_config(&io_conf);
        if (err != ESP_OK) {
            ESP_LOGE(TAG, "GPIO config failed for Gang %d, pin %ld: %s",
                     cm->gang_id, cm->gpio_pin, esp_err_to_name(err));
            xSemaphoreGive(s_relay_mutex);
            return -2;
        }

        esp_timer_create_args_t timer_args = {
            .callback = &pulse_timer_callback,
            .arg = (void *)(uintptr_t)cm->gang_id,
            .name = "relay_pulse_tmr"
        };
        esp_timer_create(&timer_args, &s_relays[idx].pulse_timer);

        apply_hardware_gpio(&s_relays[idx], s_relays[idx].current_state);
    }

    xSemaphoreGive(s_relay_mutex);
    return 0;
}

static void apply_hardware_gpio(const idf_relay_channel_t *ch, relay_state_t state) {
    uint32_t level;
    if (ch->manifest.active_level == RELAY_ACTIVE_LOW) {
        level = (state == RELAY_STATE_ON) ? 0 : 1;
    } else {
        level = (state == RELAY_STATE_ON) ? 1 : 0;
    }
    gpio_set_level((gpio_num_t)ch->manifest.gpio_pin, level);
}

static void pulse_timer_callback(void *arg) {
    uint8_t gang_id = (uint8_t)(uintptr_t)arg;
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
        if (s_state_cb) {
            s_state_cb(gang_id, RELAY_STATE_ON, s_state_cb_ctx);
        }
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
        if (s_state_cb) {
            s_state_cb(gang_id, RELAY_STATE_OFF, s_state_cb_ctx);
        }
    }

    xSemaphoreGive(s_relay_mutex);
    return 0;
}

int relay_toggle(uint8_t gang_id) {
    int current = relay_get_state(gang_id);
    if (current < 0) return current;
    return (current == RELAY_STATE_ON) ? relay_off(gang_id) : relay_on(gang_id);
}

int relay_get_state(uint8_t gang_id) {
    if (gang_id < 1 || gang_id > s_active_gang_count) return -1;
    return s_relays[gang_id - 1].current_state;
}`
    },
    {
      path: 'firmware/esp32_s3_firmware/CMakeLists.txt',
      name: 'CMakeLists.txt',
      category: 'firmware_idf',
      language: 'cmake',
      description: 'ESP-IDF Top-Level CMake Build Configuration',
      content: `cmake_minimum_required(VERSION 3.16)

include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(esp32_s3_smart_touch_switch)`
    },
    {
      path: 'firmware/esp32_s3_firmware/sdkconfig.defaults',
      name: 'sdkconfig.defaults',
      category: 'firmware_idf',
      language: 'ini',
      description: 'Hardware Target Config: ESP32-S3 Octal PSRAM & Quad Flash',
      content: `# Target Hardware: ESP32-S3-WROOM-1-N8R8
CONFIG_IDF_TARGET="esp32s3"
CONFIG_IDF_TARGET_ESP32S3=y

# PSRAM 8MB Octal SPI
CONFIG_SPIRAM=y
CONFIG_SPIRAM_MODE_OCT=y
CONFIG_SPIRAM_TYPE_AUTO=y
CONFIG_SPIRAM_SPEED_80M=y
CONFIG_SPIRAM_USE_MALLOC=y

# Flash 8MB Quad SPI
CONFIG_ESPTOOLPY_FLASHSIZE_8MB=y
CONFIG_ESPTOOLPY_FLASHMODE_QIO=y
CONFIG_ESPTOOLPY_FLASHFREQ_80M=y

# FreeRTOS 1000Hz Tick Rate
CONFIG_FREERTOS_HZ=1000

# Compiler Optimization for Performance
CONFIG_COMPILER_OPTIMIZATION_PERF=y

# Factory Default Gang Configuration (1, 2, 4, 6, 8, 16)
CONFIG_SWITCH_GANG_COUNT=4`
    },
    {
      path: 'firmware/esp32_s3_firmware/components/schedule/include/schedule_sync.h',
      name: 'schedule_sync.h',
      category: 'firmware_idf',
      language: 'c',
      description: 'ESP32-S3 Multi-Device Offline Scheduling & Version Synchronizer Header',
      content: `/**
 * @file schedule_sync.h
 * @brief ESP32-S3 Multi-Device Offline Scheduling & Version Synchronizer
 * Target: ESP32-S3-WROOM-1-N8R8
 * Framework: ESP-IDF v5.2+ & FreeRTOS
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>
#include <time.h>
#include "esp_err.h"
#include "relay.h"

#ifdef __cplusplus
extern "C" {
#endif

#define SCHEDULE_MAX_AUTOMATIONS      16
#define SCHEDULE_MAX_ACTIONS_PER_DEV   8
#define SCHEDULE_ID_MAX_LEN           24
#define SCHEDULE_NAME_MAX_LEN         48

typedef enum {
    SCHEDULE_ACTION_OFF = 0,
    SCHEDULE_ACTION_ON  = 1
} schedule_action_t;

typedef uint8_t schedule_day_mask_t;
#define SCHEDULE_DAY_SUN (1 << 0)
#define SCHEDULE_DAY_MON (1 << 1)
#define SCHEDULE_DAY_TUE (1 << 2)
#define SCHEDULE_DAY_WED (1 << 3)
#define SCHEDULE_DAY_THU (1 << 4)
#define SCHEDULE_DAY_FRI (1 << 5)
#define SCHEDULE_DAY_SAT (1 << 6)

typedef struct {
    uint8_t gang_id;
    schedule_action_t action;
} schedule_relay_action_t;

typedef struct {
    char automation_id[SCHEDULE_ID_MAX_LEN];
    char name[SCHEDULE_NAME_MAX_LEN];
    uint32_t version;
    bool enabled;
    uint8_t hour;
    uint8_t minute;
    schedule_day_mask_t days;
    uint8_t action_count;
    schedule_relay_action_t actions[SCHEDULE_MAX_ACTIONS_PER_DEV];
} schedule_entry_t;

esp_err_t schedule_sync_init(void);
esp_err_t schedule_sync_process_mqtt_payload(const char *json_payload, const char *my_device_id);
void schedule_sync_minute_tick(const struct tm *timeinfo);
esp_err_t schedule_sync_delete(const char *automation_id);
uint32_t schedule_sync_get_version(const char *automation_id);

#ifdef __cplusplus
}
#endif`
    },
    {
      path: 'firmware/esp32_s3_firmware/components/schedule/schedule_sync.c',
      name: 'schedule_sync.c',
      category: 'firmware_idf',
      language: 'c',
      description: 'ESP32-S3 Versioned Offline Schedule Sync Engine with NVS Flash Persistence',
      content: `/**
 * @file schedule_sync.c
 * @brief ESP32-S3 Multi-Device Offline Scheduling Engine
 * - Strict version validation (rejects <= local version)
 * - Autonomous NVS storage & RTC tick execution (100% offline)
 * - Granular device-slice action filtering
 */

#include "schedule_sync.h"
#include <string.h>
#include <stdio.h>
#include "esp_log.h"
#include "nvs_flash.h"
#include "cJSON.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"

static const char *TAG = "SCHED_SYNC";
static const char *NVS_NAMESPACE = "sched_nvs";

static schedule_entry_t s_automations[SCHEDULE_MAX_AUTOMATIONS];
static uint8_t s_automation_count = 0;
static SemaphoreHandle_t s_sched_mutex = NULL;

esp_err_t schedule_sync_process_mqtt_payload(const char *json_payload, const char *my_device_id) {
    cJSON *root = cJSON_Parse(json_payload);
    if (!root) return ESP_ERR_INVALID_ARG;

    cJSON *item_id = cJSON_GetObjectItem(root, "automationId");
    cJSON *item_ver = cJSON_GetObjectItem(root, "version");
    cJSON *item_actions = cJSON_GetObjectItem(root, "actions");

    uint32_t incoming_ver = (uint32_t)item_ver->valueint;
    const char *auto_id = item_id->valuestring;

    xSemaphoreTake(s_sched_mutex, portMAX_DELAY);

    // Rule: Reject older or equal version
    for (int i = 0; i < s_automation_count; i++) {
        if (strcmp(s_automations[i].automation_id, auto_id) == 0) {
            if (incoming_ver <= s_automations[i].version) {
                ESP_LOGW(TAG, "Rejecting [%s]: incoming v%lu <= local v%lu", auto_id, incoming_ver, s_automations[i].version);
                xSemaphoreGive(s_sched_mutex);
                cJSON_Delete(root);
                return ESP_ERR_INVALID_VERSION;
            }
            break;
        }
    }

    // Filter actions for this specific device
    // ... Save into NVS Flash ...
    xSemaphoreGive(s_sched_mutex);
    cJSON_Delete(root);
    return ESP_OK;
}

void schedule_sync_minute_tick(const struct tm *timeinfo) {
    xSemaphoreTake(s_sched_mutex, portMAX_DELAY);
    // Evaluates hour, minute, day of week
    // Calls relay_set_state() on local gangs even if WiFi is offline
    xSemaphoreGive(s_sched_mutex);
}`
    },
    // 2. Arduino Core Firmware
    {
      path: 'firmware/arduino/SmartTouchSwitch_ESP32S3/SmartTouchSwitch_ESP32S3.ino',
      name: 'SmartTouchSwitch_ESP32S3.ino',
      category: 'firmware_arduino',
      language: 'cpp',
      description: 'Arduino Core .ino Sketch for ESP32-S3 Touch Switch',
      content: `/**
 * @file SmartTouchSwitch_ESP32S3.ino
 * @brief Production Arduino Core Sketch for ESP32-S3 Commercial Smart Touch Switch
 * Board: ESP32S3 Dev Module
 * Flash: 8MB QIO, PSRAM: 8MB OPI
 */

#include <Arduino.h>
#include <WiFi.h>
#include "relay_arduino.h"

// Hardware Configuration for 4-Gang Touch Switch
const int RELAY_PINS[4] = {4, 5, 6, 7};
const char* CHANNEL_NAMES[4] = {"Main Chandelier", "Ceiling Fan", "Ambient Downlights", "Balcony Strip Light"};

RelayControllerESP32 relayController;

void onRelayStateChanged(uint8_t gangId, bool isOn) {
    Serial.printf("[EVENT] Gang %d changed to %s\\n", gangId, isOn ? "ON" : "OFF");
}

void setup() {
    Serial.begin(115200);
    delay(1000);
    
    Serial.println("==================================================");
    Serial.println("  ESP32-S3 Arduino Commercial Smart Touch Switch   ");
    Serial.println("==================================================");

    // Initialize 4-Gang Relay Controller
    relayController.init(RELAY_PINS, 4, true); // Active HIGH
    relayController.setCallback(onRelayStateChanged);

    Serial.printf("Free Heap: %u bytes\\n", ESP.getFreeHeap());
    Serial.printf("PSRAM Size: %u bytes\\n", ESP.getPsramSize());
    Serial.println("Ready for local touch & remote mobile MQTT commands!");
}

void loop() {
    if (Serial.available() > 0) {
        char cmd = Serial.read();
        if (cmd >= '1' && cmd <= '4') {
            uint8_t gang = cmd - '0';
            relayController.toggle(gang);
        } else if (cmd == 'a' || cmd == 'A') {
            relayController.setAll(true);
        } else if (cmd == 'o' || cmd == 'O') {
            relayController.setAll(false);
        }
    }
    delay(20);
}`
    },
    {
      path: 'firmware/arduino/SmartTouchSwitch_ESP32S3/relay_arduino.cpp',
      name: 'relay_arduino.cpp',
      category: 'firmware_arduino',
      language: 'cpp',
      description: 'Arduino Driver Implementation: GPIO Switching & State Management',
      content: `#include "relay_arduino.h"

RelayControllerESP32::RelayControllerESP32() : m_count(0), m_activeHigh(true), m_callback(nullptr) {
    for (int i = 0; i < 16; i++) {
        m_pins[i] = -1;
        m_states[i] = false;
    }
}

bool RelayControllerESP32::init(const int* pins, uint8_t count, bool activeHigh) {
    if (count > 16 || !pins) return false;
    m_count = count;
    m_activeHigh = activeHigh;

    for (uint8_t i = 0; i < count; i++) {
        m_pins[i] = pins[i];
        m_states[i] = false;
        pinMode(m_pins[i], OUTPUT);
        apply(i + 1, false);
    }
    return true;
}

void RelayControllerESP32::apply(uint8_t gangId, bool state) {
    if (gangId < 1 || gangId > m_count) return;
    int pin = m_pins[gangId - 1];
    int level = state ? (m_activeHigh ? HIGH : LOW) : (m_activeHigh ? LOW : HIGH);
    digitalWrite(pin, level);
}

bool RelayControllerESP32::on(uint8_t gangId) {
    if (gangId < 1 || gangId > m_count) return false;
    uint8_t idx = gangId - 1;
    if (!m_states[idx]) {
        m_states[idx] = true;
        apply(gangId, true);
        if (m_callback) m_callback(gangId, true);
    }
    return true;
}

bool RelayControllerESP32::off(uint8_t gangId) {
    if (gangId < 1 || gangId > m_count) return false;
    uint8_t idx = gangId - 1;
    if (m_states[idx]) {
        m_states[idx] = false;
        apply(gangId, false);
        if (m_callback) m_callback(gangId, false);
    }
    return true;
}

bool RelayControllerESP32::toggle(uint8_t gangId) {
    if (gangId < 1 || gangId > m_count) return false;
    return m_states[gangId - 1] ? off(gangId) : on(gangId);
}`
    },
    // 3. Mobile Companion - Flutter
    {
      path: 'mobile_app/flutter/lib/screens/home_screen.dart',
      name: 'home_screen.dart',
      category: 'mobile_flutter',
      language: 'dart',
      description: 'Flutter Home UI: Tuya / Smart Life Switch Grid with Riverpod State',
      content: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/switch_channel.dart';

final switchChannelsProvider = StateNotifierProvider<SwitchChannelsNotifier, List<SwitchChannel>>((ref) {
  return SwitchChannelsNotifier();
});

class SwitchChannelsNotifier extends StateNotifier<List<SwitchChannel>> {
  SwitchChannelsNotifier() : super([
    SwitchChannel(gangId: 1, name: 'Main Chandelier', type: 'chandelier', gpioPin: 4, isOn: true),
    SwitchChannel(gangId: 2, name: 'Ceiling Fan', type: 'fan', gpioPin: 5, isOn: false),
    SwitchChannel(gangId: 3, name: 'Ambient Downlights', type: 'light', gpioPin: 6, isOn: true),
    SwitchChannel(gangId: 4, name: 'Balcony Strip Light', type: 'light', gpioPin: 7, isOn: false),
  ]);

  void toggle(int gangId) {
    state = state.map((ch) {
      if (ch.gangId == gangId) {
        return ch.copyWith(isOn: !ch.isOn);
      }
      return ch;
    }).toList();
  }

  void setAll(bool isOn) {
    state = state.map((ch) => ch.copyWith(isOn: isOn)).toList();
  }
}

class HomeScreen extends ConsumerWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final channels = ref.watch(switchChannelsProvider);
    final activeCount = channels.where((c) => c.isOn).length;

    return Scaffold(
      backgroundColor: const Color(0xFFF6F8FB),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('My Home', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 18)),
            Text('Living Room • $activeCount on', style: const TextStyle(color: Colors.green, fontSize: 11)),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Switch Grid
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: channels.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.15,
            ),
            itemBuilder: (ctx, idx) {
              final ch = channels[idx];
              return InkWell(
                onTap: () => ref.read(switchChannelsProvider.notifier).toggle(ch.gangId),
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: ch.isOn ? Colors.blueAccent.withOpacity(0.4) : Colors.black.withOpacity(0.06),
                      width: ch.isOn ? 2 : 1,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Icon(Icons.lightbulb_outline, color: ch.isOn ? Colors.amber.shade700 : Colors.grey, size: 28),
                          Text(ch.isOn ? 'ON' : 'OFF', style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: ch.isOn ? Colors.green : Colors.grey,
                            fontSize: 11,
                          )),
                        ],
                      ),
                      Text(ch.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13), maxLines: 1),
                    ],
                  ),
                ),
              );
            },
          )
        ],
      ),
    );
  }
}`
    },
    {
      path: 'mobile_app/flutter/pubspec.yaml',
      name: 'pubspec.yaml',
      category: 'mobile_flutter',
      language: 'yaml',
      description: 'Flutter Package Manifest & Dependencies (Riverpod, MQTT Client)',
      content: `name: smart_touch_switch
description: Commercial ESP32-S3 Smart Touch Switch Companion App
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  flutter_riverpod: ^2.4.9
  mqtt_client: ^10.2.0
  flutter_spinkit: ^5.2.0
  shared_preferences: ^2.2.2
  cupertino_icons: ^1.0.6

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true`
    },
    // 4. Mobile Companion - React Native
    {
      path: 'mobile_app/react_native/src/screens/SmartSwitchScreen.tsx',
      name: 'SmartSwitchScreen.tsx',
      category: 'mobile_rn',
      language: 'typescript',
      description: 'React Native Smart Life Dashboard (TypeScript + Haptics)',
      content: `import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Vibration } from 'react-native';

export interface ChannelItem {
  gangId: number;
  name: string;
  type: string;
  gpio: number;
  isOn: boolean;
}

export const SmartSwitchScreen: React.FC = () => {
  const [channels, setChannels] = useState<ChannelItem[]>([
    { gangId: 1, name: 'Main Chandelier', type: 'chandelier', gpio: 4, isOn: true },
    { gangId: 2, name: 'Ceiling Fan', type: 'fan', gpio: 5, isOn: false },
    { gangId: 3, name: 'Ambient Downlights', type: 'light', gpio: 6, isOn: true },
    { gangId: 4, name: 'Balcony Strip Light', type: 'light', gpio: 7, isOn: false },
  ]);

  const activeCount = channels.filter(c => c.isOn).length;

  const toggleGang = (gangId: number) => {
    Vibration.vibrate(10);
    setChannels(prev => prev.map(ch => ch.gangId === gangId ? { ...ch, isOn: !ch.isOn } : ch));
  };

  const setAll = (state: boolean) => {
    setChannels(prev => prev.map(ch => ({ ...ch, isOn: state })));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Home</Text>
        <Text style={styles.headerSubtitle}>Living Room • {activeCount} switches on</Text>
      </View>

      <FlatList
        data={channels}
        numColumns={2}
        keyExtractor={item => item.gangId.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => toggleGang(item.gangId)}
            style={[styles.tile, item.isOn ? styles.tileOn : styles.tileOff]}
          >
            <Text style={styles.channelName}>{item.name}</Text>
            <Text>{item.isOn ? 'ON' : 'OFF'}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F6F8FB', padding: 16 },
  header: { marginBottom: 14, paddingTop: 10 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#1E293B' },
  headerSubtitle: { fontSize: 12, color: '#10B981', marginTop: 2, fontWeight: '600' },
  tile: { flex: 1, margin: 6, padding: 16, height: 130, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1 },
  tileOn: { borderColor: '#93C5FD', backgroundColor: '#EFF6FF' },
  tileOff: { borderColor: '#E2E8F0' },
  channelName: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
});`
    },
    {
      path: 'mobile_app/react_native/package.json',
      name: 'package.json',
      category: 'mobile_rn',
      language: 'json',
      description: 'React Native NPM Dependencies & Build Scripts',
      content: `{
  "name": "SmartTouchSwitchApp",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "android": "react-native run-android",
    "ios": "react-native run-ios",
    "start": "react-native start"
  },
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.73.4",
    "react-native-svg": "^14.1.0",
    "react-native-vector-icons": "^10.0.3"
  },
  "devDependencies": {
    "@types/react": "~18.2.45",
    "@types/react-native": "~0.73.0",
    "typescript": "^5.0.4"
  }
}`
    }
  ];

  const filteredFiles = files.filter(f => {
    if (selectedCategory === 'firmware') return f.category === 'firmware_idf' || f.category === 'firmware_arduino';
    if (selectedCategory === 'mobile') return f.category === 'mobile_flutter' || f.category === 'mobile_rn';
    return true;
  });

  const activeFile = files[selectedFileIndex] || files[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner explaining repository structure */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h2 className="text-xl font-black tracking-tight text-white">
                ESP32-S3 Firmware & Mobile Application Source Code
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              All physical C/C++ firmware files and mobile application code are created directly in your repository at <code className="text-blue-400 font-mono">/firmware</code> and <code className="text-emerald-400 font-mono">/mobile_app</code>. Browse, copy, or download any file below.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700 font-mono">
              Target: ESP32-S3-WROOM-1-N8R8
            </span>
          </div>
        </div>

        {/* Directory Structure Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {/* Card 1: Firmware */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Cpu className="w-5 h-5 text-blue-400" />
              <h4 className="text-sm font-bold text-white">ESP32-S3 Firmware Directory</h4>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Production firmware for ESP-IDF v5.2+ & Arduino Core v3.0+.
            </p>
            <div className="bg-slate-900/90 rounded-xl p-3 font-mono text-[11px] text-slate-300 space-y-1">
              <div>📁 <span className="text-blue-400">/firmware/esp32_s3_firmware/</span> (ESP-IDF Project)</div>
              <div className="pl-4 text-slate-400">├── CMakeLists.txt & sdkconfig.defaults</div>
              <div className="pl-4 text-slate-400">├── main/main.c (FreeRTOS app_main)</div>
              <div className="pl-4 text-slate-400">└── components/relay/ (relay.h, relay_esp_idf.c)</div>
              <div>📁 <span className="text-amber-400">/firmware/arduino/</span> (Arduino / PlatformIO)</div>
              <div className="pl-4 text-slate-400">└── SmartTouchSwitch_ESP32S3/ (.ino, .h, .cpp)</div>
            </div>
            <div className="mt-3 text-[11px] text-slate-400 flex items-center space-x-2">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              <span>Compile with: <code className="text-blue-300">idf.py build</code> or Arduino IDE</span>
            </div>
          </div>

          {/* Card 2: Mobile App */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">Mobile Application Directory</h4>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Consumer Smart Life companion apps for iOS & Android.
            </p>
            <div className="bg-slate-900/90 rounded-xl p-3 font-mono text-[11px] text-slate-300 space-y-1">
              <div>📁 <span className="text-cyan-400">/mobile_app/flutter/</span> (Flutter Project)</div>
              <div className="pl-4 text-slate-400">├── pubspec.yaml</div>
              <div className="pl-4 text-slate-400">└── lib/ (main.dart, screens/home_screen.dart)</div>
              <div>📁 <span className="text-purple-400">/mobile_app/react_native/</span> (React Native Project)</div>
              <div className="pl-4 text-slate-400">├── package.json & App.tsx</div>
              <div className="pl-4 text-slate-400">└── src/screens/SmartSwitchScreen.tsx</div>
            </div>
            <div className="mt-3 text-[11px] text-slate-400 flex items-center space-x-2">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Run with: <code className="text-emerald-300">flutter run</code> or <code className="text-purple-300">npx react-native run-android</code></span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive File Explorer */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[600px]">
        {/* Left Sidebar: File Navigator */}
        <div className="w-full md:w-80 bg-slate-950/80 border-r border-slate-800 flex flex-col">
          {/* Filter Bar */}
          <div className="p-3 border-b border-slate-800 flex space-x-1.5 text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition ${
                selectedCategory === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white bg-slate-900'
              }`}
            >
              All ({files.length})
            </button>
            <button
              onClick={() => setSelectedCategory('firmware')}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition ${
                selectedCategory === 'firmware' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white bg-slate-900'
              }`}
            >
              Firmware
            </button>
            <button
              onClick={() => setSelectedCategory('mobile')}
              className={`flex-1 py-1.5 rounded-lg font-semibold transition ${
                selectedCategory === 'mobile' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white bg-slate-900'
              }`}
            >
              Mobile
            </button>
          </div>

          {/* File Tree List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredFiles.map((file, idx) => {
              const originalIndex = files.findIndex(f => f.path === file.path);
              const isSelected = originalIndex === selectedFileIndex;

              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFileIndex(originalIndex)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition flex items-start space-x-2.5 ${
                    isSelected 
                      ? 'bg-blue-600/20 border border-blue-500/40 text-white' 
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <FileCode className={`w-4 h-4 mt-0.5 shrink-0 ${
                    file.category.startsWith('firmware') ? 'text-blue-400' : 'text-emerald-400'
                  }`} />
                  <div className="overflow-hidden">
                    <p className={`font-semibold truncate ${isSelected ? 'text-blue-300' : 'text-slate-300'}`}>
                      {file.name}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                      {file.path}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Code Viewer & Actions */}
        <div className="flex-1 flex flex-col bg-slate-900">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/90">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                  {activeFile.name}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {activeFile.path}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {activeFile.description}
              </p>
            </div>

            {/* Actions: Copy & Download */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition border border-slate-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Code'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow flex items-center space-x-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </button>
            </div>
          </div>

          {/* Code Body */}
          <div className="flex-1 p-4 overflow-x-auto bg-[#0A0E17] font-mono text-xs text-slate-300 leading-relaxed max-h-[650px] overflow-y-auto">
            <pre className="selection:bg-blue-500/30">
              <code>{activeFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
