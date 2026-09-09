/**
 * @file relay.c
 * @brief Relay Driver Implementation for Arduino ESP32
 */

#include "relay.h"
#include <string.h>

#if defined(ARDUINO)
#include <Arduino.h>
#else
#include "esp_log.h"
#include "driver/gpio.h"
#define HIGH 1
#define LOW  0
#define OUTPUT GPIO_MODE_OUTPUT
static void pinMode(int pin, int mode) {
    gpio_config_t c = { .pin_bit_mask = (1ULL << pin), .mode = GPIO_MODE_OUTPUT };
    gpio_config(&c);
}
static void digitalWrite(int pin, int level) {
    gpio_set_level((gpio_num_t)pin, level);
}
#endif

typedef struct {
    channel_profile_t profile;
    bool is_on;
} relay_inst_t;

static relay_inst_t s_relays[MAX_GANGS];
static uint8_t s_gang_count = 0;
static arduino_relay_cb_t s_cb = NULL;

bool arduino_relay_init(const switch_device_profile_t *profile) {
    if (!profile) return false;
    s_gang_count = profile->gang_count;

    for (uint8_t i = 0; i < s_gang_count; i++) {
        s_relays[i].profile = profile->channels[i];
        s_relays[i].is_on = false;

        pinMode(profile->channels[i].gpio_pin, OUTPUT);
        int initial_level = profile->channels[i].active_high ? LOW : HIGH;
        digitalWrite(profile->channels[i].gpio_pin, initial_level);
    }
    return true;
}

bool arduino_relay_set(uint8_t gang_id, bool is_on) {
    if (gang_id < 1 || gang_id > s_gang_count) return false;
    uint8_t idx = gang_id - 1;

    if (s_relays[idx].is_on != is_on) {
        s_relays[idx].is_on = is_on;
        int level = 0;
        if (s_relays[idx].profile.active_high) {
            level = is_on ? HIGH : LOW;
        } else {
            level = is_on ? LOW : HIGH;
        }
        digitalWrite(s_relays[idx].profile.gpio_pin, level);

        if (s_cb) {
            s_cb(gang_id, is_on);
        }
    }
    return true;
}

bool arduino_relay_get(uint8_t gang_id) {
    if (gang_id < 1 || gang_id > s_gang_count) return false;
    return s_relays[gang_id - 1].is_on;
}

bool arduino_relay_toggle(uint8_t gang_id) {
    return arduino_relay_set(gang_id, !arduino_relay_get(gang_id));
}

void arduino_relay_set_all(bool is_on) {
    for (uint8_t g = 1; g <= s_gang_count; g++) {
        arduino_relay_set(g, is_on);
    }
}

void arduino_relay_register_cb(arduino_relay_cb_t cb) {
    s_cb = cb;
}
