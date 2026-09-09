#pragma once
#include <Arduino.h>

typedef void (*RelayCallback)(uint8_t gangId, bool isOn);

class RelayControllerESP32 {
public:
    RelayControllerESP32();
    bool init(const int* pins, uint8_t count, bool activeHigh = true);
    bool on(uint8_t gangId);
    bool off(uint8_t gangId);
    bool toggle(uint8_t gangId);
    bool getState(uint8_t gangId);
    void setAll(bool state);
    void setCallback(RelayCallback cb);

private:
    int m_pins[16];
    bool m_states[16];
    uint8_t m_count;
    bool m_activeHigh;
    RelayCallback m_callback;
    void apply(uint8_t gangId, bool state);
};
