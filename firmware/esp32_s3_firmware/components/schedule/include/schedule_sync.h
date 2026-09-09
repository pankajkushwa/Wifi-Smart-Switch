/**
 * @file schedule_sync.h
 * @brief ESP32-S3 Multi-Device Offline Scheduling & Version Synchronizer
 * 
 * Implements Module 12: Offline Autonomous Scheduling Subsystem
 * - Multi-device synchronization via MQTT (HiveMQ / EMQX / AWS IoT)
 * - Strict Automation Versioning (rejects older or equal versions)
 * - NVS Flash persistence for 100% offline autonomous relay switching
 * - High precision FreeRTOS RTC minute tick evaluation
 * - Reconnection sync reconciliation and status telemetry reporting
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

/**
 * @brief Schedule Action Type
 */
typedef enum {
    SCHEDULE_ACTION_OFF = 0,
    SCHEDULE_ACTION_ON  = 1
} schedule_action_t;

/**
 * @brief Days of week bitmask
 * Bit 0 = Sunday (1 << 0)
 * Bit 1 = Monday (1 << 1)
 * ...
 * Bit 6 = Saturday (1 << 6)
 */
typedef uint8_t schedule_day_mask_t;

#define SCHEDULE_DAY_SUN (1 << 0)
#define SCHEDULE_DAY_MON (1 << 1)
#define SCHEDULE_DAY_TUE (1 << 2)
#define SCHEDULE_DAY_WED (1 << 3)
#define SCHEDULE_DAY_THU (1 << 4)
#define SCHEDULE_DAY_FRI (1 << 5)
#define SCHEDULE_DAY_SAT (1 << 6)
#define SCHEDULE_DAY_ALL_WEEK 0x7F

/**
 * @brief Action for a specific relay on this ESP32 device
 */
typedef struct {
    uint8_t gang_id;            /* Relay channel 1 to 16 */
    schedule_action_t action;   /* ON or OFF */
} schedule_relay_action_t;

/**
 * @brief Locally stored automation definition in NVS
 */
typedef struct {
    char automation_id[SCHEDULE_ID_MAX_LEN];
    char name[SCHEDULE_NAME_MAX_LEN];
    uint32_t version;           /* Monotonically increasing version */
    bool enabled;
    uint8_t hour;               /* 0 - 23 */
    uint8_t minute;             /* 0 - 59 */
    schedule_day_mask_t days;   /* Bitmask of active days */
    uint8_t action_count;
    schedule_relay_action_t actions[SCHEDULE_MAX_ACTIONS_PER_DEV];
} schedule_entry_t;

/**
 * @brief Telemetry status callback for schedule execution reporting
 */
typedef void (*schedule_telemetry_cb_t)(
    const char *automation_id,
    uint32_t version,
    uint8_t gang_id,
    schedule_action_t action,
    bool is_offline_executed,
    void *user_ctx
);

/**
 * @brief Initialize the Offline Scheduling Subsystem & Load Saved Automations from NVS
 * @return ESP_OK on success
 */
esp_err_t schedule_sync_init(void);

/**
 * @brief Process incoming MQTT schedule JSON payload
 *
 * Payload format expected:
 * {
 *   "automationId": "AUTO001",
 *   "version": 2,
 *   "name": "Evening Office Shutdown",
 *   "enabled": true,
 *   "time": "20:00",
 *   "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
 *   "actions": [
 *     {"deviceId": "DEV001", "relay": 1, "action": "OFF"},
 *     {"deviceId": "DEV001", "relay": 3, "action": "OFF"}
 *   ]
 * }
 *
 * Rules:
 * 1. Checks payload.version against locally stored version.
 * 2. If payload.version <= local_version, rejects with warning.
 * 3. Filters actions relevant ONLY to this device's serial/ID.
 * 4. Stores entry into NVS flash and commits.
 * 5. Returns sync confirmation.
 *
 * @param json_payload Null-terminated JSON string
 * @param my_device_id Unique ID or serial number of this ESP32
 * @return ESP_OK on success, ESP_ERR_INVALID_VERSION if outdated, or ESP_FAIL on parse error
 */
esp_err_t schedule_sync_process_mqtt_payload(const char *json_payload, const char *my_device_id);

/**
 * @brief Periodic Minute Tick - Called once every 60 seconds by RTC/SNTP Task
 * Evaluates all enabled local schedules against current system time.
 * Executes matching relays even if completely offline.
 *
 * @param timeinfo Pointer to current broken-down local time struct
 */
void schedule_sync_minute_tick(const struct tm *timeinfo);

/**
 * @brief Delete an automation from NVS and RAM
 * @param automation_id ID string of automation to delete
 * @return ESP_OK on success
 */
esp_err_t schedule_sync_delete(const char *automation_id);

/**
 * @brief Get local version for a given automation ID
 * @param automation_id Automation ID to query
 * @return Version number (0 if not found)
 */
uint32_t schedule_sync_get_version(const char *automation_id);

/**
 * @brief Register callback for schedule execution reporting (for MQTT status telemetry)
 */
void schedule_sync_register_telemetry_cb(schedule_telemetry_cb_t cb, void *user_ctx);

#ifdef __cplusplus
}
#endif
