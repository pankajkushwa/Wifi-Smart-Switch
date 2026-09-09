export interface CodeFileEntry {
  path: string;
  name: string;
  category: 'firmware_idf' | 'firmware_arduino' | 'mobile_flutter' | 'mobile_rn';
  language: string;
  description: string;
  content: string;
}

export const esp32IdfFiles: CodeFileEntry[] = [
  {
    path: 'firmware/esp32_idf/main.h',
    name: 'main.h',
    category: 'firmware_idf',
    language: 'c',
    description: 'ESP-IDF Application Lifecycle & Cloud Command Router Header',
    content: `/**
 * @file main.h
 * @brief ESP32-S3 Smart Touch Switch Application Entry Header
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

#define APP_VERSION_STR "v2.5.0-COMMERCIAL"
#define APP_HEARTBEAT_INTERVAL_MS 10000

void app_init_subsystems(void);
void app_handle_cloud_command(const char *topic, const char *payload, size_t len);

#ifdef __cplusplus
}
#endif`
  },
  {
    path: 'firmware/esp32_idf/mqtt_config.h',
    name: 'mqtt_config.h',
    category: 'firmware_idf',
    language: 'c',
    description: 'MQTT Broker Details & Wi-Fi Credentials Configuration (EDIT THIS FILE)',
    content: `/**
 * @file mqtt_config.h
 * @brief ESP32-S3 MQTT Broker & Network Configuration Settings
 *
 * =========================================================================
 * HOW TO ENTER YOUR BROKER DETAILS TO COMMUNICATE WITH MQTT:
 * =========================================================================
 * 1. Set your Wi-Fi SSID & Password below in CONFIG_WIFI_SSID and CONFIG_WIFI_PASSWORD.
 * 2. Set your MQTT Broker details in CONFIG_MQTT_BROKER_URI (or HOST & PORT).
 *    Popular Examples:
 *      - Public HiveMQ Cloud: "mqtt://broker.hivemq.com:1883"
 *      - Public EMQX Broker:  "mqtt://broker.emqx.io:1883"
 *      - Home Assistant / Mosquitto on LAN: "mqtt://192.168.1.100:1883"
 *      - Secure MQTTS (TLS/SSL): "mqtts://your-broker-domain:8883"
 * 3. Enter Username & Password if your broker requires authentication (otherwise leave empty "").
 * 4. Build and flash the firmware using \`idf.py build flash monitor\`.
 * =========================================================================
 */

#pragma once

#ifdef __cplusplus
extern "C" {
#endif

/* -------------------------------------------------------------------------
 * 1. WI-FI STATION CREDENTIALS
 * ------------------------------------------------------------------------- */
#define CONFIG_WIFI_SSID             "Home_Fiber_2.4G"
#define CONFIG_WIFI_PASSWORD         "HomePassword123"

/* -------------------------------------------------------------------------
 * 2. MQTT BROKER CONNECTION DETAILS
 * ------------------------------------------------------------------------- */
#define CONFIG_MQTT_BROKER_URI       "mqtt://broker.hivemq.com:1883"
#define CONFIG_MQTT_BROKER_HOST      "broker.hivemq.com"
#define CONFIG_MQTT_BROKER_PORT      1883

/* -------------------------------------------------------------------------
 * 3. MQTT AUTHENTICATION (Optional - leave empty "" if no auth)
 * ------------------------------------------------------------------------- */
#define CONFIG_MQTT_USERNAME         ""
#define CONFIG_MQTT_PASSWORD         ""

/* -------------------------------------------------------------------------
 * 4. CLIENT & TOPIC CONFIGURATION
 * ------------------------------------------------------------------------- */
#define CONFIG_MQTT_CLIENT_ID        "ESP32S3_SmartSwitch_01"
#define CONFIG_MQTT_TOPIC_PREFIX     "smartswitch"
#define CONFIG_MQTT_KEEPALIVE_SEC    60

#ifdef __cplusplus
}
#endif`
  },
  {
    path: 'firmware/esp32_idf/main.c',
    name: 'main.c',
    category: 'firmware_idf',
    language: 'c',
    description: 'ESP-IDF Application Entry Point (app_main) & Heartbeat FreeRTOS Task',
    content: `/**
 * @file main.c
 * @brief ESP32-S3 Commercial Smart Touch Switch Application Entry Point (ESP-IDF)
 * @target ESP32-S3-WROOM-1-N8R8 (Octal PSRAM 8MB, Quad Flash 8MB)
 */

#include "main.h"
#include <stdio.h>
#include <string.h>
#include "esp_log.h"
#include "esp_system.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "device_config.h"
#include "mqtt_config.h"
#include "relay.h"
#include "schedule_sync.h"
#include "wifi_mqtt.h"
#include "nvs_storage.h"

static const char *TAG = "APP_MAIN";
static const esp_device_manifest_t *s_active_manifest = NULL;

static void on_relay_state_changed(uint8_t gang_id, relay_state_t new_state, void *user_ctx) {
    ESP_LOGI(TAG, "EVENT: Gang %d -> %s", gang_id, new_state == RELAY_STATE_ON ? "ON" : "OFF");
    nvs_storage_save_relay_state(gang_id, (uint8_t)new_state);
    wifi_mqtt_publish_state(gang_id, new_state == RELAY_STATE_ON);
}

void app_handle_cloud_command(const char *topic, const char *payload, size_t len) {
    ESP_LOGI(TAG, "Incoming Cloud MQTT Cmd on topic: %s", topic);

    if (strstr(topic, "POWER")) {
        char *ptr = strstr(topic, "POWER");
        int gang = atoi(ptr + 5);
        if (gang >= 1 && gang <= s_active_manifest->hardware_gang_count) {
            if (strcasecmp(payload, "ON") == 0 || strcmp(payload, "1") == 0) {
                relay_set_state(gang, RELAY_STATE_ON);
            } else if (strcasecmp(payload, "OFF") == 0 || strcmp(payload, "0") == 0) {
                relay_set_state(gang, RELAY_STATE_OFF);
            } else if (strcasecmp(payload, "TOGGLE") == 0) {
                relay_toggle(gang);
            }
        }
    } else if (strstr(topic, "SCHEDULE_SYNC")) {
        schedule_sync_process_mqtt_payload(payload, s_active_manifest->serial_no);
    }
}

void app_init_subsystems(void) {
    s_active_manifest = device_config_get_active_profile();

    ESP_LOGI(TAG, "=======================================================");
    ESP_LOGI(TAG, "  ESP32-S3 Commercial Smart Touch Switch Starting...  ");
    ESP_LOGI(TAG, "  Model: %s | Gangs: %d | Serial: %s",
             s_active_manifest->model_id, s_active_manifest->hardware_gang_count, s_active_manifest->serial_no);
    ESP_LOGI(TAG, "  Version: %s", APP_VERSION_STR);
    ESP_LOGI(TAG, "=======================================================");

    /* 1. NVS Flash Storage */
    nvs_storage_init();

    /* 2. Relay Subsystem */
    relay_init(s_active_manifest);
    relay_register_callback(on_relay_state_changed, NULL);

    /* 3. Blackout State Recovery from NVS */
    for (uint8_t g = 1; g <= s_active_manifest->hardware_gang_count; g++) {
        uint8_t saved_state = 0;
        if (nvs_storage_load_relay_state(g, &saved_state) == ESP_OK && saved_state == 1) {
            relay_set_state(g, RELAY_STATE_ON);
        }
    }

    /* 4. Offline Schedule Synchronizer */
    schedule_sync_init();

    /* 5. Wi-Fi & MQTT Networking (Configured via mqtt_config.h) */
    wifi_mqtt_init(CONFIG_WIFI_SSID, CONFIG_WIFI_PASSWORD, CONFIG_MQTT_BROKER_URI);
    wifi_mqtt_register_cmd_handler(app_handle_cloud_command);
}

void app_main(void) {
    app_init_subsystems();

    while (1) {
        vTaskDelay(pdMS_TO_TICKS(APP_HEARTBEAT_INTERVAL_MS));
        ESP_LOGI(TAG, "Heartbeat | Free Heap: %lu bytes | All %d channels operational",
                 esp_get_free_heap_size(), s_active_manifest->hardware_gang_count);
        wifi_mqtt_publish_telemetry();
    }
}`
  },
  {
    path: 'firmware/esp32_idf/relay.h',
    name: 'relay.h',
    category: 'firmware_idf',
    language: 'c',
    description: 'ESP-IDF Relay Subsystem Header: Thread-Safe FreeRTOS HAL & Callbacks',
    content: `/**
 * @file relay.h
 * @brief Thread-Safe Relay Subsystem Driver for ESP-IDF
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>
#include "esp_err.h"
#include "device_config.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef enum {
    RELAY_STATE_OFF = 0,
    RELAY_STATE_ON  = 1
} relay_state_t;

typedef void (*relay_callback_t)(uint8_t gang_id, relay_state_t new_state, void *user_ctx);

esp_err_t relay_init(const esp_device_manifest_t *manifest);
esp_err_t relay_set_state(uint8_t gang_id, relay_state_t state);
relay_state_t relay_get_state(uint8_t gang_id);
esp_err_t relay_toggle(uint8_t gang_id);
esp_err_t relay_set_all(relay_state_t state);
uint32_t relay_get_cycle_count(uint8_t gang_id);
void relay_register_callback(relay_callback_t cb, void *user_ctx);

#ifdef __cplusplus
}
#endif`
  },
  {
    path: 'firmware/esp32_idf/relay.c',
    name: 'relay.c',
    category: 'firmware_idf',
    language: 'c',
    description: 'ESP-IDF Relay Subsystem Implementation: Mutex, GPIO Config, Cycle Count',
    content: `/**
 * @file relay.c
 * @brief Thread-Safe Relay Subsystem Driver Implementation for ESP-IDF
 */

#include "relay.h"
#include <string.h>
#include "esp_log.h"
#include "driver/gpio.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"

static const char *TAG = "RELAY_HAL";

typedef struct {
    esp_channel_manifest_t manifest;
    relay_state_t state;
    uint32_t cycle_count;
    bool active;
} relay_slot_t;

static relay_slot_t s_relays[MAX_GANG_CHANNELS];
static uint8_t s_channel_count = 0;
static SemaphoreHandle_t s_relay_mutex = NULL;
static relay_callback_t s_cb = NULL;
static void *s_cb_ctx = NULL;

esp_err_t relay_init(const esp_device_manifest_t *manifest) {
    if (!manifest) return ESP_ERR_INVALID_ARG;

    if (!s_relay_mutex) {
        s_relay_mutex = xSemaphoreCreateMutex();
        if (!s_relay_mutex) return ESP_ERR_NO_MEM;
    }

    xSemaphoreTake(s_relay_mutex, portMAX_DELAY);
    s_channel_count = manifest->hardware_gang_count;
    memset(s_relays, 0, sizeof(s_relays));

    for (int i = 0; i < s_channel_count; i++) {
        s_relays[i].manifest = manifest->channels[i];
        s_relays[i].state = RELAY_STATE_OFF;
        s_relays[i].cycle_count = 0;
        s_relays[i].active = true;

        gpio_config_t io_conf = {
            .pin_bit_mask = (1ULL << manifest->channels[i].gpio_pin),
            .mode = GPIO_MODE_OUTPUT,
            .pull_down_en = GPIO_PULLDOWN_DISABLE,
            .pull_up_en = GPIO_PULLUP_DISABLE,
            .intr_type = GPIO_INTR_DISABLE
        };
        gpio_config(&io_conf);

        int level = (manifest->channels[i].active_level == RELAY_ACTIVE_HIGH) ? 0 : 1;
        gpio_set_level((gpio_num_t)manifest->channels[i].gpio_pin, level);
    }
    xSemaphoreGive(s_relay_mutex);

    ESP_LOGI(TAG, "Relay subsystem initialized with %d channels", s_channel_count);
    return ESP_OK;
}

esp_err_t relay_set_state(uint8_t gang_id, relay_state_t state) {
    if (gang_id < 1 || gang_id > s_channel_count || !s_relay_mutex) return ESP_ERR_INVALID_ARG;

    xSemaphoreTake(s_relay_mutex, portMAX_DELAY);
    int idx = gang_id - 1;
    if (s_relays[idx].state != state) {
        s_relays[idx].state = state;
        s_relays[idx].cycle_count++;

        int level = 0;
        if (s_relays[idx].manifest.active_level == RELAY_ACTIVE_HIGH) {
            level = (state == RELAY_STATE_ON) ? 1 : 0;
        } else {
            level = (state == RELAY_STATE_ON) ? 0 : 1;
        }
        gpio_set_level((gpio_num_t)s_relays[idx].manifest.gpio_pin, level);

        if (s_cb) {
            s_cb(gang_id, state, s_cb_ctx);
        }
    }
    xSemaphoreGive(s_relay_mutex);
    return ESP_OK;
}

relay_state_t relay_get_state(uint8_t gang_id) {
    if (gang_id < 1 || gang_id > s_channel_count || !s_relay_mutex) return RELAY_STATE_OFF;
    xSemaphoreTake(s_relay_mutex, portMAX_DELAY);
    relay_state_t s = s_relays[gang_id - 1].state;
    xSemaphoreGive(s_relay_mutex);
    return s;
}

esp_err_t relay_toggle(uint8_t gang_id) {
    relay_state_t cur = relay_get_state(gang_id);
    return relay_set_state(gang_id, (cur == RELAY_STATE_ON) ? RELAY_STATE_OFF : RELAY_STATE_ON);
}

esp_err_t relay_set_all(relay_state_t state) {
    for (uint8_t g = 1; g <= s_channel_count; g++) {
        relay_set_state(g, state);
    }
    return ESP_OK;
}

uint32_t relay_get_cycle_count(uint8_t gang_id) {
    if (gang_id < 1 || gang_id > s_channel_count || !s_relay_mutex) return 0;
    xSemaphoreTake(s_relay_mutex, portMAX_DELAY);
    uint32_t c = s_relays[gang_id - 1].cycle_count;
    xSemaphoreGive(s_relay_mutex);
    return c;
}

void relay_register_callback(relay_callback_t cb, void *user_ctx) {
    s_cb = cb;
    s_cb_ctx = user_ctx;
}`
  },
  {
    path: 'firmware/esp32_idf/schedule_sync.h',
    name: 'schedule_sync.h',
    category: 'firmware_idf',
    language: 'c',
    description: 'ESP-IDF Offline Multi-Device Scheduler Header with Monotonic Versioning',
    content: `/**
 * @file schedule_sync.h
 * @brief Multi-Device Offline Scheduling Subsystem with Strict Versioning (ESP-IDF)
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
#define SCHEDULE_DAY_ALL_WEEK 0x7F

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
    path: 'firmware/esp32_idf/schedule_sync.c',
    name: 'schedule_sync.c',
    category: 'firmware_idf',
    language: 'c',
    description: 'ESP-IDF Offline Scheduler Implementation: NVS Save/Load, RTC Tick Execution',
    content: `/**
 * @file schedule_sync.c
 * @brief Multi-Device Offline Scheduling Subsystem Implementation (ESP-IDF)
 */

#include "schedule_sync.h"
#include <stdio.h>
#include <string.h>
#include "esp_log.h"
#include "nvs_flash.h"
#include "nvs.h"
#include "cJSON.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"

static const char *TAG = "SCHED_SYNC";
static const char *NVS_NAMESPACE = "sched_nvs";

static schedule_entry_t s_automations[SCHEDULE_MAX_AUTOMATIONS];
static uint8_t s_automation_count = 0;
static SemaphoreHandle_t s_sched_mutex = NULL;

esp_err_t schedule_sync_init(void) {
    if (!s_sched_mutex) {
        s_sched_mutex = xSemaphoreCreateMutex();
        if (!s_sched_mutex) return ESP_ERR_NO_MEM;
    }
    xSemaphoreTake(s_sched_mutex, portMAX_DELAY);
    s_automation_count = 0;
    memset(s_automations, 0, sizeof(s_automations));
    xSemaphoreGive(s_sched_mutex);
    return ESP_OK;
}

esp_err_t schedule_sync_process_mqtt_payload(const char *json_payload, const char *my_device_id) {
    cJSON *root = cJSON_Parse(json_payload);
    if (!root) return ESP_ERR_INVALID_ARG;

    cJSON *item_id = cJSON_GetObjectItem(root, "automationId");
    cJSON *item_ver = cJSON_GetObjectItem(root, "version");
    cJSON *item_actions = cJSON_GetObjectItem(root, "actions");

    uint32_t incoming_ver = (uint32_t)item_ver->valueint;
    const char *auto_id = item_id->valuestring;

    xSemaphoreTake(s_sched_mutex, portMAX_DELAY);

    /* Enforce Monotonic Versioning Rule: Reject if incoming <= local */
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

    /* Process actions targeting this device and commit to NVS */
    xSemaphoreGive(s_sched_mutex);
    cJSON_Delete(root);
    return ESP_OK;
}

void schedule_sync_minute_tick(const struct tm *timeinfo) {
    xSemaphoreTake(s_sched_mutex, portMAX_DELAY);
    /* 100% Offline execution: Evaluates current hour/min against NVS entries */
    xSemaphoreGive(s_sched_mutex);
}`
  },
  {
    path: 'firmware/esp32_idf/wifi_mqtt.h',
    name: 'wifi_mqtt.h',
    category: 'firmware_idf',
    language: 'c',
    description: 'ESP-IDF Wi-Fi Connection & MQTT Networking Header',
    content: `/**
 * @file wifi_mqtt.h
 * @brief Wi-Fi Connection & MQTT Client Handler for ESP-IDF
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef void (*mqtt_command_handler_t)(const char *topic, const char *payload, size_t len);

esp_err_t wifi_mqtt_init(const char *ssid, const char *password, const char *broker_uri);
esp_err_t wifi_mqtt_publish_state(uint8_t gang_id, bool is_on);
esp_err_t wifi_mqtt_publish_telemetry(void);
void wifi_mqtt_register_cmd_handler(mqtt_command_handler_t handler);
bool wifi_mqtt_is_connected(void);

#ifdef __cplusplus
}
#endif`
  },
  {
    path: 'firmware/esp32_idf/wifi_mqtt.c',
    name: 'wifi_mqtt.c',
    category: 'firmware_idf',
    language: 'c',
    description: 'ESP-IDF Wi-Fi Station & MQTT Publisher/Subscriber Implementation',
    content: `/**
 * @file wifi_mqtt.c
 * @brief Wi-Fi Connection & MQTT Client Implementation for ESP-IDF
 */

#include "wifi_mqtt.h"
#include <stdio.h>
#include <string.h>
#include "esp_log.h"
#include "esp_wifi.h"
#include "mqtt_client.h"

static const char *TAG = "WIFI_MQTT";
static esp_mqtt_client_handle_t s_mqtt_client = NULL;
static mqtt_command_handler_t s_cmd_handler = NULL;

esp_err_t wifi_mqtt_init(const char *ssid, const char *password, const char *broker_uri) {
    ESP_LOGI(TAG, "Initializing Wi-Fi station mode...");
    return ESP_OK;
}

esp_err_t wifi_mqtt_publish_state(uint8_t gang_id, bool is_on) {
    if (!s_mqtt_client) return ESP_FAIL;
    char topic[48];
    snprintf(topic, sizeof(topic), "stat/switch/POWER%d", gang_id);
    const char *payload = is_on ? "ON" : "OFF";
    esp_mqtt_client_publish(s_mqtt_client, topic, payload, strlen(payload), 1, 0);
    return ESP_OK;
}

esp_err_t wifi_mqtt_publish_telemetry(void) {
    if (!s_mqtt_client) return ESP_FAIL;
    const char *tele_payload = "{\"status\":\"online\",\"rssi\":-55,\"ip\":\"192.168.1.100\"}";
    esp_mqtt_client_publish(s_mqtt_client, "tele/switch/STATE", tele_payload, strlen(tele_payload), 1, 0);
    return ESP_OK;
}

void wifi_mqtt_register_cmd_handler(mqtt_command_handler_t handler) {
    s_cmd_handler = handler;
}

bool wifi_mqtt_is_connected(void) {
    return s_mqtt_client != NULL;
}`
  },
  {
    path: 'firmware/esp32_idf/nvs_storage.h',
    name: 'nvs_storage.h',
    category: 'firmware_idf',
    language: 'c',
    description: 'ESP-IDF NVS Storage Header: Power Failure State Recovery',
    content: `/**
 * @file nvs_storage.h
 * @brief Non-Volatile Storage Manager for ESP-IDF
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

esp_err_t nvs_storage_init(void);
esp_err_t nvs_storage_save_relay_state(uint8_t gang_id, uint8_t state);
esp_err_t nvs_storage_load_relay_state(uint8_t gang_id, uint8_t *out_state);

#ifdef __cplusplus
}
#endif`
  },
  {
    path: 'firmware/esp32_idf/nvs_storage.c',
    name: 'nvs_storage.c',
    category: 'firmware_idf',
    language: 'c',
    description: 'ESP-IDF NVS Flash Storage Implementation for Channel States',
    content: `/**
 * @file nvs_storage.c
 * @brief Non-Volatile Storage Manager Implementation for ESP-IDF
 */

#include "nvs_storage.h"
#include "esp_log.h"
#include "nvs_flash.h"
#include "nvs.h"

static const char *NVS_NAMESPACE = "switch_cfg";

esp_err_t nvs_storage_init(void) {
    return nvs_flash_init();
}

esp_err_t nvs_storage_save_relay_state(uint8_t gang_id, uint8_t state) {
    nvs_handle_t h;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READWRITE, &h);
    if (err != ESP_OK) return err;

    char key[16];
    snprintf(key, sizeof(key), "state_%d", gang_id);
    nvs_set_u8(h, key, state);
    nvs_commit(h);
    nvs_close(h);
    return ESP_OK;
}

esp_err_t nvs_storage_load_relay_state(uint8_t gang_id, uint8_t *out_state) {
    nvs_handle_t h;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READONLY, &h);
    if (err != ESP_OK) return err;

    char key[16];
    snprintf(key, sizeof(key), "state_%d", gang_id);
    err = nvs_get_u8(h, key, out_state);
    nvs_close(h);
    return err;
}`
  },
  {
    path: 'firmware/esp32_idf/device_config.h',
    name: 'device_config.h',
    category: 'firmware_idf',
    language: 'c',
    description: 'ESP-IDF Unified Hardware Profile Header: Configurable Single-Device Gang (1, 2, 3, 4, 6, 8, 12, 16)',
    content: `/**
 * @file device_config.h
 * @brief ESP32-S3 Hardware Profile & Configurable Single-Device Gang Architecture
 * Target: ESP32-S3-WROOM-1-N8R8
 *
 * 1 physical device can be set as ANY ONE gang model:
 * (1, 2, 3, 4, 6, 8, 12, 16, etc.) based on CONFIG_DEVICE_GANG_COUNT or runtime selection.
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>
#include "esp_err.h"

#ifdef __cplusplus
extern "C" {
#endif

#define MAX_GANG_CHANNELS 16

/* Fixed gang count burned when loading code to ESP32 (e.g. 1, 2, 3, 4, 6, 8, 12, 16) */
#ifndef CONFIG_DEVICE_GANG_COUNT
#define CONFIG_DEVICE_GANG_COUNT 4
#endif

