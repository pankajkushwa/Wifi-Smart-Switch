import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Smartphone, 
  Code2, 
  Terminal, 
  CheckCircle2, 
  Activity, 
  Layers, 
  Wifi, 
  ShieldCheck, 
  FileCode,
  Zap,
  RotateCcw,
  Sparkles,
  Plus,
  FolderGit2,
  Calendar
} from 'lucide-react';
import { GangCount, RelayChannelConfig, RelayState, FreeRTOSEvent } from './types/firmware';
import { ESP_FACTORY_PROFILES } from './data/espFactoryProfiles';
import { MobileAppView } from './components/MobileAppView';
import { FirmwareModuleView } from './components/FirmwareModuleView';
import { InteractiveTestbench } from './components/InteractiveTestbench';
import { MobileCodeModal } from './components/MobileCodeModal';
import { AddDeviceModal, DiscoveredEspDevice } from './components/AddDeviceModal';
import { SourceCodeExplorer } from './components/SourceCodeExplorer';
import { MultiDeviceScheduler } from './components/MultiDeviceScheduler';

const createChannelsFromProfile = (gangCount: GangCount, savedStates?: Record<number, RelayState>): RelayChannelConfig[] => {
  const profile = ESP_FACTORY_PROFILES[gangCount];
  return profile.channels.map((ch) => ({
    id: ch.gangId,
    name: ch.factoryName,
    gpioPin: ch.gpioPin,
    activeLevel: ch.activeLevel,
    mode: ch.defaultMode,
    pulseDurationMs: ch.pulseDurationMs,
    restoreLastState: true,
    defaultState: 0,
    state: savedStates && savedStates[ch.gangId] !== undefined ? savedStates[ch.gangId] : 0,
    cycleCount: Math.floor(Math.random() * 50) + 10,
    icon: ch.loadType,
    isReadOnly: true,
  }));
};

