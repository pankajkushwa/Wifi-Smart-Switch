#include "relay_arduino.h"

RelayControllerESP32::RelayControllerESP32() : m_count(0), m_activeHigh(true), m_callback(nullptr) {
    for (int i = 0; i < 16; i++) {
        m_pins[i] = -1;
        m_states[i] = false;
    }
}

bool RelayControllerESP32::init(const int* pins, uint8_t count, bool activeHigh) {
    if (count > 16 || !pins) return false;
    m_count = count;
    m_activeHigh = activeHigh;

    for (uint8_t i = 0; i < count; i++) {
        m_pins[i] = pins[i];
        m_states[i] = false;
        pinMode(m_pins[i], OUTPUT);
        apply(i + 1, false);
    }
    return true;
}

void RelayControllerESP32::apply(uint8_t gangId, bool state) {
    if (gangId < 1 || gangId > m_count) return;
    int pin = m_pins[gangId - 1];
    int level = state ? (m_activeHigh ? HIGH : LOW) : (m_activeHigh ? LOW : HIGH);
    digitalWrite(pin, level);
}

bool RelayControllerESP32::on(uint8_t gangId) {
    if (gangId < 1 || gangId > m_count) return false;
    uint8_t idx = gangId - 1;
    if (!m_states[idx]) {
        m_states[idx] = true;
        apply(gangId, true);
        if (m_callback) m_callback(gangId, true);
    }
    return true;
}

bool RelayControllerESP32::off(uint8_t gangId) {
    if (gangId < 1 || gangId > m_count) return false;
    uint8_t idx = gangId - 1;
    if (m_states[idx]) {
        m_states[idx] = false;
        apply(gangId, false);
        if (m_callback) m_callback(gangId, false);
    }
    return true;
}

bool RelayControllerESP32::toggle(uint8_t gangId) {
    if (gangId < 1 || gangId > m_count) return false;
    return m_states[gangId - 1] ? off(gangId) : on(gangId);
}

bool RelayControllerESP32::getState(uint8_t gangId) {
    if (gangId < 1 || gangId > m_count) return false;
    return m_states[gangId - 1];
}

void RelayControllerESP32::setAll(bool state) {
    for (uint8_t g = 1; g <= m_count; g++) {
        if (state) on(g);
        else off(g);
    }
}

void RelayControllerESP32::setCallback(RelayCallback cb) {
    m_callback = cb;
}