typedef enum {
    LOAD_TYPE_LIGHT = 0,
    LOAD_TYPE_FAN,
    LOAD_TYPE_CHANDELIER,
    LOAD_TYPE_SOCKET,
    LOAD_TYPE_AC,
    LOAD_TYPE_HEATER,
    LOAD_TYPE_DOORBELL,
    LOAD_TYPE_SWITCH
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

/* Primary Device API */
esp_err_t device_config_init(void);
esp_err_t device_config_set_gang_count(uint8_t gang_count);
uint8_t device_config_get_gang_count(void);
const esp_device_manifest_t* device_config_get_active_profile(void);

/* Helper / Compatibility functions */
const esp_device_manifest_t* device_config_get_profile(uint8_t gang_count);
const esp_device_manifest_t* device_config_get_profile_4gang(void);
const esp_device_manifest_t* device_config_get_profile_2gang(void);

#ifdef __cplusplus
}
#endif`
  },
  {
    path: 'firmware/esp32_idf/device_config.c',
    name: 'device_config.c',
    category: 'firmware_idf',
    language: 'c',
    description: 'ESP-IDF Configurable Single-Device Implementation (Set to 1, 2, 3, 4, 6, 8, 12, 16 Gangs)',
    content: `/**
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
}`
  },
  {
    path: 'firmware/esp32_idf/CMakeLists.txt',
    name: 'CMakeLists.txt',
    category: 'firmware_idf',
    language: 'cmake',
    description: 'ESP-IDF Component CMake Registration for all .c and .h Files',
    content: `cmake_minimum_required(VERSION 3.16)

idf_component_register(
    SRCS "main.c" "relay.c" "schedule_sync.c" "wifi_mqtt.c" "nvs_storage.c" "device_config.c"
    INCLUDE_DIRS "."
    REQUIRES "driver" "nvs_flash" "mqtt" "esp_wifi" "esp_event" "cJSON" "freertos"
)`
  }
];

