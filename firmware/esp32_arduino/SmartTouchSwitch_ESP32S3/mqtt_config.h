/**
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
#endif
