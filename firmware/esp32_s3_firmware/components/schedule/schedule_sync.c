/**
 * @file schedule_sync.c
 * @brief ESP32-S3 Multi-Device Offline Scheduling & Version Synchronizer
 * 
 * Production Implementation conforming to ESP-IDF v5.2+ & FreeRTOS.
 */

#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include "esp_log.h"
#include "nvs_flash.h"
#include "nvs.h"
#include "cJSON.h"
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "schedule_sync.h"
#include "relay.h"

static const char *TAG = "SCHED_SYNC";
static const char *NVS_NAMESPACE = "sched_nvs";

static schedule_entry_t s_automations[SCHEDULE_MAX_AUTOMATIONS];
static uint8_t s_automation_count = 0;
static SemaphoreHandle_t s_sched_mutex = NULL;

static schedule_telemetry_cb_t s_telemetry_cb = NULL;
static void *s_telemetry_ctx = NULL;

/* Helper: parse day name into bitmask */
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

/* Helper: persist all in-RAM automations to NVS blob */
static esp_err_t save_automations_to_nvs(void) {
    nvs_handle_t nvs_handle;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READWRITE, &nvs_handle);
    if (err != ESP_OK) {
        ESP_LOGE(TAG, "Failed to open NVS namespace %s: %s", NVS_NAMESPACE, esp_err_to_name(err));
        return err;
    }

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

/* Helper: load automations from NVS blob on boot */
static esp_err_t load_automations_from_nvs(void) {
    nvs_handle_t nvs_handle;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READONLY, &nvs_handle);
    if (err != ESP_OK) {
        ESP_LOGI(TAG, "No existing schedule NVS table found (clean start)");
        return ESP_OK;
    }

    uint8_t count = 0;
    err = nvs_get_u8(nvs_handle, "sched_count", &count);
    if (err != ESP_OK || count == 0) {
        nvs_close(nvs_handle);
        return ESP_OK;
    }

    if (count > SCHEDULE_MAX_AUTOMATIONS) {
        count = SCHEDULE_MAX_AUTOMATIONS;
    }

    size_t required_size = sizeof(schedule_entry_t) * count;
    err = nvs_get_blob(nvs_handle, "sched_data", s_automations, &required_size);
    if (err == ESP_OK) {
        s_automation_count = count;
        ESP_LOGI(TAG, "Restored %d multi-device automations from NVS flash memory.", s_automation_count);
        for (int i = 0; i < s_automation_count; i++) {
            ESP_LOGI(TAG, " -> [%s] \"%s\" v%lu @ %02d:%02d (%d local actions)",
                     s_automations[i].automation_id,
                     s_automations[i].name,
                     s_automations[i].version,
                     s_automations[i].hour,
                     s_automations[i].minute,
                     s_automations[i].action_count);
        }
    }

    nvs_close(nvs_handle);
    return err;
}

