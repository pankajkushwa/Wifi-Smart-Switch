# Smart Touch Switch Mobile Application Codebase

This directory contains the cross-platform mobile companion applications for iOS and Android:
1. **Flutter App (`flutter/`)**: Built with Dart & Riverpod, targeting iOS & Android with native Tuya / Smart Life UX styling.
2. **React Native App (`react_native/`)**: Built with React Native & TypeScript, targeting iOS & Android.

## Architecture Guidelines
- **ESP32-Authoritative Profile**: The mobile app reads the burned hardware manifest (gang count, serial number, load type, and factory switch names) via MQTT/BLE and strictly displays it.
- **Tuya / Smart Life UX**: Clean card tiles with one-touch toggle, countdown timers, scenes (Good Night, Morning Mode, Arrive Home, Movie Night), and soft night light indicators.
- **Home, Building & Room Hierarchy**: 
  - **Buildings / Properties**: Support switching between multi-properties (e.g. "My Home", "Office HQ", "Holiday Villa", "Commercial Unit").
  - **Rooms**: Rooms are scoped under properties (e.g. Living Room, Master Bedroom, Conference Room, Kitchen).
  - **Device Room Assignment**: Smart switches can be moved between rooms seamlessly via the room selector.

