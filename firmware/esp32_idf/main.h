/**
 * @file main.h
 * @brief ESP32-S3 Smart Touch Switch Application Entry Header
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

#define APP_VERSION_STR "v2.5.0-COMMERCIAL"
#define APP_HEARTBEAT_INTERVAL_MS 10000

void app_init_subsystems(void);
void app_handle_cloud_command(const char *topic, const char *payload, size_t len);

#ifdef __cplusplus
}
#endif
