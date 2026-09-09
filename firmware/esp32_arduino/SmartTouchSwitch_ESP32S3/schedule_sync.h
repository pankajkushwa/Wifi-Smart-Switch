/**
 * @file schedule_sync.h
 * @brief Multi-Device Offline Scheduling Subsystem for Arduino ESP32
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>
#include <time.h>

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
#endif
