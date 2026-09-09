/**
 * @file mqtt_config.h
 * @brief ESP32-S3 MQTT Broker & Network Configuration Settings
 *
 * =========================================================================
 * HOW TO ENTER YOUR BROKER DETAILS TO COMMUNICATE WITH MQTT:
 * =========================================================================
 * 1. Set your Wi-Fi SSID & Password below in CONFIG_WIFI_SSID and CONFIG_WIFI_PASSWORD.
 * 2. Set your MQTT Broker details in CONFIG_MQTT_BROKER_URI (or HOST & PORT).
 *    Popular Examples:
 *      - Public HiveMQ Cloud: "mqtt://broker.hivemq.com:1883"
 *      - Public EMQX Broker:  "mqtt://broker.emqx.io:1883"
 *      - Home Assistant / Mosquitto on local LAN: "mqtt://192.168.1.100:1883"
 *      - Secure MQTTS (TLS/SSL): "mqtts://your-broker-domain:8883"
 * 3. Enter Username & Password if your broker requires authentication (otherwise leave empty "").
 * 4. Build and flash the firmware using `idf.py build flash monitor`.
 * =========================================================================
 */

#pragma once

#ifdef __cplusplus
extern "C" {
#endif

/* -------------------------------------------------------------------------
 * 1. WI-FI STATION CREDENTIALS
 * ------------------------------------------------------------------------- */
#define CONFIG_WIFI_SSID             "Home_Fiber_2.4G"
#define CONFIG_WIFI_PASSWORD         "HomePassword123"

/* -------------------------------------------------------------------------
 * 2. MQTT BROKER CONNECTION DETAILS
 * ------------------------------------------------------------------------- */
/**
 * Primary MQTT Broker URI format:
 *   "mqtt://<hostname_or_ip>:<port>"    (Plaintext, default port 1883)
 *   "mqtts://<hostname_or_ip>:<port>"   (TLS/SSL encrypted, default port 8883)
 */
#define CONFIG_MQTT_BROKER_URI       "mqtt://broker.hivemq.com:1883"

/** Individual host and port options (used if parsing from separate fields) */
#define CONFIG_MQTT_BROKER_HOST      "broker.hivemq.com"
#define CONFIG_MQTT_BROKER_PORT      1883

/* -------------------------------------------------------------------------
 * 3. MQTT AUTHENTICATION (Optional)
 * Leave empty "" if your broker does not require authentication
 * ------------------------------------------------------------------------- */
#define CONFIG_MQTT_USERNAME         ""
#define CONFIG_MQTT_PASSWORD         ""

/* -------------------------------------------------------------------------
 * 4. MQTT CLIENT & TOPIC CONFIGURATION
 * ------------------------------------------------------------------------- */
/** Client ID: leave empty "" to auto-generate unique ID from ESP32 MAC address */
#define CONFIG_MQTT_CLIENT_ID        "ESP32S3_SmartSwitch_01"

/** Base topic namespace: Topics will be formed as:
 *  Command subscribe:   cmnd/<serial_no>/POWER<gang>
 *  State telemetry:     stat/<serial_no>/POWER<gang>
 *  Schedule sync:       cmnd/<serial_no>/SCHEDULE_SYNC
 */
#define CONFIG_MQTT_TOPIC_PREFIX     "smartswitch"

/** MQTT Keepalive in seconds (standard is 60s) */
#define CONFIG_MQTT_KEEPALIVE_SEC    60

#ifdef __cplusplus
}
#endif
