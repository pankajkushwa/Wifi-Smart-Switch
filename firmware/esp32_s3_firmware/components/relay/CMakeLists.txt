idf_component_register(
    SRCS "relay_esp_idf.c"
    INCLUDE_DIRS "include"
    REQUIRES driver esp_timer freertos esp_common nvs_flash log
)