esp_err_t schedule_sync_init(void) {
    ESP_LOGI(TAG, "Initializing Offline Schedule & Version Synchronizer...");

    if (!s_sched_mutex) {
        s_sched_mutex = xSemaphoreCreateMutex();
        if (!s_sched_mutex) {
            return ESP_ERR_NO_MEM;
        }
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
    if (!json_payload || !my_device_id) {
        return ESP_ERR_INVALID_ARG;
    }

    cJSON *root = cJSON_Parse(json_payload);
    if (!root) {
        ESP_LOGE(TAG, "JSON Parse Error on incoming schedule sync payload");
        return ESP_ERR_INVALID_ARG;
    }

    cJSON *item_id = cJSON_GetObjectItem(root, "automationId");
    cJSON *item_ver = cJSON_GetObjectItem(root, "version");
    cJSON *item_name = cJSON_GetObjectItem(root, "name");
    cJSON *item_en = cJSON_GetObjectItem(root, "enabled");
    cJSON *item_time = cJSON_GetObjectItem(root, "time");
    cJSON *item_days = cJSON_GetObjectItem(root, "days");
    cJSON *item_actions = cJSON_GetObjectItem(root, "actions");

    if (!cJSON_IsString(item_id) || !cJSON_IsNumber(item_ver) || !cJSON_IsString(item_time) || !cJSON_IsArray(item_actions)) {
        ESP_LOGE(TAG, "Malformed schedule JSON schema");
        cJSON_Delete(root);
        return ESP_ERR_INVALID_ARG;
    }

    const char *auto_id = item_id->valuestring;
    uint32_t incoming_ver = (uint32_t)item_ver->valueint;

    xSemaphoreTake(s_sched_mutex, portMAX_DELAY);

    /* 1. Check if existing version is higher or equal */
    int existing_idx = -1;
    for (int i = 0; i < s_automation_count; i++) {
        if (strcmp(s_automations[i].automation_id, auto_id) == 0) {
            existing_idx = i;
            if (incoming_ver <= s_automations[i].version) {
                ESP_LOGW(TAG, "REJECTING schedule [%s]: incoming v%lu <= local v%lu",
                         auto_id, incoming_ver, s_automations[i].version);
                xSemaphoreGive(s_sched_mutex);
                cJSON_Delete(root);
                return ESP_ERR_INVALID_VERSION;
            }
            break;
        }
    }

    /* 2. Parse time (HH:MM) */
    int hour = 0, minute = 0;
    if (sscanf(item_time->valuestring, "%d:%d", &hour, &minute) != 2) {
        ESP_LOGE(TAG, "Invalid time string: %s", item_time->valuestring);
        xSemaphoreGive(s_sched_mutex);
        cJSON_Delete(root);
        return ESP_ERR_INVALID_ARG;
    }

    /* 3. Parse days bitmask */
    schedule_day_mask_t day_mask = 0;
    if (cJSON_IsArray(item_days)) {
        int day_count = cJSON_GetArraySize(item_days);
        for (int d = 0; d < day_count; d++) {
            cJSON *d_item = cJSON_GetArrayItem(item_days, d);
            if (cJSON_IsString(d_item)) {
                day_mask |= parse_day_string(d_item->valuestring);
            }
        }
    } else {
        day_mask = SCHEDULE_DAY_ALL_WEEK;
    }

    /* 4. Filter actions targeted to THIS device ID or serial */
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

    /* If this device has no actions in this automation, and it previously existed, remove it */
    if (local_action_count == 0) {
        if (existing_idx >= 0) {
            for (int i = existing_idx; i < s_automation_count - 1; i++) {
                s_automations[i] = s_automations[i + 1];
            }
            s_automation_count--;
            save_automations_to_nvs();
            ESP_LOGI(TAG, "Removed automation [%s] as this device has no remaining actions", auto_id);
        }
        xSemaphoreGive(s_sched_mutex);
        cJSON_Delete(root);
        return ESP_OK;
    }

    /* Target slot in table */
    int target_idx = existing_idx;
    if (target_idx < 0) {
        if (s_automation_count >= SCHEDULE_MAX_AUTOMATIONS) {
            ESP_LOGE(TAG, "Schedule table full (max %d)", SCHEDULE_MAX_AUTOMATIONS);
            xSemaphoreGive(s_sched_mutex);
            cJSON_Delete(root);
            return ESP_ERR_NO_MEM;
        }
        target_idx = s_automation_count++;
    }

    /* Populate entry */
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

    /* Persist to NVS flash */
    esp_err_t nvs_err = save_automations_to_nvs();
    xSemaphoreGive(s_sched_mutex);

    cJSON_Delete(root);

    ESP_LOGI(TAG, "SUCCESS: Synchronized schedule [%s] (\"%s\") to Version %lu. NVS Commit: %s",
             auto_id, entry->name, incoming_ver, esp_err_to_name(nvs_err));
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

        /* Match found! Execute local relay actions */
        ESP_LOGI(TAG, ">>> TRIGGERING LOCAL SCHEDULE [%s] \"%s\" (v%lu) @ %02d:%02d <<<",
                 entry->automation_id, entry->name, entry->version, current_hour, current_min);

        for (int a = 0; a < entry->action_count; a++) {
            uint8_t gang = entry->actions[a].gang_id;
            relay_state_t target_state = (entry->actions[a].action == SCHEDULE_ACTION_ON) ? RELAY_STATE_ON : RELAY_STATE_OFF;

            relay_set_state(gang, target_state);

            if (s_telemetry_cb) {
                s_telemetry_cb(entry->automation_id, entry->version, gang, entry->actions[a].action, true, s_telemetry_ctx);
            }
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
            ESP_LOGI(TAG, "Deleted automation [%s] from NVS flash", automation_id);
            break;
        }
    }

    xSemaphoreGive(s_sched_mutex);
    return ret;
}

void schedule_sync_register_telemetry_cb(schedule_telemetry_cb_t cb, void *user_ctx) {
    s_telemetry_cb = cb;
    s_telemetry_ctx = user_ctx;
}
