cmake_minimum_required(VERSION 3.16)

# Register ESP-IDF components
idf_component_register(
    SRCS "main.c" "relay.c" "schedule_sync.c" "wifi_mqtt.c" "nvs_storage.c" "device_config.c"
    INCLUDE_DIRS "."
    REQUIRES "driver" "nvs_flash" "mqtt" "esp_wifi" "esp_event" "cJSON" "freertos"
)