export default function App() {
  const [gangCount, setGangCount] = useState<GangCount>(4);
  const [channels, setChannels] = useState<RelayChannelConfig[]>(() => {
    let savedStates: Record<number, RelayState> | undefined;
    const saved = localStorage.getItem('esp32_relay_states');
    if (saved) {
      try {
        savedStates = JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return createChannelsFromProfile(4, savedStates);
  });

  const [activeView, setActiveView] = useState<'firmware' | 'mobile' | 'code-repo' | 'testbench' | 'roadmap' | 'scheduling'>('code-repo');
  const [isModule1Approved, setIsModule1Approved] = useState(false);
  const [showMobileCodeModal, setShowMobileCodeModal] = useState(false);
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false);
  const [wifiSsid, setWifiSsid] = useState('Home_Fiber_2.4G');
  const [deviceIp, setDeviceIp] = useState('192.168.1.145');
  const [freeHeap, setFreeHeap] = useState(284160); // ~277 KB FreeRTOS Heap
  const [mqttConnected, setMqttConnected] = useState(true);
  const [events, setEvents] = useState<FreeRTOSEvent[]>([
    { timestamp: '00:00:01.020', source: 'TASK_RELAY', action: 'INIT', gang: 0, details: 'relay_subsystem_init(&esp_device_manifest) successful. 4-Gang static profile locked.' },
    { timestamp: '00:00:01.025', source: 'TASK_RELAY', action: 'MANIFEST', gang: 0, details: 'ESP32 Authority: Model=LUMIERE-S3-4G-TOUCH, SN=SN:ESP32S3-4G-2026-X883B. Switch names & load classifications fixed.' },
    { timestamp: '00:00:01.035', source: 'NVS_STORAGE', action: 'RESTORE', gang: 1, details: 'Restored previous state RELAY_STATE_ON for Main Chandelier from NVS.' },
    { timestamp: '00:00:01.040', source: 'NVS_STORAGE', action: 'RESTORE', gang: 3, details: 'Restored previous state RELAY_STATE_ON for Ambient Downlights from NVS.' },
  ]);

  // Handle hardware model switch (from HIL testbench)
  const handleSetGangCount = (newGang: GangCount) => {
    setGangCount(newGang);
    const profile = ESP_FACTORY_PROFILES[newGang];
    setChannels(createChannelsFromProfile(newGang));
    addEvent('TASK_RELAY', 'HW_SWITCH', 0, `[ESP32-S3 HW Swapped] Switched to ${profile.modelId} (${profile.gangCount}-Gang, ${profile.serialNumber}). Manifest broadcasted as READ-ONLY.`);
  };

  // Handle device provisioned via Smart Life AP mode flow
  const handleDeviceProvisioned = (device: DiscoveredEspDevice, homeSsid: string, assignedIp: string) => {
    setWifiSsid(homeSsid);
    setDeviceIp(assignedIp);
    setGangCount(device.gangCount);
    setChannels(createChannelsFromProfile(device.gangCount));
    addEvent('TASK_WIFI', 'SOFTAP_PROV', 0, `[Smart Life AP Mode] Smartphone connected to SoftAP (${device.apIp}). Provisioned SSID: "${homeSsid}".`);
    addEvent('TASK_WIFI', 'STA_GOT_IP', 0, `[DHCP] SYSTEM_EVENT_STA_GOT_IP: Local IP=${assignedIp}, Netmask=255.255.255.0, Gateway=192.168.1.1.`);
    addEvent('TASK_MQTT', 'CONNECT', 0, `[MQTT mTLS] Connected to cloud broker. Registered device ${device.modelId} (${device.serialNumber}).`);
    setActiveView('mobile');
  };

  // Persist relay states to simulate NVS
  useEffect(() => {
    const statesMap: Record<number, RelayState> = {};
    channels.forEach(ch => {
      statesMap[ch.id] = ch.state;
    });
    localStorage.setItem('esp32_relay_states', JSON.stringify(statesMap));
  }, [channels]);

  const addEvent = (source: FreeRTOSEvent['source'], action: string, gang: number, details: string) => {
    const now = new Date();
    const ts = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
    setEvents(prev => [
      { timestamp: ts, source, action, gang, details },
      ...prev.slice(0, 75) // Keep last 75 events
    ]);
  };

  const handleToggle = (id: number) => {
    setChannels(prev => prev.map(ch => {
      if (ch.id === id) {
        const nextState = (ch.state === 1 ? 0 : 1) as RelayState;
        const nextCycles = nextState === 1 ? ch.cycleCount + 1 : ch.cycleCount;
        addEvent('TASK_RELAY', 'TOGGLE', id, `relay.toggle(${id}) -> newState=${nextState} (Pin GPIO ${ch.gpioPin} -> ${ch.activeLevel === 'LOW' ? (nextState === 1 ? '0V LOW' : '3.3V HIGH') : (nextState === 1 ? '3.3V HIGH' : '0V LOW')})`);
        return { ...ch, state: nextState, cycleCount: nextCycles };
      }
      return ch;
    }));
  };

  const handleTurnOn = (id: number) => {
    setChannels(prev => prev.map(ch => {
      if (ch.id === id) {
        if (ch.state !== 1) {
          addEvent('TASK_RELAY', 'ON', id, `relay.on(${id}) -> Coil energized. FreeRTOS Mutex released.`);
          return { ...ch, state: 1, cycleCount: ch.cycleCount + 1 };
        }
        return ch;
      }
      return ch;
    }));
  };

  const handleTurnOff = (id: number) => {
    setChannels(prev => prev.map(ch => {
      if (ch.id === id) {
        if (ch.state !== 0) {
          addEvent('TASK_RELAY', 'OFF', id, `relay.off(${id}) -> Coil de-energized. FreeRTOS Mutex released.`);
          return { ...ch, state: 0 };
        }
        return ch;
      }
      return ch;
    }));
  };

  const handlePulse = (id: number, ms: number) => {
    handleTurnOn(id);
    addEvent('TIMER_PULSE', 'START', id, `relay.pulse(${id}, ${ms}ms) -> Non-blocking FreeRTOS software timer registered.`);
    
    // Simulate FreeRTOS software timer callback
    setTimeout(() => {
      handleTurnOff(id);
      addEvent('TIMER_PULSE', 'EXPIRE', id, `Software timer callback triggered for Gang ${id}. Coil turned OFF automatically.`);
    }, ms);
  };

  const handleSetAll = (state: RelayState) => {
    setChannels(prev => prev.map((ch, idx) => {
      if (idx < gangCount) {
        return { ...ch, state };
      }
      return ch;
    }));
    addEvent('TASK_RELAY', 'SET_ALL', 0, `relay.setAll(${state === 1 ? 'ON' : 'OFF'}) actuated across all ${gangCount} active channels.`);
  };

  const handleUpdateChannelMode = (id: number, mode: 'LATCHING' | 'MOMENTARY' | 'PULSE', pulseMs: number) => {
    setChannels(prev => prev.map(ch => {
      if (ch.id === id) {
        addEvent('TASK_RELAY', 'CONFIG', id, `Updated mode to ${mode} (pulseDuration=${pulseMs}ms).`);
        return { ...ch, mode, pulseDurationMs: pulseMs };
      }
      return ch;
    }));
  };

  const handleRenameChannel = (id: number, name: string) => {
    setChannels(prev => prev.map(ch => ch.id === id ? { ...ch, name } : ch));
    addEvent('NVS_STORAGE', 'SAVE_NAME', id, `Committed channel alias "${name}" to NVS.`);
  };

  const handleSimulateReboot = () => {
    addEvent('TASK_RELAY', 'REBOOT', 0, 'ESP32-S3 Watchdog/Power Cycle Reset. Initializing FreeRTOS...');
    setTimeout(() => {
      addEvent('TASK_RELAY', 'INIT', 0, 'relay_subsystem_init() executed on CPU Core 1.');
      addEvent('NVS_STORAGE', 'READ', 0, 'Reading saved states from NVS...');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Main Navigation Header (Clean Light Theme) */}
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          
          {/* Brand & Project Identity */}
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Commercial Smart Touch Switch
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  ESP32-S3-WROOM-N8R8
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center space-x-2">
                <span>Dual Engine: ESP-IDF v5.2+ & Arduino Core v3.0+</span>
                <span>•</span>
                <span className="text-emerald-600 font-mono font-semibold">FreeRTOS Safe</span>
              </p>
            </div>
          </div>

          {/* Primary View Switcher Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 text-xs">
            <button
              id="tab-code-repo"
              onClick={() => setActiveView('code-repo')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 ${
                activeView === 'code-repo'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-blue-600'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>ESP32 & App Code</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeView === 'code-repo' ? 'bg-blue-700 text-white' : 'bg-emerald-100 text-emerald-700 font-bold'
              }`}>
                Repository
              </span>
            </button>

            <button
              id="tab-mobile-app"
              onClick={() => setActiveView('mobile')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 ${
                activeView === 'mobile'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Smart Life App</span>
            </button>

            <button
              id="tab-firmware-module"
              onClick={() => setActiveView('firmware')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 ${
                activeView === 'firmware'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Module 1 (Relay)</span>
            </button>

            <button
              id="tab-testbench"
              onClick={() => setActiveView('testbench')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 ${
                activeView === 'testbench'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>HIL Testbench</span>
            </button>

            <button
              id="tab-roadmap"
              onClick={() => setActiveView('roadmap')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 ${
                activeView === 'roadmap'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>14 Modules</span>
            </button>

            <button
              id="tab-scheduling"
              onClick={() => setActiveView('scheduling')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 ${
                activeView === 'scheduling'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Multi-Device Schedules</span>
            </button>
          </div>

          {/* Quick Action Buttons: Add Device & Mobile Code */}
          <div className="flex items-center space-x-2">
            <button
              id="header-add-device-btn"
              onClick={() => setIsAddDeviceModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm shadow-blue-500/25 flex items-center space-x-1.5 transition active:scale-95"
              title="Scan and pair ESP32 in Access Point mode"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add Device</span>
            </button>

            <button
              id="open-mobile-code-btn"
              onClick={() => setShowMobileCodeModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition"
              title="Get Flutter & React Native production code"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Mobile Code</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6">
        {activeView === 'code-repo' && (
          <SourceCodeExplorer />
        )}

        {activeView === 'firmware' && (
          <FirmwareModuleView 
            isApproved={isModule1Approved}
            onModuleApproved={() => setIsModule1Approved(true)}
          />
        )}

        {activeView === 'mobile' && (
          <div className="space-y-4">
            {/* Context bar */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h3 className="text-sm font-bold text-slate-900">Smart Life IoT Companion Application</h3>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                    Tuya / Smart Life Style
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tap the <strong className="text-blue-600 font-bold">+</strong> button on the top right to discover and pair new smart touch switches.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsAddDeviceModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Pair New Switch</span>
                </button>
                <button
                  onClick={() => setShowMobileCodeModal(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition"
                >
                  Inspect Flutter & RN Code →
                </button>
              </div>
            </div>
            
            <MobileAppView
              gangCount={gangCount}
              channels={channels}
              onToggle={handleToggle}
              onSetAll={handleSetAll}
              onPulse={handlePulse}
              onUpdateChannelMode={handleUpdateChannelMode}
              mqttConnected={mqttConnected}
              freeHeap={freeHeap}
              wifiSsid={wifiSsid}
              deviceIp={deviceIp}
              onOpenAddDevice={() => setIsAddDeviceModalOpen(true)}
            />
          </div>
        )}

        {activeView === 'testbench' && (
          <InteractiveTestbench
            gangCount={gangCount}
            setGangCount={handleSetGangCount}
            channels={channels}
            onToggle={handleToggle}
            onTurnOn={handleTurnOn}
            onTurnOff={handleTurnOff}
            onPulse={handlePulse}
            onSetAll={handleSetAll}
            events={events}
            onClearLogs={() => setEvents([])}
            onSimulateReboot={handleSimulateReboot}
          />
        )}

        {activeView === 'roadmap' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  ECOSYSTEM ROADMAP
                </span>
                <span className="text-xs text-slate-500">Sequential Development Plan</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mt-2">14 Common Subsystem Modules</h2>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                As strictly required, each module is delivered one at a time with all 10 standard architectural items. 
                Subsequent modules unlock only after your explicit approval of the prior module.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { id: 1, name: 'Relay Driver Subsystem', desc: 'Hardware Abstraction, Latching/Pulse/Momentary modes, FreeRTOS static mutex.', status: isModule1Approved ? 'APPROVED' : 'CURRENT_ACTIVE', badge: 'Module 1' },
                { id: 2, name: 'Touch Subsystem (TTP223 / TTP229)', desc: 'Interrupt-driven debounce, long-press, double-click, 8/16-key I2C/Serial mode.', status: 'PENDING_APPROVAL', badge: 'Module 2' },
                { id: 3, name: 'LED Indicator & Status Engine', desc: 'Per-gang state LEDs, RGB WiFi/MQTT/OTA status blink patterns, non-blocking timers.', status: 'QUEUED', badge: 'Module 3' },
                { id: 4, name: 'Logger & Telemetry Core', desc: 'ESP_LOG and Serial.printf unified wrapper, debug levels, RAM footprint monitor.', status: 'QUEUED', badge: 'Module 4' },
                { id: 5, name: 'Storage Subsystem (NVS & Preferences)', desc: 'Thread-safe non-volatile flash storage for WiFi, MQTT, relay names, calibration.', status: 'QUEUED', badge: 'Module 5' },
                { id: 6, name: 'WiFi Subsystem & Auto-Reconnect', desc: 'FSM WiFi manager, DHCP + Static IP, exponential backoff reconnect, offline fallback.', status: 'QUEUED', badge: 'Module 6' },
                { id: 7, name: 'Provisioning (BLE & SoftAP)', desc: 'Zero-config onboarding, mobile app pairing flow, secure credential transfer.', status: 'QUEUED', badge: 'Module 7' },
                { id: 8, name: 'MQTT Engine (TLS & Cloud Brokers)', desc: 'HiveMQ / EMQX TLS 1.3, LWT, JSON telemetry, command subscription, auto-reconnect.', status: 'QUEUED', badge: 'Module 8' },
                { id: 9, name: 'Device Manager & State Coordinator', desc: 'Central coordinator bridging Touch, Relay, MQTT, and local offline schedules.', status: 'QUEUED', badge: 'Module 9' },
                { id: 10, name: 'Configuration & Dynamic Factory Profiles', desc: 'Compile-time gang count switch (1G, 2G, 4G, 6G, 8G, 16G) and GPIO pin maps.', status: 'QUEUED', badge: 'Module 10' },
                { id: 11, name: 'Security & Certificate Authority', desc: 'Encrypted flash storage, TLS cert verification, Secure Boot preparation.', status: 'QUEUED', badge: 'Module 11' },
                { id: 12, name: 'Scheduler Subsystem', desc: 'Daily, weekly timers, sunrise/sunset calculations, 100% offline autonomy.', status: 'QUEUED', badge: 'Module 12' },
                { id: 13, name: 'Secure HTTPS OTA Subsystem', desc: 'Dual-partition rollback, SHA-256 validation, firmware version check, progress callback.', status: 'QUEUED', badge: 'Module 13' },
                { id: 14, name: 'Utilities & Diagnostics', desc: 'cJSON / ArduinoJson serialization, uptime formatters, CRC32, FreeRTOS stack audit.', status: 'QUEUED', badge: 'Module 14' },
              ].map((m) => (
                <div 
                  key={m.id}
                  className={`p-5 rounded-2xl border transition ${
                    m.status === 'CURRENT_ACTIVE'
                      ? 'bg-blue-50/70 border-blue-500 shadow-sm'
                      : m.status === 'APPROVED'
                      ? 'bg-emerald-50/60 border-emerald-400'
                      : 'bg-white border-slate-200/80 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {m.badge}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      m.status === 'CURRENT_ACTIVE' ? 'bg-blue-100 text-blue-700 border border-blue-300 font-bold' :
                      m.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {m.status === 'CURRENT_ACTIVE' ? 'IN PROGRESS (M01)' : m.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-3">{m.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{m.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'scheduling' && (
          <div className="space-y-4">
            <MultiDeviceScheduler
              currentBuildingId="bld_1"
              onApplyChannelState={(relay, state) => {
                const ch = channels.find(c => c.id === relay);
                if (ch && ch.state !== state) {
                  handleToggle(relay);
                }
              }}
            />
          </div>
        )}
      </main>

      {/* Smart Life Add Device Modal (SoftAP Scan & 2.4GHz Wi-Fi Credentials) */}
      <AddDeviceModal
        isOpen={isAddDeviceModalOpen}
        onClose={() => setIsAddDeviceModalOpen(false)}
        onDeviceProvisioned={handleDeviceProvisioned}
        currentGangCount={gangCount}
      />

      {/* Mobile Code Source Viewer Modal */}
      <MobileCodeModal
        isOpen={showMobileCodeModal}
        onClose={() => setShowMobileCodeModal(false)}
      />

      {/* Footer Status Bar (Clean Light Theme) */}
      <footer className="border-t border-slate-200/80 bg-white py-3 px-4 sm:px-6 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="font-semibold text-slate-700">Smart Touch Switch Ecosystem</span>
          <span>•</span>
          <span className="font-mono">ESP32-S3-WROOM-N8R8</span>
        </div>
        <div className="flex items-center space-x-3 text-[11px]">
          <span>Module 1: Relay Driver</span>
          <span>•</span>
          <span className="text-blue-600 font-semibold cursor-pointer hover:underline" onClick={() => setShowMobileCodeModal(true)}>
            Flutter & React Native Code Ready
          </span>
        </div>
      </footer>
    </div>
  );
}
