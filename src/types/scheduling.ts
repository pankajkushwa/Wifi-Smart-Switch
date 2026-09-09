export type TargetType = 
  | 'all' 
  | 'specific_device' 
  | 'multiple_devices' 
  | 'different_actions' 
  | 'room' 
  | 'floor' 
  | 'building';

export type ScheduleActionType = 'ON' | 'OFF';

export interface DeviceRelayAction {
  id: string;
  deviceId: string;
  deviceName: string;
  roomName: string;
  floorName: string;
  relay: number;
  relayName: string;
  action: ScheduleActionType;
}

export interface ScheduleTiming {
  type: 'daily' | 'weekly' | 'once';
  time: string; // "23:00"
  timezone: string;
  days: ('Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat')[];
}

export interface DeviceSyncStatus {
  deviceId: string;
  deviceName: string;
  version: number;
  status: 'synced' | 'pending' | 'offline';
  lastSyncAt?: string;
  error?: string;
}

export interface AutomationExecutionRecord {
  id: string;
  automationId: string;
  automationName: string;
  deviceId: string;
  deviceName: string;
  relay: number;
  relayName: string;
  action: ScheduleActionType;
  executionTime: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  failureReason?: string;
  isOfflineExecuted?: boolean; // Executed locally via ESP32 RTC/NVS while offline
}

export interface MultiDeviceAutomation {
  automationId: string;
  name: string;
  enabled: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  targetType: TargetType;
  schedule: ScheduleTiming;
  targetScope?: {
    buildingId?: string;
    buildingName?: string;
    floorId?: string;
    floorName?: string;
    roomId?: string;
    roomName?: string;
    deviceIds?: string[];
  };
  actions: DeviceRelayAction[];
  syncSummary: {
    totalDevices: number;
    syncedDevices: number;
    pendingDevices: number;
    offlineDevices: number;
    deviceSyncStates: Record<string, DeviceSyncStatus>;
  };
  lastExecution?: {
    executedAt: string;
    overallStatus: 'success' | 'partial_success' | 'failed';
    successCount: number;
    failureCount: number;
    totalCount: number;
    summary: string;
  };
}

export interface SmartDeviceProfile {
  id: string;
  name: string;
  serialNumber: string;
  buildingId: string;
  buildingName: string;
  floor: 'Ground Floor' | 'First Floor' | 'Second Floor' | 'Floor 4';
  room: string;
  gangCount: 1 | 2 | 4 | 6 | 8 | 16;
  isOnline: boolean;
  ipAddress: string;
  nvsScheduleVersion: number;
  channels: {
    relay: number;
    name: string;
    loadType: 'light' | 'fan' | 'socket' | 'heater' | 'chandelier' | 'ac';
    state: 0 | 1;
  }[];
}
