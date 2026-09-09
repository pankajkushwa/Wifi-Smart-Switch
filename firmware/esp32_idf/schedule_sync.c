/**
 * @file schedule_sync.c
 * @brief Multi-Device Offline Scheduling Subsystem Implementation (ESP-IDF)
 */

#include "schedule_sync.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
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

static schedule_day_mask_t parse_day_string(const char *day) {
    if (strcasecmp(day, "Sun") == 0) return SCHEDULE_DAY_SUN;
    if (strcasecmp(day, "Mon") == 0) return SCHEDULE_DAY_MON;
    if (strcasecmp(day, "Tue") == 0) return SCHEDULE_DAY_TUE;
    if (strcasecmp(day, "Wed") == 0) return SCHEDULE_DAY_WED;
    if (strcasecmp(day, "Thu") == 0) return SCHEDULE_DAY_THU;
    if (strcasecmp(day, "Fri") == 0) return SCHEDULE_DAY_FRI;
    if (strcasecmp(day, "Sat") == 0) return SCHEDULE_DAY_SAT;
    return 0;
}

static esp_err_t save_automations_to_nvs(void) {
    nvs_handle_t nvs_handle;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READWRITE, &nvs_handle);
    if (err != ESP_OK) return err;

    err = nvs_set_u8(nvs_handle, "sched_count", s_automation_count);
    if (err == ESP_OK && s_automation_count > 0) {
        err = nvs_set_blob(nvs_handle, "sched_data", s_automations, sizeof(schedule_entry_t) * s_automation_count);
    }
    if (err == ESP_OK) {
        err = nvs_commit(nvs_handle);
    }
    nvs_close(nvs_handle);
    return err;
}

static esp_err_t load_automations_from_nvs(void) {
    nvs_handle_t nvs_handle;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READONLY, &nvs_handle);
    if (err != ESP_OK) return ESP_OK;

    uint8_t count = 0;
    err = nvs_get_u8(nvs_handle, "sched_count", &count);
    if (err != ESP_OK || count == 0) {
        nvs_close(nvs_handle);
        return ESP_OK;
    }
    if (count > SCHEDULE_MAX_AUTOMATIONS) count = SCHEDULE_MAX_AUTOMATIONS;

    size_t required_size = sizeof(schedule_entry_t) * count;
    err = nvs_get_blob(nvs_handle, "sched_data", s_automations, &required_size);
    if (err == ESP_OK) {
        s_automation_count = count;
        ESP_LOGI(TAG, "Restored %d multi-device automations from NVS flash.", s_automation_count);
    }
    nvs_close(nvs_handle);
    return err;
}

esp_err_t schedule_sync_init(void) {
    if (!s_sched_mutex) {
        s_sched_mutex = xSemaphoreCreateMutex();
        if (!s_sched_mutex) return ESP_ERR_NO_MEM;
    }
    xSemaphoreTake(s_sched_mutex, portMAX_DELAY);
    s_automation_count = 0;
    memset(s_automations, 0, sizeof(s_automations));
    load_automations_from_nvs();
    xSemaphoreGive(s_sched_mutex);
    return ESP_OK;
}

uint32_t schedule_sync_get_version(const char *automation_id) {
    if (!automation_id || !s_sched_mutex) return 0;
    uint32_t ver = 0;
    xSemaphoreTake(s_sched_mutex, portMAX_DELAY);
    for (int i = 0; i < s_automation_count; i++) {
        if (strcmp(s_automations[i].automation_id, automation_id) == 0) {
            ver = s_automations[i].version;
            break;
        }
    }
    xSemaphoreGive(s_sched_mutex);
    return ver;
}

