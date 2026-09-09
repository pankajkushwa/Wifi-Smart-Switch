/**
 * @file nvs_storage.c
 * @brief Non-Volatile Storage Manager Implementation for ESP-IDF
 */

#include "nvs_storage.h"
#include <stdio.h>
#include <string.h>
#include "esp_log.h"
#include "nvs_flash.h"
#include "nvs.h"

static const char *TAG = "NVS_STORAGE";
static const char *NVS_NAMESPACE = "switch_cfg";

esp_err_t nvs_storage_init(void) {
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_LOGI(TAG, "NVS Storage initialized successfully.");
    return ret;
}

esp_err_t nvs_storage_save_relay_state(uint8_t gang_id, uint8_t state) {
    nvs_handle_t h;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READWRITE, &h);
    if (err != ESP_OK) return err;

    char key[16];
    snprintf(key, sizeof(key), "state_%d", gang_id);
    err = nvs_set_u8(h, key, state);
    if (err == ESP_OK) {
        err = nvs_commit(h);
    }
    nvs_close(h);
    return err;
}

esp_err_t nvs_storage_load_relay_state(uint8_t gang_id, uint8_t *out_state) {
    if (!out_state) return ESP_ERR_INVALID_ARG;
    nvs_handle_t h;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READONLY, &h);
    if (err != ESP_OK) return err;

    char key[16];
    snprintf(key, sizeof(key), "state_%d", gang_id);
    err = nvs_get_u8(h, key, out_state);
    nvs_close(h);
    return err;
}

esp_err_t nvs_storage_save_wifi_creds(const char *ssid, const char *pass) {
    if (!ssid || !pass) return ESP_ERR_INVALID_ARG;
    nvs_handle_t h;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READWRITE, &h);
    if (err != ESP_OK) return err;

    nvs_set_str(h, "wifi_ssid", ssid);
    nvs_set_str(h, "wifi_pass", pass);
    err = nvs_commit(h);
    nvs_close(h);
    return err;
}

esp_err_t nvs_storage_load_wifi_creds(char *ssid_buf, size_t ssid_len, char *pass_buf, size_t pass_len) {
    nvs_handle_t h;
    esp_err_t err = nvs_open(NVS_NAMESPACE, NVS_READONLY, &h);
    if (err != ESP_OK) return err;

    nvs_get_str(h, "wifi_ssid", ssid_buf, &ssid_len);
    nvs_get_str(h, "wifi_pass", pass_buf, &pass_len);
    nvs_close(h);
    return ESP_OK;
}
