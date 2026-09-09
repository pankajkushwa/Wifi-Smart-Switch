# ESP-IDF v5.2+ Firmware for ESP32-S3 Commercial Smart Switch

This folder contains the complete, production-grade native ESP-IDF C codebase for the **ESP32-S3-WROOM-1-N8R8**.

## File Structure & Individual .c and .h Modules:
- `main.h` & `main.c`: Application entry (`app_main`), subsystem bootstrap, FreeRTOS heartbeat task, cloud command routing.
- `relay.h` & `relay.c`: Thread-safe relay abstraction layer with FreeRTOS mutexes, GPIO configuration, active-high/low polarity, cycle counting.
- `schedule_sync.h` & `schedule_sync.c`: Multi-device offline autonomous scheduler, monotonic version validation, NVS persistence, minute RTC tick execution.
- `wifi_mqtt.h` & `wifi_mqtt.c`: Wi-Fi station connectivity, MQTT publish/subscribe, telemetry state reporting.
- `nvs_storage.h` & `nvs_storage.c`: Non-volatile flash storage for relay state recovery, Wi-Fi credentials, blackout resilience.
- `device_config.h` & `device_config.c`: Static factory hardware manifests (Device 1: 4-Gang Touch Switch, Device 2: 2-Gang Touch Switch).
- `CMakeLists.txt`: ESP-IDF CMake build definition.

## Build and Flash
```bash
idf.py set-target esp32s3
idf.py build
idf.py -p /dev/ttyUSB0 flash monitor
```
