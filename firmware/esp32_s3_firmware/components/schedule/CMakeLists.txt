idf_component_register(
    SRCS "schedule_sync.c"
    INCLUDE_DIRS "include"
    REQUIRES "relay" "nvs_flash" "cJSON" "esp_timer" "freertos"
)
