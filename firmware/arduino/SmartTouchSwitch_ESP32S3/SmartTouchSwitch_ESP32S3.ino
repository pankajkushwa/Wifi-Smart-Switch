/**
 * @file SmartTouchSwitch_ESP32S3.ino
 * @brief Production Arduino Core Sketch for ESP32-S3 Commercial Smart Touch Switch
 * Board: ESP32S3 Dev Module
 * Flash: 8MB QIO, PSRAM: 8MB OPI
 */

#include <Arduino.h>
#include <WiFi.h>
#include "relay_arduino.h"

/* =========================================================================
 * USER CONFIGURATION: ENTER YOUR WI-FI & MQTT BROKER DETAILS HERE:
 * ========================================================================= */
const char* WIFI_SSID       = "Home_Fiber_2.4G";
const char* WIFI_PASS       = "HomePassword123";

// MQTT Broker Connection Details:
// Examples:
//   - HiveMQ Public:      "broker.hivemq.com" (Port 1883)
//   - EMQX Public:        "broker.emqx.io"    (Port 1883)
//   - Home Assistant LAN: "192.168.1.100"     (Port 1883)
const char* MQTT_BROKER     = "broker.hivemq.com";
const int   MQTT_PORT       = 1883;
const char* MQTT_USER       = "";                  // Optional: username (leave "" if unauthenticated)
const char* MQTT_PASS       = "";                  // Optional: password (leave "" if unauthenticated)
const char* MQTT_CLIENT_ID  = "ESP32S3_SmartSwitch_Ard";
const char* MQTT_TOPIC_BASE = "smartswitch/ESP32S3-4G"; // Publishes to stat/ and listens to cmnd/
/* ========================================================================= */

// Hardware Configuration for 4-Gang Touch Switch
const int RELAY_PINS[4] = {4, 5, 6, 7};
const char* CHANNEL_NAMES[4] = {"Main Chandelier", "Ceiling Fan", "Ambient Downlights", "Balcony Strip Light"};

RelayControllerESP32 relayController;

void onRelayStateChanged(uint8_t gangId, bool isOn) {
    Serial.printf("[EVENT] Gang %d changed to %s\n", gangId, isOn ? "ON" : "OFF");
}

void setup() {
    Serial.begin(115200);
    delay(1000);
    
    Serial.println("==================================================");
    Serial.println("  ESP32-S3 Arduino Commercial Smart Touch Switch   ");
    Serial.println("==================================================");

    // Initialize 4-Gang Relay Controller
    relayController.init(RELAY_PINS, 4, true); // Active HIGH
    relayController.setCallback(onRelayStateChanged);

    Serial.printf("Free Heap: %u bytes\n", ESP.getFreeHeap());
    Serial.printf("PSRAM Size: %u bytes\n", ESP.getPsramSize());
    Serial.println("Ready for local touch & remote mobile MQTT commands!");
}

void loop() {
    // Process serial debug commands:
    // Format: '1' -> toggle gang 1, '2' -> toggle gang 2, etc.
    if (Serial.available() > 0) {
        char cmd = Serial.read();
        if (cmd >= '1' && cmd <= '4') {
            uint8_t gang = cmd - '0';
            relayController.toggle(gang);
        } else if (cmd == 'a' || cmd == 'A') {
            relayController.setAll(true);
        } else if (cmd == 'o' || cmd == 'O') {
            relayController.setAll(false);
        }
    }
    delay(20);
}
