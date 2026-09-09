export type GangCount = 1 | 2 | 3 | 4 | 6 | 8 | 12 | 16;

export type RelayMode = 'LATCHING' | 'MOMENTARY' | 'PULSE';

export type RelayState = 0 | 1; // 0 = OFF, 1 = ON

export type LoadType = 'light' | 'fan' | 'socket' | 'heater' | 'chandelier' | 'ac' | 'doorbell' | 'switch';

export interface EspHardwareChannel {
  gangId: number;              // 1-indexed gang number (1 to 16)
  gpioPin: number;             // Physical MCU GPIO pin
  loadType: LoadType;          // STATIC: light, fan, socket, etc. (burned into ESP32)
  factoryName: string;         // STATIC: Hardcoded channel name from factory NVS/code
  activeLevel: 'LOW' | 'HIGH'; // Hardware driver active level
  defaultMode: RelayMode;      // Factory default mode
  pulseDurationMs: number;     // For PULSE mode (e.g. 500ms)
  isReadOnly: true;            // Read-only indicator (cannot be modified by client app)
}

export interface EspHardwareManifest {
  serialNumber: string;        // STATIC: eFuse MAC or Factory NVS burned serial (e.g. "SN:ESP32S3-4G-2026-X883B")
  modelId: string;             // STATIC: Hardware board model (e.g. "LUMIERE-S3-4G-TOUCH")
  hardwareRev: string;         // STATIC: PCB revision (e.g. "v2.4-SMD")
  mcu: string;                 // "ESP32-S3-WROOM-1-N8R8"
  gangCount: GangCount;        // STATIC: Hardware gang count (fixed on ESP32 board)
  macAddress: string;          // Factory eFuse MAC
  buildDate: string;           // Firmware build timestamp
  isFactoryLocked: boolean;    // Enforces client applications cannot alter topology
  channels: EspHardwareChannel[];
}

export interface RelayChannelConfig {
  id: number;                  // 1-indexed gang number (1 to 16)
  name: string;                // Static factory channel name
  gpioPin: number;
  activeLevel: 'LOW' | 'HIGH';
  mode: RelayMode;
  pulseDurationMs: number;     // For PULSE mode (e.g. 500ms)
  restoreLastState: boolean;
  defaultState: RelayState;
  state: RelayState;
  cycleCount: number;
  icon: LoadType;
  isReadOnly: boolean;         // Static from ESP32
}

export interface DeviceTelemetry {
  deviceId: string;
  model: string;
  serialNumber: string;
  firmwareVersion: string;
  uptimeSeconds: number;
  freeHeapBytes: number;
  minFreeHeapBytes: number;
  wifiRssi: number;
  ipAddress: string;
  mqttConnected: boolean;
  activeGangCount: GangCount;
  mcu: string;
  coreTempC: number;
  isFactoryLocked: boolean;
}

export interface FreeRTOSEvent {
  timestamp: string;
  source: 'TASK_RELAY' | 'TASK_MQTT' | 'TASK_TOUCH' | 'TIMER_PULSE' | 'NVS_STORAGE' | 'TASK_WIFI';
  action: string;
  gang: number;
  details: string;
}

export interface ScheduleItem {
  id: string;
  gang: number;
  targetState: RelayState;
  time: string; // "07:30"
  days: ('Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat')[];
  enabled: boolean;
  label: string;
}
