/**
 * @file nvs_storage.c
 * @brief Flash / Preferences Storage Implementation for Arduino ESP32
 */

#include "nvs_storage.h"

static bool s_saved_states[16] = {0};

void arduino_nvs_init(void) {
    /* Initialize simulated/real Flash NVS storage */
}

void arduino_nvs_save_state(uint8_t gang_id, bool is_on) {
    if (gang_id >= 1 && gang_id <= 16) {
        s_saved_states[gang_id - 1] = is_on;
    }
}

bool arduino_nvs_load_state(uint8_t gang_id, bool *out_state) {
    if (!out_state || gang_id < 1 || gang_id > 16) return false;
    *out_state = s_saved_states[gang_id - 1];
    return true;
}
