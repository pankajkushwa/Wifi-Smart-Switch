import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  AlertTriangle, 
  Wifi, 
  WifiOff, 
  Play, 
  RefreshCw, 
  Sliders, 
  Layers, 
  Home, 
  Building2, 
  ChevronRight, 
  ChevronDown, 
  Info, 
  HardDrive, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Sparkles,
  MapPin,
  Flame,
  Power
} from 'lucide-react';
import { 
  TargetType, 
  ScheduleActionType, 
  DeviceRelayAction, 
  MultiDeviceAutomation, 
  AutomationExecutionRecord, 
  SmartDeviceProfile,
  DeviceSyncStatus 
} from '../types/scheduling';
import { INITIAL_SMART_DEVICES, INITIAL_AUTOMATIONS, INITIAL_EXECUTION_HISTORY } from '../data/deviceRegistry';

interface MultiDeviceSchedulerProps {
  currentBuildingId: string;
  onApplyChannelState?: (relayId: number, state: 0 | 1) => void;
}

export const MultiDeviceScheduler: React.FC<MultiDeviceSchedulerProps> = ({
  currentBuildingId,
  onApplyChannelState,
}) => {
  // Navigation tabs within scheduler: "automations" | "history" | "esp_sync"
  const [activeTab, setActiveTab] = useState<'automations' | 'history' | 'esp_sync'>('automations');

  // Device Registry state
  const [devices, setDevices] = useState<SmartDeviceProfile[]>(INITIAL_SMART_DEVICES);
  
  // Automations state
  const [automations, setAutomations] = useState<MultiDeviceAutomation[]>(INITIAL_AUTOMATIONS);
  
  // Execution History state
  const [history, setHistory] = useState<AutomationExecutionRecord[]>(INITIAL_EXECUTION_HISTORY);

  // Filter for history
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');

  // Creation / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAutomationId, setEditingAutomationId] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formTime, setFormTime] = useState('23:00');
  const [formTimezone, setFormTimezone] = useState('Asia/Kolkata');
  const [formType, setFormType] = useState<'daily' | 'weekly' | 'once'>('daily');
  const [formDays, setFormDays] = useState<('Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat')[]>([
    'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
  ]);
  const [formTargetType, setFormTargetType] = useState<TargetType>('different_actions');

  // Scope parameters
  const [formScopeBuilding, setFormScopeBuilding] = useState('bld_1');
  const [formScopeFloor, setFormScopeFloor] = useState('Ground Floor');
  const [formScopeRoom, setFormScopeRoom] = useState('Living Room');
  const [formScopeDevice, setFormScopeDevice] = useState('DEV001');
  const [formScopeMultiDevices, setFormScopeMultiDevices] = useState<string[]>(['DEV001', 'DEV002']);

  // Dynamic Action Rows (for Different Devices with Different Actions, or auto-populated from scopes)
  const [formActionRows, setFormActionRows] = useState<DeviceRelayAction[]>([]);

  // Uniform action type for bulk target types (All, Room, Floor, Building)
  const [bulkAction, setBulkAction] = useState<ScheduleActionType>('OFF');
  const [bulkRelayOption, setBulkRelayOption] = useState<'all' | 'specific'>('all');
  const [bulkSelectedRelays, setBulkSelectedRelays] = useState<number[]>([1, 2]);

  // Inspection modal for ESP32 MQTT JSON payload
  const [inspectingPayload, setInspectingPayload] = useState<{ automation: MultiDeviceAutomation; deviceId: string } | null>(null);

  // Feedback banner
  const [bannerMessage, setBannerMessage] = useState<{ text: string; type: 'success' | 'info' | 'warn' } | null>(null);

  const showBanner = (text: string, type: 'success' | 'info' | 'warn' = 'success') => {
    setBannerMessage({ text, type });
    setTimeout(() => setBannerMessage(null), 4000);
  };

  // Helper to open creation modal
  const handleOpenCreateModal = () => {
    setEditingAutomationId(null);
    setFormName('Night Mode');
    setFormTime('23:00');
    setFormTimezone('Asia/Kolkata');
    setFormType('daily');
    setFormDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    setFormTargetType('different_actions');
    setFormScopeBuilding(currentBuildingId);
    setFormScopeFloor('Ground Floor');
    setFormScopeRoom('Living Room');
    setFormScopeDevice('DEV001');
    setFormScopeMultiDevices(['DEV001', 'DEV002']);
    
    // Default matrix rows
    setFormActionRows([
      {
        id: `act_${Date.now()}_1`,
        deviceId: 'DEV001',
        deviceName: 'Living Room Switch',
        roomName: 'Living Room',
        floorName: 'Ground Floor',
        relay: 1,
        relayName: 'Main Chandelier',
        action: 'OFF',
      },
      {
        id: `act_${Date.now()}_2`,
        deviceId: 'DEV001',
        deviceName: 'Living Room Switch',
        roomName: 'Living Room',
        floorName: 'Ground Floor',
        relay: 2,
        relayName: 'Ceiling Fan',
        action: 'OFF',
      },
      {
        id: `act_${Date.now()}_3`,
        deviceId: 'DEV002',
        deviceName: 'Master Bedroom Switch',
        roomName: 'Master Bedroom',
        floorName: 'First Floor',
        relay: 1,
        relayName: 'Bed Lamp Left',
        action: 'OFF',
      },
      {
        id: `act_${Date.now()}_4`,
        deviceId: 'DEV003',
        deviceName: 'Kitchen & Dining Switch',
        roomName: 'Kitchen',
        floorName: 'Ground Floor',
        relay: 1,
        relayName: 'Kitchen Counter Lights',
        action: 'OFF',
      },
      {
        id: `act_${Date.now()}_5`,
        deviceId: 'DEV004',
        deviceName: 'Outdoor & Porch Switch',
        roomName: 'Balcony / Porch',
        floorName: 'Ground Floor',
        relay: 1,
        relayName: 'Porch Floodlight',
        action: 'ON',
      },
    ]);
    setIsModalOpen(true);
  };

  // Helper to open edit modal
  const handleOpenEditModal = (auto: MultiDeviceAutomation) => {
    setEditingAutomationId(auto.automationId);
    setFormName(auto.name);
    setFormTime(auto.schedule.time);
    setFormTimezone(auto.schedule.timezone);
    setFormType(auto.schedule.type);
    setFormDays(auto.schedule.days);
    setFormTargetType(auto.targetType);
    setFormScopeBuilding(auto.targetScope?.buildingId || currentBuildingId);
    setFormScopeFloor(auto.targetScope?.floorName || 'Ground Floor');
    setFormScopeRoom(auto.targetScope?.roomName || 'Living Room');
    setFormScopeDevice(auto.actions[0]?.deviceId || 'DEV001');
    setFormActionRows([...auto.actions]);
    setIsModalOpen(true);
  };

  // Add a new row to action matrix
  const handleAddActionRow = () => {
    const dev = devices[0];
    const newRow: DeviceRelayAction = {
      id: `act_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      deviceId: dev.id,
      deviceName: dev.name,
      roomName: dev.room,
      floorName: dev.floor,
      relay: dev.channels[0]?.relay || 1,
      relayName: dev.channels[0]?.name || 'Relay 1',
      action: 'OFF',
    };
    setFormActionRows(prev => [...prev, newRow]);
  };

  // Remove a row from action matrix
  const handleRemoveActionRow = (id: string) => {
    if (formActionRows.length <= 1) return;
    setFormActionRows(prev => prev.filter(r => r.id !== id));
  };

  // Update a row in action matrix
  const handleUpdateActionRow = (
    id: string, 
    field: 'deviceId' | 'relay' | 'action', 
    value: string | number
  ) => {
    setFormActionRows(prev => prev.map(row => {
      if (row.id !== id) return row;

      if (field === 'deviceId') {
        const foundDev = devices.find(d => d.id === value);
        if (!foundDev) return row;
        return {
          ...row,
          deviceId: foundDev.id,
          deviceName: foundDev.name,
          roomName: foundDev.room,
          floorName: foundDev.floor,
          relay: foundDev.channels[0]?.relay || 1,
          relayName: foundDev.channels[0]?.name || 'Relay 1',
        };
      } else if (field === 'relay') {
        const dev = devices.find(d => d.id === row.deviceId);
        const ch = dev?.channels.find(c => c.relay === Number(value));
        return {
          ...row,
          relay: Number(value),
          relayName: ch?.name || `Relay ${value}`,
        };
      } else if (field === 'action') {
        return {
          ...row,
          action: value as ScheduleActionType,
        };
      }
      return row;
    }));
  };

  // Generate target actions when using structured modes (All Devices, Room, Floor, Building)
  const generateActionsFromStructuredTarget = (): DeviceRelayAction[] => {
    let targetedDevices: SmartDeviceProfile[] = [];

    if (formTargetType === 'all') {
      targetedDevices = devices.filter(d => d.buildingId === formScopeBuilding);
    } else if (formTargetType === 'specific_device') {
      const dev = devices.find(d => d.id === formScopeDevice);
      if (dev) targetedDevices = [dev];
    } else if (formTargetType === 'multiple_devices') {
      targetedDevices = devices.filter(d => formScopeMultiDevices.includes(d.id));
    } else if (formTargetType === 'room') {
      targetedDevices = devices.filter(d => d.buildingId === formScopeBuilding && d.room === formScopeRoom);
    } else if (formTargetType === 'floor') {
      targetedDevices = devices.filter(d => d.buildingId === formScopeBuilding && d.floor === formScopeFloor);
    } else if (formTargetType === 'building') {
      targetedDevices = devices.filter(d => d.buildingId === formScopeBuilding);
    } else {
      return formActionRows;
    }

    const generated: DeviceRelayAction[] = [];
    targetedDevices.forEach(d => {
      const channelsToInclude = bulkRelayOption === 'all'
        ? d.channels
        : d.channels.filter(c => bulkSelectedRelays.includes(c.relay));

      channelsToInclude.forEach(ch => {
        generated.push({
          id: `act_${d.id}_${ch.relay}_${Date.now()}`,
          deviceId: d.id,
          deviceName: d.name,
          roomName: d.room,
          floorName: d.floor,
          relay: ch.relay,
          relayName: ch.name,
          action: bulkAction,
        });
      });
    });

    return generated.length > 0 ? generated : formActionRows;
  };

  // Save Schedule Automation
  const handleSaveAutomation = (e: React.FormEvent) => {
    e.preventDefault();

    const finalActions = formTargetType === 'different_actions'
      ? formActionRows
      : generateActionsFromStructuredTarget();

    if (finalActions.length === 0) {
      alert('Please add at least one device action to this automation.');
      return;
    }

    // Determine affected devices
    const affectedDeviceIds: string[] = Array.from(new Set(finalActions.map(a => a.deviceId)));

    if (editingAutomationId) {
      // Editing existing automation -> increment version!
      setAutomations(prev => prev.map(auto => {
        if (auto.automationId !== editingAutomationId) return auto;

        const newVersion = auto.version + 1;
        const syncStates: Record<string, DeviceSyncStatus> = {};
        
        let syncedCount = 0;
        let offlineCount = 0;

        affectedDeviceIds.forEach(id => {
          const dev = devices.find(d => d.id === id);
          const isOnline = dev ? dev.isOnline : false;
          if (isOnline) {
            syncedCount++;
            syncStates[id] = {
              deviceId: id,
              deviceName: dev?.name || id,
              version: newVersion,
              status: 'synced',
              lastSyncAt: 'Just now',
            };
          } else {
            offlineCount++;
            syncStates[id] = {
              deviceId: id,
              deviceName: dev?.name || id,
              version: auto.version, // Still on old version
              status: 'offline',
              error: 'Pending Sync - Device Offline',
            };
          }
        });

        return {
          ...auto,
          name: formName,
          version: newVersion,
          updatedAt: new Date().toLocaleTimeString(),
          targetType: formTargetType,
          schedule: {
            type: formType,
            time: formTime,
            timezone: formTimezone,
            days: formDays,
          },
          targetScope: {
            buildingId: formScopeBuilding,
            floorName: formScopeFloor,
            roomName: formScopeRoom,
            deviceIds: affectedDeviceIds,
          },
          actions: finalActions,
          syncSummary: {
            totalDevices: affectedDeviceIds.length,
            syncedDevices: syncedCount,
            pendingDevices: offlineCount,
            offlineDevices: offlineCount,
            deviceSyncStates: syncStates,
          },
        };
      }));

      showBanner(`Automation updated to Version ${editingAutomationId} (MQTT Sync broadcasted to affected devices)`, 'success');
    } else {
      // Creating new automation (Version 1)
      const autoId = `AUTO${String(automations.length + 1).padStart(3, '0')}`;
      const syncStates: Record<string, DeviceSyncStatus> = {};
      let syncedCount = 0;
      let offlineCount = 0;

      affectedDeviceIds.forEach(id => {
        const dev = devices.find(d => d.id === id);
        const isOnline = dev ? dev.isOnline : false;
        if (isOnline) {
          syncedCount++;
          syncStates[id] = {
            deviceId: id,
            deviceName: dev?.name || id,
            version: 1,
            status: 'synced',
            lastSyncAt: 'Just now',
          };
        } else {
          offlineCount++;
          syncStates[id] = {
            deviceId: id,
            deviceName: dev?.name || id,
            version: 0,
            status: 'offline',
            error: 'Pending Sync - Device Offline',
          };
        }
      });

      const newAutomation: MultiDeviceAutomation = {
        automationId: autoId,
        name: formName,
        enabled: true,
        version: 1,
        createdAt: new Date().toLocaleTimeString(),
        updatedAt: new Date().toLocaleTimeString(),
        targetType: formTargetType,
        schedule: {
          type: formType,
          time: formTime,
          timezone: formTimezone,
          days: formDays,
        },
        targetScope: {
          buildingId: formScopeBuilding,
          floorName: formScopeFloor,
          roomName: formScopeRoom,
          deviceIds: affectedDeviceIds,
        },
        actions: finalActions,
        syncSummary: {
          totalDevices: affectedDeviceIds.length,
          syncedDevices: syncedCount,
          pendingDevices: offlineCount,
          offlineDevices: offlineCount,
          deviceSyncStates: syncStates,
        },
      };

      setAutomations(prev => [newAutomation, ...prev]);
      showBanner(`Created ${formName} (v1). Pushed to ${syncedCount}/${affectedDeviceIds.length} devices via MQTT`, 'success');
    }

    setIsModalOpen(false);
  };

  // Toggle Automation Enabled/Disabled
  const handleToggleEnable = (id: string) => {
    setAutomations(prev => prev.map(a => {
      if (a.automationId !== id) return a;
      const nextState = !a.enabled;
      showBanner(`Schedule "${a.name}" ${nextState ? 'Enabled' : 'Disabled'}`, nextState ? 'success' : 'info');
      return { ...a, enabled: nextState };
    }));
  };

  // Delete Automation
  const handleDeleteAutomation = (id: string) => {
    const target = automations.find(a => a.automationId === id);
    if (!target) return;
    if (window.confirm(`Delete automation "${target.name}"? MQTT delete commands will be sent to all ${target.syncSummary.totalDevices} affected devices.`)) {
      setAutomations(prev => prev.filter(a => a.automationId !== id));
      showBanner(`Deleted ${target.name} from cloud and device NVS partitions.`, 'info');
    }
  };

  // Execute Automation Immediately (Test / Manual Trigger)
  const handleExecuteNow = (auto: MultiDeviceAutomation) => {
    const affectedDeviceIds: string[] = Array.from(new Set(auto.actions.map(a => a.deviceId)));
    const nowTime = new Date().toLocaleTimeString();

    let successDevCount = 0;
    let failedDevCount = 0;
    const newRecords: AutomationExecutionRecord[] = [];

    // Group actions by device
    affectedDeviceIds.forEach(devId => {
      const dev = devices.find(d => d.id === devId);
      const isOnline = dev ? dev.isOnline : false;
      const devActions = auto.actions.filter(a => a.deviceId === devId);

      if (isOnline) {
        successDevCount++;
        devActions.forEach(act => {
          newRecords.push({
            id: `exec_${Date.now()}_${act.deviceId}_${act.relay}`,
            automationId: auto.automationId,
            automationName: auto.name,
            deviceId: act.deviceId,
            deviceName: act.deviceName,
            relay: act.relay,
            relayName: act.relayName,
            action: act.action,
            executionTime: `Today, ${nowTime}`,
            status: 'SUCCESS',
            isOfflineExecuted: false,
          });

          // If DEV001 (the active switch in the app), also trigger real relay state!
          if (act.deviceId === 'DEV001' && onApplyChannelState) {
            onApplyChannelState(act.relay, act.action === 'ON' ? 1 : 0);
          }
        });
      } else {
        failedDevCount++;
        devActions.forEach(act => {
          newRecords.push({
            id: `exec_${Date.now()}_${act.deviceId}_${act.relay}`,
            automationId: auto.automationId,
            automationName: auto.name,
            deviceId: act.deviceId,
            deviceName: act.deviceName,
            relay: act.relay,
            relayName: act.relayName,
            action: act.action,
            executionTime: `Today, ${nowTime}`,
            status: 'FAILED',
            failureReason: 'Failed - Device Offline (Waiting for reconnection)',
            isOfflineExecuted: false,
          });
        });
      }
    });

    // Update execution history
    setHistory(prev => [...newRecords, ...prev]);

    // Update automation's last execution stats
    const total = affectedDeviceIds.length;
    let summary = '';
    let overallStatus: 'success' | 'partial_success' | 'failed' = 'success';

    if (failedDevCount === 0) {
      summary = `${total}/${total} devices executed successfully`;
      overallStatus = 'success';
      showBanner(`Schedule Executed: ${summary}`, 'success');
    } else if (successDevCount > 0) {
      summary = `${successDevCount}/${total} devices executed successfully (${failedDevCount} device offline)`;
      overallStatus = 'partial_success';
      showBanner(`Partial Execution: ${summary}`, 'warn');
    } else {
      summary = `All ${total} devices failed - Devices Offline`;
      overallStatus = 'failed';
      showBanner(`Execution Failed: ${summary}`, 'warn');
    }

    setAutomations(prev => prev.map(a => {
      if (a.automationId !== auto.automationId) return a;
      return {
        ...a,
        lastExecution: {
          executedAt: `Today, ${nowTime}`,
          overallStatus,
          successCount: successDevCount,
          failureCount: failedDevCount,
          totalCount: total,
          summary,
        },
      };
    }));
  };

  // Simulate Reconnecting an Offline Device (DEV004) to demonstrate automatic reconnect schedule sync
  const handleSimulateDeviceReconnect = (deviceId: string) => {
    setDevices(prev => prev.map(d => {
      if (d.id !== deviceId) return d;
      return { ...d, isOnline: true };
    }));

    // Update pending automations for this device
    setAutomations(prev => prev.map(auto => {
      const state = auto.syncSummary.deviceSyncStates[deviceId];
      if (!state) return auto;

      const updatedStates = { ...auto.syncSummary.deviceSyncStates };
      updatedStates[deviceId] = {
        deviceId,
        deviceName: state.deviceName,
        version: auto.version,
        status: 'synced',
        lastSyncAt: 'Just now (Auto-synced on reconnect)',
      };

      const total = auto.syncSummary.totalDevices;
      const synced = (Object.values(updatedStates) as DeviceSyncStatus[]).filter(s => s.status === 'synced').length;
      const pending = total - synced;

      return {
        ...auto,
        syncSummary: {
          totalDevices: total,
          syncedDevices: synced,
          pendingDevices: pending,
          offlineDevices: pending,
          deviceSyncStates: updatedStates,
        },
      };
    }));

    showBanner(`Device ${deviceId} reconnected! Automatically requested and burned latest schedule version into ESP32 NVS.`, 'success');
  };

  const filteredHistory = history.filter(h => {
    if (historyFilter === 'ALL') return true;
    if (historyFilter === 'SUCCESS') return h.status === 'SUCCESS';
    if (historyFilter === 'FAILED') return h.status === 'FAILED';
    return true;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      
      {/* Banner Feedback */}
      {bannerMessage && (
        <div className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs ${
          bannerMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : bannerMessage.type === 'warn'
            ? 'bg-amber-50 text-amber-800 border border-amber-200'
            : 'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          <div className="flex items-center space-x-2">
            {bannerMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : bannerMessage.type === 'warn' ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span>{bannerMessage.text}</span>
          </div>
          <button onClick={() => setBannerMessage(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Scheduler Navigation Bar */}
      <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-black text-slate-900">Multi-Device Scheduling & Automations</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Single-engine scheduling across all devices, rooms, floors, and buildings with offline ESP32 NVS execution
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('automations')}
              className={`px-3 py-1.5 rounded-xl transition ${
                activeTab === 'automations' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Schedules ({automations.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-xl transition ${
                activeTab === 'history' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Execution History
            </button>
            <button
              onClick={() => setActiveTab('esp_sync')}
              className={`px-3 py-1.5 rounded-xl transition flex items-center space-x-1 ${
                activeTab === 'esp_sync' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5 text-blue-600" />
              <span>ESP32 Sync</span>
            </button>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="px-3.5 py-1.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm shadow-blue-500/30 transition shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Create Schedule</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      {/* TAB 1: AUTOMATIONS LIST */}
      {activeTab === 'automations' && (
        <div className="space-y-3">
          {automations.map(auto => {
            const isPartial = auto.lastExecution?.overallStatus === 'partial_success';
            const isFailed = auto.lastExecution?.overallStatus === 'failed';
            const hasPendingOffline = auto.syncSummary.offlineDevices > 0;

            return (
              <div
                key={auto.automationId}
                className={`bg-white rounded-3xl p-5 border transition shadow-xs ${
                  auto.enabled ? 'border-slate-200/80 hover:border-slate-300' : 'border-slate-200/50 opacity-70 bg-slate-50/50'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-start space-x-3.5">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      auto.enabled ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Clock className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-extrabold text-slate-900">{auto.name}</h4>
                        
                        {/* Target Type Badge */}
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                          {auto.targetType === 'all' && 'All Devices'}
                          {auto.targetType === 'specific_device' && 'Specific Device'}
                          {auto.targetType === 'multiple_devices' && 'Multiple Devices'}
                          {auto.targetType === 'different_actions' && 'Multi-Device Matrix'}
                          {auto.targetType === 'room' && `Room: ${auto.targetScope?.roomName}`}
                          {auto.targetType === 'floor' && `Floor: ${auto.targetScope?.floorName}`}
                          {auto.targetType === 'building' && `Building: ${auto.targetScope?.buildingName}`}
                        </span>

                        {/* Version badge */}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          v{auto.version}
                        </span>

                        {/* Repeat Timing */}
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          {auto.schedule.time} ({auto.schedule.days.join(', ')})
                        </span>
                      </div>

                      {/* Sync status & Execution stats */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1.5">
                        {/* Sync Pill */}
                        <span className="flex items-center space-x-1 font-medium">
                          {hasPendingOffline ? (
                            <span className="text-amber-600 flex items-center space-x-1 font-semibold">
                              <WifiOff className="w-3.5 h-3.5" />
                              <span>{auto.syncSummary.syncedDevices}/{auto.syncSummary.totalDevices} synced ({auto.syncSummary.offlineDevices} offline pending)</span>
                            </span>
                          ) : (
                            <span className="text-emerald-600 flex items-center space-x-1 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{auto.syncSummary.totalDevices}/{auto.syncSummary.totalDevices} devices synced to NVS</span>
                            </span>
                          )}
                        </span>

                        {/* Last Run Summary */}
                        {auto.lastExecution && (
                          <>
                            <span>•</span>
                            <span className={isFailed ? 'text-rose-600 font-semibold' : isPartial ? 'text-amber-600 font-semibold' : 'text-slate-600'}>
                              Last Run: {auto.lastExecution.summary}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Right Side */}
                  <div className="flex items-center space-x-2 self-end md:self-center">
                    <button
                      onClick={() => handleExecuteNow(auto)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 flex items-center space-x-1 transition active:scale-95"
                      title="Test / Execute schedule now across all targeted devices"
                    >
                      <Play className="w-3.5 h-3.5 fill-emerald-700" />
                      <span>Test / Run</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(auto)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleToggleEnable(auto.automationId)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                        auto.enabled 
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100' 
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      {auto.enabled ? 'Enabled' : 'Disabled'}
                    </button>

                    <button
                      onClick={() => handleDeleteAutomation(auto.automationId)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                      title="Delete Schedule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Sub-actions matrix table (Scannable device breakdown) */}
                <div className="mt-3 pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Configured Device Actions ({auto.actions.length}):
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {auto.actions.map(act => (
                      <div 
                        key={act.id} 
                        className="p-2.5 bg-slate-50/70 rounded-2xl border border-slate-100 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800 leading-snug">{act.deviceName}</p>
                          <p className="text-[11px] text-slate-500">
                            {act.roomName} • {act.relayName} (R{act.relay})
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                          act.action === 'ON' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {act.action}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: EXECUTION HISTORY (AUDIT TRAIL & PARTIAL FAILURES) */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Execution Audit Log</h4>
              <p className="text-xs text-slate-500">
                Detailed per-device execution status, timestamps, and offline failure reasons.
              </p>
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setHistoryFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg transition ${historyFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
              >
                All ({history.length})
              </button>
              <button
                onClick={() => setHistoryFilter('SUCCESS')}
                className={`px-2.5 py-1 rounded-lg transition ${historyFilter === 'SUCCESS' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'}`}
              >
                Success
              </button>
              <button
                onClick={() => setHistoryFilter('FAILED')}
                className={`px-2.5 py-1 rounded-lg transition ${historyFilter === 'FAILED' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600'}`}
              >
                Failures / Offline
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Automation</th>
                    <th className="py-3 px-4">Device & Room</th>
                    <th className="py-3 px-4">Relay Channel</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Execution Source</th>
                    <th className="py-3 px-4">Status & Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredHistory.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {item.executionTime}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {item.automationName}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{item.deviceName}</div>
                        <div className="text-[10px] text-slate-400">{item.deviceId}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium">{item.relayName}</span>
                        <span className="text-[10px] text-slate-400 ml-1">(R{item.relay})</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          item.action === 'ON' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {item.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {item.isOfflineExecuted ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center space-x-1 w-fit">
                            <HardDrive className="w-3 h-3" />
                            <span>ESP32 RTC (Offline)</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center space-x-1 w-fit">
                            <Wifi className="w-3 h-3" />
                            <span>Cloud MQTT</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {item.status === 'SUCCESS' ? (
                          <span className="flex items-center space-x-1 text-emerald-700 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Success</span>
                          </span>
                        ) : (
                          <div>
                            <span className="flex items-center space-x-1 text-rose-600 font-bold">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Failed</span>
                            </span>
                            {item.failureReason && (
                              <p className="text-[10px] text-rose-500 mt-0.5 font-medium max-w-xs">
                                {item.failureReason}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ESP32 SYNC & OFFLINE ENGINE STATUS */}
      {activeTab === 'esp_sync' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                  <HardDrive className="w-5 h-5 text-blue-600" />
                  <span>ESP32 Hardware Schedule Sync Engine</span>
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Each ESP32 burns its individual slice of schedules into local NVS flash memory. Even if your home loses internet connection, the device's high-precision RTC clock executes its scheduled relays on time!
                </p>
              </div>

              {/* Offline device reconnect simulator */}
              {devices.some(d => !d.isOnline) && (
                <button
                  onClick={() => handleSimulateDeviceReconnect('DEV004')}
                  className="px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
                >
                  <Wifi className="w-4 h-4" />
                  <span>Simulate DEV004 Reconnect</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {devices.map(dev => (
              <div
                key={dev.id}
                className="bg-white rounded-3xl p-4 border border-slate-100 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                      dev.isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'
                    }`}>
                      {dev.isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-slate-900">{dev.name}</h5>
                      <p className="text-xs text-slate-500 font-mono">{dev.serialNumber}</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    dev.isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {dev.isOnline ? 'Online (MQTT Connected)' : 'Offline'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-2xl text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Location</span>
                    <span className="font-bold text-slate-700">{dev.room}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">NVS Version</span>
                    <span className="font-bold text-blue-700">v{dev.nvsScheduleVersion}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">RTC Clock</span>
                    <span className="font-bold text-emerald-700">SNTP Synced</span>
                  </div>
                </div>

                {/* Inspect device-specific NVS MQTT payload */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-500">
                    {dev.gangCount}-gang switch • {dev.channels.length} relays active
                  </span>

                  <button
                    onClick={() => {
                      const sampleAuto = automations[0];
                      setInspectingPayload({ automation: sampleAuto, deviceId: dev.id });
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>View MQTT Payload</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT MULTI-DEVICE AUTOMATION */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span>{editingAutomationId ? 'Edit Multi-Device Schedule' : 'Create Multi-Device Schedule'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure schedule timing, target devices, and per-relay actions
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveAutomation} className="overflow-y-auto flex-1 p-5 space-y-4">
              
              {/* Basic Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Automation Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Night Mode, Evening Mood, Office Energy Saver"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Time (24H) *
                    </label>
                    <input
                      type="time"
                      required
                      value={formTime}
                      onChange={e => setFormTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Repeat Frequency
                    </label>
                    <select
                      value={formType}
                      onChange={e => setFormType(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-medium"
                    >
                      <option value="daily">Every Day</option>
                      <option value="weekly">Custom Days</option>
                      <option value="once">Once</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Days Selector */}
              {formType !== 'once' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Active Days:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map(day => {
                      const isSelected = formDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              if (formDays.length > 1) setFormDays(formDays.filter(d => d !== day));
                            } else {
                              setFormDays([...formDays, day]);
                            }
                          }}
                          className={`px-3 py-1 text-xs font-bold rounded-xl transition ${
                            isSelected 
                              ? 'bg-blue-600 text-white shadow-xs' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TARGET DEVICES SELECTION (The 7 requested options!) */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-black text-slate-800 mb-2 uppercase tracking-wider">
                  Target Devices Selection:
                </label>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  {[
                    { id: 'different_actions', label: 'Different Devices / Actions Matrix', desc: 'Dynamic per-relay actions' },
                    { id: 'all', label: 'All Devices', desc: 'Entire home / building' },
                    { id: 'specific_device', label: 'Specific Device', desc: 'Single switch' },
                    { id: 'multiple_devices', label: 'Multiple Devices', desc: 'Select switch list' },
                    { id: 'room', label: 'Room Based', desc: 'Living Room, Bedroom, etc.' },
                    { id: 'floor', label: 'Floor Based', desc: 'Ground, 1st, 2nd floor' },
                    { id: 'building', label: 'Building / Home', desc: 'Entire property' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFormTargetType(opt.id as TargetType)}
                      className={`p-2.5 text-left rounded-2xl border transition flex flex-col justify-between ${
                        formTargetType === opt.id
                          ? 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-400 text-blue-950 font-bold'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <span className="text-xs font-bold leading-tight">{opt.label}</span>
                      <span className="text-[10px] text-slate-500 font-normal mt-1">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scope selectors based on chosen target type */}
              {formTargetType === 'room' && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Select Room</label>
                    <select
                      value={formScopeRoom}
                      onChange={e => setFormScopeRoom(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
                    >
                      <option value="Living Room">Living Room</option>
                      <option value="Master Bedroom">Master Bedroom</option>
                      <option value="Kitchen">Kitchen</option>
                      <option value="Balcony / Porch">Balcony / Porch</option>
                      <option value="Open Workspace">Open Workspace</option>
                      <option value="Conference Hall">Conference Hall</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Action for all room lights</label>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setBulkAction('ON')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-xl ${bulkAction === 'ON' ? 'bg-amber-500 text-white' : 'bg-white border border-slate-200'}`}
                      >
                        Turn ON
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkAction('OFF')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-xl ${bulkAction === 'OFF' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'}`}
                      >
                        Turn OFF
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {formTargetType === 'floor' && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Select Floor</label>
                    <select
                      value={formScopeFloor}
                      onChange={e => setFormScopeFloor(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
                    >
                      <option value="Ground Floor">Ground Floor</option>
                      <option value="First Floor">First Floor</option>
                      <option value="Floor 4">Floor 4 (Office)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Action for entire floor</label>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setBulkAction('ON')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-xl ${bulkAction === 'ON' ? 'bg-amber-500 text-white' : 'bg-white border border-slate-200'}`}
                      >
                        Turn ON
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkAction('OFF')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-xl ${bulkAction === 'OFF' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'}`}
                      >
                        Turn OFF
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {formTargetType === 'specific_device' && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Select Smart Switch</label>
                      <select
                        value={formScopeDevice}
                        onChange={e => setFormScopeDevice(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl"
                      >
                        {devices.map(d => (
                          <option key={d.id} value={d.id}>{d.name} ({d.room})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Action</label>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => setBulkAction('ON')}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-xl ${bulkAction === 'ON' ? 'bg-amber-500 text-white' : 'bg-white border border-slate-200'}`}
                        >
                          Turn ON
                        </button>
                        <button
                          type="button"
                          onClick={() => setBulkAction('OFF')}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-xl ${bulkAction === 'OFF' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200'}`}
                        >
                          Turn OFF
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Individual Relay Selection for device */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                      Select Individual Relays to Control:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {devices.find(d => d.id === formScopeDevice)?.channels.map(ch => {
                        const isChecked = bulkSelectedRelays.includes(ch.relay);
                        return (
                          <button
                            key={ch.relay}
                            type="button"
                            onClick={() => {
                              if (isChecked) {
                                if (bulkSelectedRelays.length > 1) {
                                  setBulkSelectedRelays(bulkSelectedRelays.filter(r => r !== ch.relay));
                                }
                              } else {
                                setBulkSelectedRelays([...bulkSelectedRelays, ch.relay]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center space-x-1.5 transition ${
                              isChecked
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <span>{ch.name} (Relay {ch.relay})</span>
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* DYNAMIC ROW MATRIX: Different Devices / Different Actions */}
              {formTargetType === 'different_actions' && (
                <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Multi-Device Actions Matrix
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Add device and relay rows with individual ON or OFF commands
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddActionRow}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1 transition shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Add Device Action</span>
                    </button>
                  </div>

                  {/* Rows list */}
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {formActionRows.map((row) => {
                      const currentDev = devices.find(d => d.id === row.deviceId) || devices[0];
                      return (
                        <div 
                          key={row.id}
                          className="p-2.5 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-2 flex-wrap sm:flex-nowrap"
                        >
                          {/* Device Selector */}
                          <div className="flex-1 min-w-[140px]">
                            <select
                              value={row.deviceId}
                              onChange={e => handleUpdateActionRow(row.id, 'deviceId', e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                            >
                              {devices.map(d => (
                                <option key={d.id} value={d.id}>
                                  {d.name} ({d.room})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Relay Selector */}
                          <div className="flex-1 min-w-[130px]">
                            <select
                              value={row.relay}
                              onChange={e => handleUpdateActionRow(row.id, 'relay', Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                            >
                              {currentDev.channels.map(ch => (
                                <option key={ch.relay} value={ch.relay}>
                                  {ch.name} (Relay {ch.relay})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Action ON / OFF */}
                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateActionRow(row.id, 'action', 'ON')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                row.action === 'ON'
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              ON
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateActionRow(row.id, 'action', 'OFF')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                row.action === 'OFF'
                                  ? 'bg-slate-900 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              OFF
                            </button>
                          </div>

                          {/* Delete Row Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveActionRow(row.id)}
                            disabled={formActionRows.length <= 1}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition disabled:opacity-30"
                            title="Remove Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Offline NVS Sync note */}
              <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200/70 text-[11px] text-blue-900 flex items-start space-x-2">
                <HardDrive className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Offline Resilience Guarantee:</strong> This automation will automatically generate device-tailored JSON payload slices over MQTT. Each ESP32-S3 switch burns only its specific relay commands into NVS.
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  {editingAutomationId ? 'Update Schedule & Sync' : 'Save & Sync to Devices'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INSPECT ESP32 MQTT JSON PAYLOAD */}
      {inspectingPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 p-5 space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-slate-900 flex items-center space-x-1.5">
                  <HardDrive className="w-4 h-4 text-blue-600" />
                  <span>ESP32 Device-Specific NVS Payload</span>
                </h4>
                <p className="text-xs text-slate-500 font-mono">
                  Topic: smartswitch/{devices.find(d => d.id === inspectingPayload.deviceId)?.serialNumber}/schedules/set
                </p>
              </div>
              <button
                onClick={() => setInspectingPayload(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-900 text-slate-100 p-3.5 rounded-2xl font-mono text-xs overflow-x-auto">
              <pre>
{JSON.stringify({
  automationId: inspectingPayload.automation.automationId,
  name: inspectingPayload.automation.name,
  version: inspectingPayload.automation.version,
  enabled: inspectingPayload.automation.enabled,
  schedule: inspectingPayload.automation.schedule,
  deviceActions: inspectingPayload.automation.actions
    .filter(a => a.deviceId === inspectingPayload.deviceId)
    .map(a => ({
      relay: a.relay,
      relayName: a.relayName,
      action: a.action,
    })),
  syncTimestamp: new Date().toISOString(),
}, null, 2)}
              </pre>
            </div>

            <p className="text-[11px] text-slate-500">
              * Notice how the ESP32 receives <strong>ONLY</strong> the actions intended for itself, saving memory and processing power while guaranteeing offline execution.
            </p>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setInspectingPayload(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
