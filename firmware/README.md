# ESP32-S3 Commercial Smart Touch Switch Firmware

This directory provides 2 separate, dedicated firmware folders for both ESP32 development environments, each containing individual `.c` and `.h` modular files:

---

## 📁 1. `/firmware/esp32_idf/` — ESP-IDF Native RTOS Firmware
Industrial C codebase with FreeRTOS multitasking, mTLS MQTT, monotonic schedule versioning, and NVS storage.

### Individual `.c` & `.h` Modules:
- `main.h` / `main.c`: Application entry (`app_main`), FreeRTOS tasks, heartbeat telemetry, MQTT cloud command dispatcher.
- `relay.h` / `relay.c`: Thread-safe relay abstraction layer with FreeRTOS mutexes, GPIO output configuration, cycle counters, and active-level polarity.
- `schedule_sync.h` / `schedule_sync.c`: Multi-device offline autonomous scheduler, monotonic versioning, minute RTC tick execution, and NVS flash sync.
- `wifi_mqtt.h` / `wifi_mqtt.c`: Wi-Fi station mode management, MQTT client subscriber, and state publisher.
- `nvs_storage.h` / `nvs_storage.c`: Non-volatile storage driver for blackout state recovery and Wi-Fi credential persistence.
- `device_config.h` / `device_config.c`: Factory hardware profiles (Device 1: 4-Gang Touch Switch, Device 2: 2-Gang Touch Switch).
- `CMakeLists.txt`: ESP-IDF component registration.

```bash
cd esp32_idf
idf.py set-target esp32s3
idf.py build
idf.py -p /dev/ttyUSB0 flash monitor
```

---

## 📁 2. `/firmware/esp32_arduino/` — Arduino Core Firmware
Modular C/C++ codebase with Arduino IDE / PlatformIO compatibility.

### Individual `.c` & `.h` Modules:
- `main.h` / `main.c`: Core application lifecycle, state machine, and serial command processor.
- `relay.h` / `relay.c`: Clean C driver for multi-gang relay control and GPIO manipulation.
- `schedule_sync.h` / `schedule_sync.c`: Offline schedule manager with version validation and payload parser.
- `wifi_mqtt.h` / `wifi_mqtt.c`: Network abstraction for Wi-Fi and MQTT tele/cmnd topics.
- `nvs_storage.h` / `nvs_storage.c`: Flash storage for persisting channel states across reboots.
- `device_config.h` / `device_config.c`: Hardware manifests for 4-gang and 2-gang models.
- `SmartTouchSwitch_ESP32S3.ino`: Arduino sketch entry point.

### Flashing (Arduino IDE / PlatformIO):
- Board: `ESP32S3 Dev Module`
- Flash Size: `8MB (64Mb)`
- PSRAM: `OPI PSRAM (8MB)`
- Open `SmartTouchSwitch_ESP32S3.ino` and hit Upload.
