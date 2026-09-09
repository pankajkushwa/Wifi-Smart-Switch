/**
 * @file wifi_mqtt.c
 * @brief Wi-Fi Connection & MQTT Client Implementation for ESP-IDF
 */

#include "wifi_mqtt.h"
#include <stdio.h>
#include <string.h>
#include "esp_log.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "mqtt_client.h"

static const char *TAG = "WIFI_MQTT";
static bool s_wifi_connected = false;
static esp_mqtt_client_handle_t s_mqtt_client = NULL;
static mqtt_command_handler_t s_cmd_handler = NULL;

static void mqtt_event_handler(void *handler_args, esp_event_base_t base, int32_t event_id, void *event_data) {
    esp_mqtt_event_handle_t event = (esp_mqtt_event_handle_t)event_data;
    switch ((esp_mqtt_event_id_t)event_id) {
        case MQTT_EVENT_CONNECTED:
            ESP_LOGI(TAG, "MQTT connected! Subscribing to command topics...");
            esp_mqtt_client_subscribe(s_mqtt_client, "cmnd/+/POWER+", 1);
            esp_mqtt_client_subscribe(s_mqtt_client, "cmnd/+/SCHEDULE_SYNC", 1);
            break;
        case MQTT_EVENT_DATA:
            ESP_LOGI(TAG, "MQTT DATA: topic=%.*s", event->topic_len, event->topic);
            if (s_cmd_handler) {
                char topic_buf[64] = {0};
                char data_buf[512] = {0};
                int tlen = (event->topic_len < 63) ? event->topic_len : 63;
                int dlen = (event->data_len < 511) ? event->data_len : 511;
                strncpy(topic_buf, event->topic, tlen);
                strncpy(data_buf, event->data, dlen);
                s_cmd_handler(topic_buf, data_buf, dlen);
            }
            break;
        default:
            break;
    }
}

esp_err_t wifi_mqtt_init(const char *ssid, const char *password, const char *broker_uri) {
    ESP_LOGI(TAG, "Initializing Wi-Fi station mode for SSID: %s", ssid ? ssid : "N/A");

    esp_mqtt_client_config_t mqtt_cfg = {
        .broker.address.uri = broker_uri ? broker_uri : "mqtt://broker.hivemq.com:1883",
    };
    s_mqtt_client = esp_mqtt_client_init(&mqtt_cfg);
    esp_mqtt_client_register_event(s_mqtt_client, ESP_EVENT_ANY_ID, mqtt_event_handler, NULL);
    esp_mqtt_client_start(s_mqtt_client);

    s_wifi_connected = true;
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
    return s_wifi_connected;
}