esp_err_t schedule_sync_process_mqtt_payload(const char *json_payload, const char *my_device_id) {
    if (!json_payload || !my_device_id) return ESP_ERR_INVALID_ARG;

    cJSON *root = cJSON_Parse(json_payload);
    if (!root) return ESP_ERR_INVALID_ARG;

    cJSON *item_id = cJSON_GetObjectItem(root, "automationId");
    cJSON *item_ver = cJSON_GetObjectItem(root, "version");
    cJSON *item_name = cJSON_GetObjectItem(root, "name");
    cJSON *item_en = cJSON_GetObjectItem(root, "enabled");
    cJSON *item_time = cJSON_GetObjectItem(root, "time");
    cJSON *item_days = cJSON_GetObjectItem(root, "days");
    cJSON *item_actions = cJSON_GetObjectItem(root, "actions");

    if (!cJSON_IsString(item_id) || !cJSON_IsNumber(item_ver) || !cJSON_IsString(item_time) || !cJSON_IsArray(item_actions)) {
        cJSON_Delete(root);
        return ESP_ERR_INVALID_ARG;
    }

    const char *auto_id = item_id->valuestring;
    uint32_t incoming_ver = (uint32_t)item_ver->valueint;

    xSemaphoreTake(s_sched_mutex, portMAX_DELAY);

    /* Check existing version - Reject if <= local */
    int existing_idx = -1;
    for (int i = 0; i < s_automation_count; i++) {
        if (strcmp(s_automations[i].automation_id, auto_id) == 0) {
            existing_idx = i;
            if (incoming_ver <= s_automations[i].version) {
                ESP_LOGW(TAG, "Rejected [%s]: incoming v%lu <= local v%lu", auto_id, incoming_ver, s_automations[i].version);
                xSemaphoreGive(s_sched_mutex);
                cJSON_Delete(root);
                return ESP_ERR_INVALID_VERSION;
            }
            break;
        }
    }

    int hour = 0, minute = 0;
    if (sscanf(item_time->valuestring, "%d:%d", &hour, &minute) != 2) {
        xSemaphoreGive(s_sched_mutex);
        cJSON_Delete(root);
        return ESP_ERR_INVALID_ARG;
    }

    schedule_day_mask_t day_mask = 0;
    if (cJSON_IsArray(item_days)) {
        int day_count = cJSON_GetArraySize(item_days);
        for (int d = 0; d < day_count; d++) {
            cJSON *d_item = cJSON_GetArrayItem(item_days, d);
            if (cJSON_IsString(d_item)) day_mask |= parse_day_string(d_item->valuestring);
        }
    } else {
        day_mask = SCHEDULE_DAY_ALL_WEEK;
    }

    /* Extract actions targeted to THIS specific device */
    schedule_relay_action_t local_actions[SCHEDULE_MAX_ACTIONS_PER_DEV];
    uint8_t local_action_count = 0;
    int total_actions = cJSON_GetArraySize(item_actions);

    for (int a = 0; a < total_actions; a++) {
        cJSON *act_item = cJSON_GetArrayItem(item_actions, a);
        if (!cJSON_IsObject(act_item)) continue;
        cJSON *dev_id_item = cJSON_GetObjectItem(act_item, "deviceId");
        cJSON *relay_item = cJSON_GetObjectItem(act_item, "relay");
        cJSON *action_item = cJSON_GetObjectItem(act_item, "action");

        if (cJSON_IsString(dev_id_item) && cJSON_IsNumber(relay_item) && cJSON_IsString(action_item)) {
            if (strcmp(dev_id_item->valuestring, my_device_id) == 0) {
                if (local_action_count < SCHEDULE_MAX_ACTIONS_PER_DEV) {
                    local_actions[local_action_count].gang_id = (uint8_t)relay_item->valueint;
                    local_actions[local_action_count].action = (strcmp(action_item->valuestring, "ON") == 0) ? SCHEDULE_ACTION_ON : SCHEDULE_ACTION_OFF;
                    local_action_count++;
                }
            }
        }
    }

    if (local_action_count == 0) {
        if (existing_idx >= 0) {
            for (int i = existing_idx; i < s_automation_count - 1; i++) {
                s_automations[i] = s_automations[i + 1];
            }
            s_automation_count--;
            save_automations_to_nvs();
        }
        xSemaphoreGive(s_sched_mutex);
        cJSON_Delete(root);
        return ESP_OK;
    }

    int target_idx = existing_idx;
    if (target_idx < 0) {
        if (s_automation_count >= SCHEDULE_MAX_AUTOMATIONS) {
            xSemaphoreGive(s_sched_mutex);
            cJSON_Delete(root);
            return ESP_ERR_NO_MEM;
        }
        target_idx = s_automation_count++;
    }

    schedule_entry_t *entry = &s_automations[target_idx];
    memset(entry, 0, sizeof(schedule_entry_t));
    strncpy(entry->automation_id, auto_id, sizeof(entry->automation_id) - 1);
    if (cJSON_IsString(item_name)) {
        strncpy(entry->name, item_name->valuestring, sizeof(entry->name) - 1);
    }
    entry->version = incoming_ver;
    entry->enabled = cJSON_IsBool(item_en) ? cJSON_IsTrue(item_en) : true;
    entry->hour = (uint8_t)hour;
    entry->minute = (uint8_t)minute;
    entry->days = day_mask;
    entry->action_count = local_action_count;
    memcpy(entry->actions, local_actions, sizeof(schedule_relay_action_t) * local_action_count);

    save_automations_to_nvs();
    xSemaphoreGive(s_sched_mutex);
    cJSON_Delete(root);

    ESP_LOGI(TAG, "Synchronized schedule [%s] v%lu locally.", auto_id, incoming_ver);
    return ESP_OK;
}

void schedule_sync_minute_tick(const struct tm *timeinfo) {
    if (!timeinfo || !s_sched_mutex) return;

    xSemaphoreTake(s_sched_mutex, portMAX_DELAY);
    uint8_t current_hour = (uint8_t)timeinfo->tm_hour;
    uint8_t current_min = (uint8_t)timeinfo->tm_min;
    schedule_day_mask_t current_day = (1 << timeinfo->tm_wday);

    for (int i = 0; i < s_automation_count; i++) {
        schedule_entry_t *entry = &s_automations[i];
        if (!entry->enabled) continue;
        if ((entry->days & current_day) == 0) continue;
        if (entry->hour != current_hour || entry->minute != current_min) continue;

        ESP_LOGI(TAG, "OFFLINE SCHED TRIGGER: [%s] \"%s\" @ %02d:%02d",
                 entry->automation_id, entry->name, current_hour, current_min);

        for (int a = 0; a < entry->action_count; a++) {
            relay_set_state(entry->actions[a].gang_id,
                            (entry->actions[a].action == SCHEDULE_ACTION_ON) ? RELAY_STATE_ON : RELAY_STATE_OFF);
        }
    }
    xSemaphoreGive(s_sched_mutex);
}

esp_err_t schedule_sync_delete(const char *automation_id) {
    if (!automation_id || !s_sched_mutex) return ESP_ERR_INVALID_ARG;
    esp_err_t ret = ESP_ERR_NOT_FOUND;
    xSemaphoreTake(s_sched_mutex, portMAX_DELAY);
    for (int i = 0; i < s_automation_count; i++) {
        if (strcmp(s_automations[i].automation_id, automation_id) == 0) {
            for (int j = i; j < s_automation_count - 1; j++) {
                s_automations[j] = s_automations[j + 1];
            }
            s_automation_count--;
            save_automations_to_nvs();
            ret = ESP_OK;
            break;
        }
    }
    xSemaphoreGive(s_sched_mutex);
    return ret;
}
