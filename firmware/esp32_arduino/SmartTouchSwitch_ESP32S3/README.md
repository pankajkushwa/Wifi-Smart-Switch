# Arduino Core Firmware for ESP32-S3 Commercial Smart Switch

This folder contains the complete, modular C/C++ codebase for compiling on **Arduino IDE** or **PlatformIO** for the **ESP32-S3**.

## File Structure & Individual .c and .h Modules:
- `main.h` & `main.c`: Application bootstrap, event loop, serial command processor.
- `relay.h` & `relay.c`: Relay GPIO driver with active-level polarity support and callback hooks.
- `schedule_sync.h` & `schedule_sync.c`: Multi-device offline scheduler, monotonic version checking, JSON payload parser.
- `wifi_mqtt.h` & `wifi_mqtt.c`: Networking and MQTT abstraction layer.
- `nvs_storage.h` & `nvs_storage.c`: Flash storage for relay states across power loss.
- `device_config.h` & `device_config.c`: Hardware manifests for 4-Gang and 2-Gang switch models.
- `SmartTouchSwitch_ESP32S3.ino`: Main sketch entry point.

## Arduino IDE Flashing:
1. Board: `ESP32S3 Dev Module`
2. Flash Size: `8MB (64Mb)`
3. PSRAM: `OPI PSRAM`
4. Port: `/dev/ttyUSB0` or `COMx`
