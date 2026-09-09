import React, { useState, useEffect } from 'react';
import { 
  Play, 
  RotateCcw, 
  Terminal, 
  Cpu, 
  Database, 
  Zap, 
  Clock, 
  Activity, 
  CheckCircle,
  ToggleLeft,
  Sliders,
  Radio,
  Power,
  ShieldCheck,
  Layers,
  Bell,
  Lightbulb,
  Fan,
  Plug,
  Sparkles
} from 'lucide-react';
import { RelayChannelConfig, GangCount, FreeRTOSEvent, RelayState } from '../types/firmware';
import { ESP_FACTORY_PROFILES } from '../data/espFactoryProfiles';

interface InteractiveTestbenchProps {
  gangCount: GangCount;
  setGangCount: (g: GangCount) => void;
  channels: RelayChannelConfig[];
  onToggle: (id: number) => void;
  onTurnOn: (id: number) => void;
  onTurnOff: (id: number) => void;
  onPulse: (id: number, ms: number) => void;
  onSetAll: (state: RelayState) => void;
  events: FreeRTOSEvent[];
  onClearLogs: () => void;
  onSimulateReboot: () => void;
}

export const InteractiveTestbench: React.FC<InteractiveTestbenchProps> = ({
  gangCount,
  setGangCount,
  channels,
  onToggle,
  onTurnOn,
  onTurnOff,
  onPulse,
  onSetAll,
  events,
  onClearLogs,
  onSimulateReboot,
}) => {
  const [selectedGang, setSelectedGang] = useState<number>(1);
  const [pulseInput, setPulseInput] = useState<number>(500);
  const activeChannels = channels.slice(0, gangCount);

  // Keep selectedGang within valid range when gangCount changes
  useEffect(() => {
    if (selectedGang > gangCount) {
      setSelectedGang(1);
    }
  }, [gangCount, selectedGang]);

  return (
    <div className="space-y-6 text-slate-800">
      {/* Testbench Header */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200">
                HARDWARE-IN-THE-LOOP (HIL)
              </span>
              <span className="text-xs text-slate-500">ESP32-S3 FreeRTOS Kernel Emulation</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">Interactive Relay Testbench</h2>
            <p className="text-xs text-slate-500 mt-1">
              Verify API execution (<code className="text-blue-600">relay.on()</code>, <code className="text-blue-600">relay.off()</code>, <code className="text-blue-600">relay.toggle()</code>, <code className="text-blue-600">relay.pulse()</code>), 
              FreeRTOS mutex arbitration, and NVS power-cycle state restoration.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="simulate-reboot-btn"
              onClick={onSimulateReboot}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 border border-slate-200 flex items-center space-x-1.5 transition font-semibold"
              title="Simulates ESP32-S3 power loss and tests NVS previous state reload"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              <span>Simulate Power Cycle Reboot</span>
            </button>
          </div>
        </div>

        {/* ESP32 Firmware Code Flasher & Hardware Authority Setup */}
        <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">ESP32 Firmware Code Flasher (Hardware Authority Setup)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Flash code to ESP32: Gang count is fixed by the firmware (1 switch = 1 gang, 2 switches = 2 gang). Peripherals (switch, fan, doorbell, socket) are loaded here. The mobile app never decides the gang.
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              Hardware Authority
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 mr-1">Load Code for Fixed Gang:</span>
            {([1, 2, 3, 4, 6, 8, 12, 16] as GangCount[]).map((g) => (
              <button
                key={g}
                id={`testbench-gang-${g}`}
                onClick={() => setGangCount(g)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition ${
                  gangCount === g 
                    ? 'bg-blue-600 text-white shadow-xs font-bold' 
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {g} Gang ({g} {g === 1 ? 'Switch' : 'Switches'})
              </button>
            ))}
          </div>
        </div>

        {/* Burned ESP32 Hardware Manifest Card */}
        {(() => {
          const manifest = ESP_FACTORY_PROFILES[gangCount];
          return (
            <div className="mt-4 p-4 bg-slate-50 border border-blue-200/80 rounded-2xl space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] font-bold border border-blue-300">
                    BURNED IN FIRMWARE
                  </span>
                  <span className="font-mono text-slate-900 font-bold">{manifest.modelId}</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-mono text-emerald-600 font-semibold">{manifest.serialNumber}</span>
                  <span className="text-slate-300">•</span>
                  <span className="font-mono text-blue-700 font-semibold">{manifest.gangCount}-Gang Fixed</span>
                </div>
                <div className="flex items-center space-x-3 text-[11px] text-slate-500 font-mono">
                  <span>MAC: <strong className="text-slate-700">{manifest.macAddress}</strong></span>
                  <span>•</span>
                  <span>PCB: <strong className="text-slate-700">{manifest.hardwareRev}</strong></span>
                </div>
              </div>

              {/* Channels & Peripherals Defined in ESP32 */}
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-[11px] font-bold text-slate-700 block mb-2">
                  Peripherals Loaded into ESP32 NVS & Firmware ({manifest.gangCount} Channels):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {manifest.channels.map((ch) => {
                    const isDoorbell = ch.loadType === 'doorbell';
                    const isFan = ch.loadType === 'fan';
                    const isSocket = ch.loadType === 'socket';
                    const isChandelier = ch.loadType === 'chandelier';

                    return (
                      <div
                        key={ch.gangId}
                        className="px-2.5 py-1.5 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <span className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                            {isDoorbell ? (
                              <Bell className="w-3.5 h-3.5 text-amber-600" />
                            ) : isFan ? (
                              <Fan className="w-3.5 h-3.5 text-cyan-600" />
                            ) : isSocket ? (
                              <Plug className="w-3.5 h-3.5 text-emerald-600" />
                            ) : isChandelier ? (
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            ) : (
                              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                            )}
                          </span>
                          <span className="font-semibold text-slate-800 truncate">
                            G{ch.gangId}: {ch.factoryName}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-1">
                          {isDoorbell ? 'Door Bell (Pulse)' : ch.loadType.toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200/80 leading-relaxed">
                🔒 <strong>ESP32 Authority Rule:</strong> When discovered in the mobile app (via Smart Life AP mode or Bluetooth), this exact gang count and peripheral mapping is reported. The mobile app never decides or changes the gang count.
              </div>
            </div>
          );
        })()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: API Command Execution Terminal */}
        <div className="lg:col-span-6 space-y-6">
          {/* Direct API Exerciser */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Play className="w-4 h-4 text-blue-600" />
                <span>Execute C++ API Function</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                relay.method()
              </span>
            </div>

            {/* Target Gang Selector */}
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">Select Target Gang (1 .. {gangCount}):</label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {activeChannels.map((c) => (
                  <button
                    key={c.id}
                    id={`test-select-gang-${c.id}`}
                    onClick={() => setSelectedGang(c.id)}
                    className={`p-2 rounded-xl text-xs font-mono font-bold transition border ${
                      selectedGang === c.id
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : c.state === 1
                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    G{c.id}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <button
                id="test-api-on"
                onClick={() => onTurnOn(selectedGang)}
                className="py-2 px-3 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition shadow"
              >
                relay.on({selectedGang})
              </button>
              <button
                id="test-api-off"
                onClick={() => onTurnOff(selectedGang)}
                className="py-2 px-3 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white font-mono text-xs font-bold transition shadow"
              >
                relay.off({selectedGang})
              </button>
              <button
                id="test-api-toggle"
                onClick={() => onToggle(selectedGang)}
                className="py-2 px-3 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white font-mono text-xs font-bold transition shadow"
              >
                relay.toggle({selectedGang})
              </button>
              <button
                id="test-api-getstate"
                onClick={() => {
                  const state = activeChannels.find(c => c.id === selectedGang)?.state;
                  alert(`relay.getState(${selectedGang}) returns: ${state} (${state === 1 ? 'RELAY_STATE_ON' : 'RELAY_STATE_OFF'})`);
                }}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-xs font-bold transition"
              >
                relay.getState({selectedGang})
              </button>
            </div>

            {/* Pulse Mode Testing */}
            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-300 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>FreeRTOS Software Timer Pulse Test</span>
                </span>
                <span className="font-mono text-slate-400">{pulseInput} ms</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="100"
                  max="5000"
                  step="100"
                  value={pulseInput}
                  onChange={(e) => setPulseInput(Number(e.target.value))}
                  className="flex-1 accent-amber-500 cursor-pointer"
                />
                <button
                  id="test-api-pulse"
                  onClick={() => onPulse(selectedGang, pulseInput)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-mono font-bold transition whitespace-nowrap shadow-md shadow-amber-600/20"
                >
                  relay.pulse({selectedGang}, {pulseInput})
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Instantly energizes coil, starts non-blocking <code className="text-amber-400">esp_timer</code> or <code className="text-amber-400">xTimer</code>, and de-energizes safely without blocking CPU.
              </p>
            </div>

            {/* Set All / Bulk Actions */}
            <div className="flex items-center space-x-2 pt-2 border-t border-slate-800 text-xs">
              <span className="text-slate-400">Batch Control:</span>
              <button
                id="test-api-setall-on"
                onClick={() => onSetAll(1)}
                className="px-3 py-1.5 bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-700/60 rounded-lg font-mono font-bold"
              >
                relay.setAll(ON)
              </button>
              <button
                id="test-api-setall-off"
                onClick={() => onSetAll(0)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg font-mono font-bold"
              >
                relay.setAll(OFF)
              </button>
            </div>
          </div>

          {/* Physical Coil Hardware Pins Visualizer */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>ESP32-S3 Physical Pin & Coil State Monitor</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {activeChannels.map((c) => {
                const isOn = c.state === 1;
                return (
                  <div
                    key={c.id}
                    className={`p-3 rounded-xl border transition ${
                      isOn 
                        ? 'bg-blue-950/50 border-blue-500/70 shadow-md shadow-blue-500/20' 
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">Gang {c.id}</span>
                      <span className={`w-2.5 h-2.5 rounded-full ${isOn ? 'bg-blue-400 shadow-sm shadow-blue-400 animate-pulse' : 'bg-slate-700'}`}></span>
                    </div>
                    <div className="mt-2 text-[11px] font-mono space-y-0.5">
                      <p className="text-slate-400">GPIO: <span className="text-white font-bold">{c.gpioPin}</span></p>
                      <p className="text-slate-400">Level: <span className={isOn ? "text-emerald-400 font-bold" : "text-slate-500"}>
                        {c.activeLevel === 'LOW' ? (isOn ? 'LOW (0V)' : 'HIGH (3.3V)') : (isOn ? 'HIGH (3.3V)' : 'LOW (0V)')}
                      </span></p>
                      <p className="text-slate-400">Cycles: <span className="text-slate-300 font-bold">{c.cycleCount}</span></p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live FreeRTOS Log Terminal */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col flex-1 shadow-2xl">
            {/* Terminal Top Bar */}
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold text-slate-200">ESP32-S3 FreeRTOS Kernel Log</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                <button
                  id="clear-logs-btn"
                  onClick={onClearLogs}
                  className="text-[11px] text-slate-400 hover:text-slate-200 hover:underline"
                >
                  Clear Logs
                </button>
              </div>
            </div>

            {/* Terminal Body */}
            <div className="p-4 flex-1 overflow-y-auto max-h-[580px] font-mono text-xs space-y-2 bg-slate-950/95">
              {events.length === 0 ? (
                <div className="text-slate-600 text-center py-12">
                  No kernel events yet. Click any API button or toggle switch to stream events.
                </div>
              ) : (
                events.map((evt, idx) => (
                  <div key={idx} className="flex items-start space-x-2 leading-relaxed">
                    <span className="text-slate-600 select-none">[{evt.timestamp}]</span>
                    <span className={`font-bold ${
                      evt.source === 'TASK_RELAY' ? 'text-blue-400' :
                      evt.source === 'TIMER_PULSE' ? 'text-amber-400' :
                      evt.source === 'NVS_STORAGE' ? 'text-purple-400' :
                      'text-emerald-400'
                    }`}>
                      [{evt.source}]
                    </span>
                    <span className="text-slate-400">G{evt.gang}:</span>
                    <span className="text-slate-200">{evt.details}</span>
                  </div>
                ))
              )}
            </div>

            {/* Terminal Footer Status */}
            <div className="px-4 py-2 bg-slate-900/80 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>Mutex: <span className="text-emerald-400 font-bold">StaticSemaphore_t (Ready)</span></span>
              <span>Stack High Water Mark: <span className="text-blue-400 font-bold">1784 words</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
