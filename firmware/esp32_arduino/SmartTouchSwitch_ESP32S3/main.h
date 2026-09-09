/**
 * @file main.h
 * @brief Main Application Engine Header for Arduino ESP32
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

void arduino_app_setup(void);
void arduino_app_loop(void);
void arduino_app_handle_cmd(const char *cmd_str);

#ifdef __cplusplus
}
#endif
