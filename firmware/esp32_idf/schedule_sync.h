/**
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
#endif
