/**
 * @file SmartTouchSwitch_ESP32S3.ino
 * @brief Arduino Sketch Entry Point for ESP32-S3 Commercial Smart Switch
 */

#include <Arduino.h>
#include "main.h"
#include "device_config.h"

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("=================================================");
    Serial.println("  ESP32-S3 Commercial Touch Switch (Arduino Core) ");
    Serial.println("=================================================");

    arduino_app_setup();

    const switch_device_profile_t* p = get_active_device_profile();
    Serial.printf("Device: %s | Gangs: %d | SN: %s\n", p->model_id, p->gang_count, p->serial_no);
    Serial.printf("Free Heap: %u bytes\n", ESP.getFreeHeap());
    Serial.println("Type 1-4 to toggle relays, 'a' for all ON, 'o' for all OFF");
}

void loop() {
    arduino_app_loop();

    if (Serial.available() > 0) {
        char c = Serial.read();
        char buf[2] = {c, '\0'};
        arduino_app_handle_cmd(buf);
    }
    delay(20);
}
