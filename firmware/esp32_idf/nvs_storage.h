/**
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
esp_err_t nvs_storage_save_wifi_creds(const char *ssid, const char *pass);
esp_err_t nvs_storage_load_wifi_creds(char *ssid_buf, size_t ssid_len, char *pass_buf, size_t pass_len);

#ifdef __cplusplus
}
#endif
