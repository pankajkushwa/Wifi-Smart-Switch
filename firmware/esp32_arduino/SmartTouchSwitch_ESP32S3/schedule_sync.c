/**
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

    char id_buf[24] = {0};
    uint32_t incoming_ver = 0;
    int hour = 0, min = 0;

    const char *id_ptr = strstr(json_str, "\"automationId\":\"");
    if (id_ptr) {
        sscanf(id_ptr + 16, "%23[^\"]", id_buf);
    }

    const char *ver_ptr = strstr(json_str, "\"version\":");
    if (ver_ptr) {
        incoming_ver = (uint32_t)atoi(ver_ptr + 10);
    }

    const char *time_ptr = strstr(json_str, "\"time\":\"");
    if (time_ptr) {
        sscanf(time_ptr + 8, "%d:%d", &hour, &min);
    }

    if (id_buf[0] == '\0' || incoming_ver == 0) return false;

    /* Check local version: Monotonic version validation */
    int existing_idx = -1;
    for (int i = 0; i < s_rec_count; i++) {
        if (strcmp(s_records[i].auto_id, id_buf) == 0) {
            existing_idx = i;
            if (incoming_ver <= s_records[i].version) {
                return false; /* Reject older or equal version */
            }
            break;
        }
    }

    int target_idx = existing_idx;
    if (target_idx < 0) {
        if (s_rec_count >= MAX_SCHEDULES) return false;
        target_idx = s_rec_count++;
    }

    schedule_record_t *r = &s_records[target_idx];
    memset(r, 0, sizeof(schedule_record_t));
    strncpy(r->auto_id, id_buf, sizeof(r->auto_id) - 1);
    r->version = incoming_ver;
    r->enabled = true;
    r->hour = (uint8_t)hour;
    r->minute = (uint8_t)min;
    r->days_mask = 0x7F; /* All week default */

    /* Look for actions targeted to my serial */
    char search_pattern[64];
    snprintf(search_pattern, sizeof(search_pattern), "\"deviceId\":\"%s\"", my_device_serial);
    const char *p = strstr(json_str, search_pattern);
    while (p && r->action_count < MAX_ACTIONS) {
        const char *relay_ptr = strstr(p, "\"relay\":");
        const char *act_ptr = strstr(p, "\"action\":\"");
        if (relay_ptr && act_ptr) {
            int relay_num = atoi(relay_ptr + 8);
            bool is_on = (strncmp(act_ptr + 10, "ON", 2) == 0);
            r->actions[r->action_count].gang_id = (uint8_t)relay_num;
            r->actions[r->action_count].turn_on = is_on;
            r->action_count++;
        }
        p = strstr(p + 10, search_pattern);
    }

    return true;
}

void arduino_schedule_check_tick(uint8_t current_hour, uint8_t current_minute, uint8_t current_day_mask) {
    for (int i = 0; i < s_rec_count; i++) {
        schedule_record_t *r = &s_records[i];
        if (!r->enabled) continue;
        if ((r->days_mask & current_day_mask) == 0) continue;
        if (r->hour == current_hour && r->minute == current_minute) {
            for (int a = 0; a < r->action_count; a++) {
                arduino_relay_set(r->actions[a].gang_id, r->actions[a].turn_on);
            }
        }
    }
}
