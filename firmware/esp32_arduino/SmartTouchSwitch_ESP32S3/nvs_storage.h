/**
 * @file nvs_storage.h
 * @brief Flash / Preferences Storage Header for Arduino ESP32
 */

#pragma once

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

void arduino_nvs_init(void);
void arduino_nvs_save_state(uint8_t gang_id, bool is_on);
bool arduino_nvs_load_state(uint8_t gang_id, bool *out_state);

#ifdef __cplusplus
}
#endif