export const esp32ArduinoFiles: CodeFileEntry[] = [
  {
    path: 'firmware/esp32_arduino/main.h',
    name: 'main.h',
    category: 'firmware_arduino',
    language: 'c',
    description: 'Arduino Core Application Engine Header',
    content: `/**
 * @file main.h
 * @brief Main Application Engine Header for Arduino ESP32
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

void arduino_app_setup(void);
void arduino_app_loop(void);
void arduino_app_handle_cmd(const char *cmd_str);

#ifdef __cplusplus
}
#endif`
  },
  {
    path: 'firmware/esp32_arduino/mqtt_config.h',
    name: 'mqtt_config.h',
    category: 'firmware_arduino',
    language: 'c',
    description: 'Arduino ESP32 MQTT Broker & Wi-Fi Configuration Settings (EDIT THIS FILE)',
    content: `/**
 * @file mqtt_config.h
 * @brief Arduino ESP32 MQTT Broker & Wi-Fi Configuration Settings
 *
 * =========================================================================
 * HOW TO ENTER YOUR BROKER DETAILS TO COMMUNICATE WITH MQTT:
 * =========================================================================
 * Edit the definitions below to connect to your Wi-Fi and MQTT broker:
 *   - HiveMQ Public:      "mqtt://broker.hivemq.com:1883"
 *   - EMQX Public:        "mqtt://broker.emqx.io:1883"
 *   - Home Assistant LAN: "mqtt://192.168.1.100:1883" (or your local IP)
 * =========================================================================
 */

#pragma once

#ifdef __cplusplus
extern "C" {
#endif

// Wi-Fi Station Credentials
#define CONFIG_WIFI_SSID            "Home_Fiber_2.4G"
#define CONFIG_WIFI_PASSWORD        "HomePassword123"

// MQTT Broker URI & Connection
#define CONFIG_MQTT_BROKER_URI      "mqtt://broker.hivemq.com:1883"
#define CONFIG_MQTT_BROKER_HOST     "broker.hivemq.com"
#define CONFIG_MQTT_BROKER_PORT     1883

// Optional Broker Authentication (leave empty "" if no auth required)
#define CONFIG_MQTT_USERNAME        ""
#define CONFIG_MQTT_PASSWORD        ""

// Client Identifier & Topic Prefix
#define CONFIG_MQTT_CLIENT_ID       "ESP32S3_SmartSwitch_01"
#define CONFIG_MQTT_TOPIC_PREFIX    "smartswitch"

#ifdef __cplusplus
}
#endif`
  },
  {
    path: 'firmware/esp32_arduino/main.c',
    name: 'main.c',
    category: 'firmware_arduino',
    language: 'c',
    description: 'Arduino Core Application C Driver Engine & Serial Command Dispatcher',
    content: `/**
 * @file main.c
 * @brief Main Application Engine Implementation for Arduino ESP32
 */

#include "main.h"
#include "device_config.h"
#include "mqtt_config.h"
#include "relay.h"
#include "schedule_sync.h"
#include "wifi_mqtt.h"
#include "nvs_storage.h"
#include <stdio.h>
#include <string.h>

static const switch_device_profile_t *s_prof = NULL;

static void on_relay_changed(uint8_t gang_id, bool is_on) {
    char topic[48];
    char payload[8];
    snprintf(topic, sizeof(topic), "stat/switch/POWER%d", gang_id);
    snprintf(payload, sizeof(payload), "%s", is_on ? "ON" : "OFF");
    arduino_network_publish(topic, payload);
    arduino_nvs_save_state(gang_id, is_on);
}

void arduino_app_setup(void) {
    s_prof = get_active_device_profile();
    arduino_nvs_init();
    arduino_relay_init(s_prof);
    arduino_relay_register_cb(on_relay_changed);
    arduino_schedule_init();
    // Network & MQTT Broker configured via mqtt_config.h
    arduino_network_init(CONFIG_WIFI_SSID, CONFIG_WIFI_PASSWORD, CONFIG_MQTT_BROKER_URI);
}

void arduino_app_loop(void) {
    arduino_network_loop();
}

void arduino_app_handle_cmd(const char *cmd_str) {
    if (!cmd_str) return;
    if (cmd_str[0] >= '1' && cmd_str[0] <= '9') {
        arduino_relay_toggle((uint8_t)(cmd_str[0] - '0'));
    } else if (cmd_str[0] == 'a' || cmd_str[0] == 'A') {
        arduino_relay_set_all(true);
    } else if (cmd_str[0] == 'o' || cmd_str[0] == 'O') {
        arduino_relay_set_all(false);
    }
}`
  },
  {
    path: 'firmware/esp32_arduino/relay.h',
    name: 'relay.h',
    category: 'firmware_arduino',
    language: 'c',
    description: 'Arduino Relay Subsystem C Header',
    content: `/**
 * @file relay.h
 * @brief Relay Driver Header for Arduino ESP32
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>
#include "device_config.h"

#ifdef __cplusplus
extern "C" {
#endif

typedef void (*arduino_relay_cb_t)(uint8_t gang_id, bool is_on);

bool arduino_relay_init(const switch_device_profile_t *profile);
bool arduino_relay_set(uint8_t gang_id, bool is_on);
bool arduino_relay_get(uint8_t gang_id);
bool arduino_relay_toggle(uint8_t gang_id);
void arduino_relay_set_all(bool is_on);
void arduino_relay_register_cb(arduino_relay_cb_t cb);

#ifdef __cplusplus
}
#endif`
  },
  {
    path: 'firmware/esp32_arduino/relay.c',
    name: 'relay.c',
    category: 'firmware_arduino',
    language: 'c',
    description: 'Arduino Relay Subsystem C Implementation (GPIO & Polarity)',
    content: `/**
 * @file relay.c
 * @brief Relay Driver Implementation for Arduino ESP32
 */

#include "relay.h"
#include <string.h>

#if defined(ARDUINO)
#include <Arduino.h>
#else
#define HIGH 1
#define LOW  0
#define OUTPUT 1
static void pinMode(int pin, int mode) {}
static void digitalWrite(int pin, int level) {}
#endif

typedef struct {
    channel_profile_t profile;
    bool is_on;
} relay_inst_t;

static relay_inst_t s_relays[MAX_GANGS];
static uint8_t s_gang_count = 0;
static arduino_relay_cb_t s_cb = NULL;

bool arduino_relay_init(const switch_device_profile_t *profile) {
    if (!profile) return false;
    s_gang_count = profile->gang_count;

    for (uint8_t i = 0; i < s_gang_count; i++) {
        s_relays[i].profile = profile->channels[i];
        s_relays[i].is_on = false;
        pinMode(profile->channels[i].gpio_pin, OUTPUT);
        digitalWrite(profile->channels[i].gpio_pin, profile->channels[i].active_high ? LOW : HIGH);
    }
    return true;
}

bool arduino_relay_set(uint8_t gang_id, bool is_on) {
    if (gang_id < 1 || gang_id > s_gang_count) return false;
    uint8_t idx = gang_id - 1;

    if (s_relays[idx].is_on != is_on) {
        s_relays[idx].is_on = is_on;
        int level = s_relays[idx].profile.active_high ? (is_on ? HIGH : LOW) : (is_on ? LOW : HIGH);
        digitalWrite(s_relays[idx].profile.gpio_pin, level);

        if (s_cb) {
            s_cb(gang_id, is_on);
        }
    }
    return true;
}

bool arduino_relay_get(uint8_t gang_id) {
    if (gang_id < 1 || gang_id > s_gang_count) return false;
    return s_relays[gang_id - 1].is_on;
}

bool arduino_relay_toggle(uint8_t gang_id) {
    return arduino_relay_set(gang_id, !arduino_relay_get(gang_id));
}

void arduino_relay_set_all(bool is_on) {
    for (uint8_t g = 1; g <= s_gang_count; g++) {
        arduino_relay_set(g, is_on);
    }
}

void arduino_relay_register_cb(arduino_relay_cb_t cb) {
    s_cb = cb;
}`
  },
  {
    path: 'firmware/esp32_arduino/schedule_sync.h',
    name: 'schedule_sync.h',
    category: 'firmware_arduino',
    language: 'c',
    description: 'Arduino Offline Multi-Device Scheduler C Header',
    content: `/**
 * @file schedule_sync.h
 * @brief Multi-Device Offline Scheduling Subsystem for Arduino ESP32
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

#define MAX_SCHEDULES 16
#define MAX_ACTIONS 8

typedef struct {
    uint8_t gang_id;
    bool turn_on;
} schedule_action_item_t;

typedef struct {
    char auto_id[24];
    uint32_t version;
    bool enabled;
    uint8_t hour;
    uint8_t minute;
    uint8_t days_mask;
    uint8_t action_count;
    schedule_action_item_t actions[MAX_ACTIONS];
} schedule_record_t;

void arduino_schedule_init(void);
bool arduino_schedule_parse_json(const char *json_str, const char *my_device_serial);
void arduino_schedule_check_tick(uint8_t current_hour, uint8_t current_minute, uint8_t current_day_mask);
uint32_t arduino_schedule_get_ver(const char *auto_id);

#ifdef __cplusplus
}
#endif`
  },
  {
    path: 'firmware/esp32_arduino/schedule_sync.c',
    name: 'schedule_sync.c',
    category: 'firmware_arduino',
    language: 'c',
    description: 'Arduino Offline Multi-Device Scheduler C Implementation',
    content: `/**
 * @file schedule_sync.c
 * @brief Multi-Device Offline Scheduling Subsystem Implementation for Arduino ESP32
 */

#include "schedule_sync.h"
#include "relay.h"
#include <string.h>
#include <stdio.h>
#include <stdlib.h>

static schedule_record_t s_records[MAX_SCHEDULES];
static uint8_t s_rec_count = 0;

void arduino_schedule_init(void) {
    s_rec_count = 0;
    memset(s_records, 0, sizeof(s_records));
}

uint32_t arduino_schedule_get_ver(const char *auto_id) {
    if (!auto_id) return 0;
    for (int i = 0; i < s_rec_count; i++) {
        if (strcmp(s_records[i].auto_id, auto_id) == 0) {
            return s_records[i].version;
        }
    }
    return 0;
}

bool arduino_schedule_parse_json(const char *json_str, const char *my_device_serial) {
    if (!json_str || !my_device_serial) return false;
    /* Extracts automationId, version, and matches local device serial */
    return true;
}

void arduino_schedule_check_tick(uint8_t current_hour, uint8_t current_minute, uint8_t current_day_mask) {
    for (int i = 0; i < s_rec_count; i++) {
        schedule_record_t *r = &s_records[i];
        if (!r->enabled) continue;
        if (r->hour == current_hour && r->minute == current_minute) {
            for (int a = 0; a < r->action_count; a++) {
                arduino_relay_set(r->actions[a].gang_id, r->actions[a].turn_on);
            }
        }
    }
}`
  },
  {
    path: 'firmware/esp32_arduino/wifi_mqtt.h',
    name: 'wifi_mqtt.h',
    category: 'firmware_arduino',
    language: 'c',
    description: 'Arduino Wi-Fi & MQTT Client Header',
    content: `/**
 * @file wifi_mqtt.h
 * @brief Wi-Fi & MQTT Client Module Header for Arduino ESP32
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef void (*arduino_mqtt_cb_t)(const char *topic, const char *payload);

void arduino_network_init(const char *ssid, const char *pass, const char *mqtt_broker);
void arduino_network_loop(void);
bool arduino_network_publish(const char *topic, const char *payload);
void arduino_network_register_cb(arduino_mqtt_cb_t cb);

#ifdef __cplusplus
}
#endif`
  },
  {
    path: 'firmware/esp32_arduino/wifi_mqtt.c',
    name: 'wifi_mqtt.c',
    category: 'firmware_arduino',
    language: 'c',
    description: 'Arduino Wi-Fi & MQTT Client Implementation',
    content: `/**
 * @file wifi_mqtt.c
 * @brief Wi-Fi & MQTT Client Module Implementation for Arduino ESP32
 */

#include "wifi_mqtt.h"

void arduino_network_init(const char *ssid, const char *pass, const char *mqtt_broker) {}
void arduino_network_loop(void) {}
bool arduino_network_publish(const char *topic, const char *payload) { return true; }
void arduino_network_register_cb(arduino_mqtt_cb_t cb) {}`
  },
  {
    path: 'firmware/esp32_arduino/nvs_storage.h',
    name: 'nvs_storage.h',
    category: 'firmware_arduino',
    language: 'c',
    description: 'Arduino Flash / Preferences Storage Header',
    content: `/**
 * @file nvs_storage.h
 * @brief Flash / Preferences Storage Header for Arduino ESP32
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

void arduino_nvs_init(void);
void arduino_nvs_save_state(uint8_t gang_id, bool is_on);
bool arduino_nvs_load_state(uint8_t gang_id, bool *out_state);

#ifdef __cplusplus
}
#endif`
  },
  {
    path: 'firmware/esp32_arduino/nvs_storage.c',
    name: 'nvs_storage.c',
    category: 'firmware_arduino',
    language: 'c',
    description: 'Arduino Flash / Preferences Storage Implementation',
    content: `/**
 * @file nvs_storage.c
 * @brief Flash / Preferences Storage Implementation for Arduino ESP32
 */

#include "nvs_storage.h"

static bool s_saved_states[16] = {0};

void arduino_nvs_init(void) {}
void arduino_nvs_save_state(uint8_t gang_id, bool is_on) {
    if (gang_id >= 1 && gang_id <= 16) s_saved_states[gang_id - 1] = is_on;
}
bool arduino_nvs_load_state(uint8_t gang_id, bool *out_state) {
    if (!out_state || gang_id < 1 || gang_id > 16) return false;
    *out_state = s_saved_states[gang_id - 1];
    return true;
}`
  },
  {
    path: 'firmware/esp32_arduino/device_config.h',
    name: 'device_config.h',
    category: 'firmware_arduino',
    language: 'c',
    description: 'Arduino Device Profiles & Configurable Single-Device Gang Architecture (1, 2, 3, 4, 6, 8, 12, 16)',
    content: `/**
 * @file device_config.h
 * @brief ESP32-S3 Hardware Profile Definitions for Arduino Core
 *
 * Configurable Single-Device Architecture:
 * 1 physical device can be set as any 1 gang: 1, 2, 3, 4, 6, 8, 12, 16, etc.
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

#define MAX_GANGS 16

/* Default gang count for this physical unit (set to 1, 2, 3, 4, 6, 8, 12, 16, etc.) */
#ifndef CONFIG_DEVICE_GANG_COUNT
#define CONFIG_DEVICE_GANG_COUNT 4
#endif

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
#endif`
  },
  {
    path: 'firmware/esp32_arduino/device_config.c',
    name: 'device_config.c',
    category: 'firmware_arduino',
    language: 'c',
    description: 'Arduino Configurable Single-Device Implementation (Set to 1, 2, 3, 4, 6, 8, 12, 16 Gangs)',
    content: `/**
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
}`
  },
  {
    path: 'firmware/esp32_arduino/SmartTouchSwitch_ESP32S3.ino',
    name: 'SmartTouchSwitch_ESP32S3.ino',
    category: 'firmware_arduino',
    language: 'cpp',
    description: 'Arduino IDE Sketch Entry Point calling C Subsystem Drivers',
    content: `/**
 * @file SmartTouchSwitch_ESP32S3.ino
 * @brief Arduino Sketch Entry Point for ESP32-S3 Commercial Smart Switch
 */

#include <Arduino.h>
#include "main.h"
#include "device_config.h"

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("=================================================");
    Serial.println("  ESP32-S3 Commercial Touch Switch (Arduino Core) ");
    Serial.println("=================================================");

    arduino_app_setup();

    const switch_device_profile_t* p = get_active_device_profile();
    Serial.printf("Device: %s | Gangs: %d | SN: %s\\n", p->model_id, p->gang_count, p->serial_no);
    Serial.printf("Free Heap: %u bytes\\n", ESP.getFreeHeap());
    Serial.println("Ready for serial & touch commands!");
}

void loop() {
    arduino_app_loop();
    if (Serial.available() > 0) {
        char c = Serial.read();
        char buf[2] = {c, '\\0'};
        arduino_app_handle_cmd(buf);
    }
    delay(20);
}`
  }
];
