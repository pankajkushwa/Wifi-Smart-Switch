import React, { useState } from 'react';
import { 
  Cpu, 
  Layers, 
  FolderTree, 
  Code2, 
  FileCode, 
  CheckCircle2, 
  Copy, 
  Check, 
  ArrowRight, 
  AlertTriangle, 
  Zap, 
  Shield, 
  Terminal,
  FileText
} from 'lucide-react';
import { 
  MODULE_1_METADATA, 
  CODE_COMMON_HEADER, 
  CODE_ESP_IDF_SOURCE, 
  CODE_ARDUINO_SOURCE, 
  CODE_EXAMPLE_USAGE, 
  CODE_UNIT_TEST 
} from '../data/firmwareModule1Code';

interface FirmwareModuleViewProps {
  onModuleApproved?: () => void;
  isApproved?: boolean;
}

export const FirmwareModuleView: React.FC<FirmwareModuleViewProps> = ({
  onModuleApproved,
  isApproved = false,
}) => {
  const [activeCodeTab, setActiveCodeTab] = useState<'header' | 'idf_src' | 'ard_src' | 'example' | 'tests'>('header');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getActiveCode = () => {
    switch (activeCodeTab) {
      case 'header': return { code: CODE_COMMON_HEADER, filename: 'common/relay/relay.h' };
      case 'idf_src': return { code: CODE_ESP_IDF_SOURCE, filename: 'platform/esp_idf/relay_esp_idf.c' };
      case 'ard_src': return { code: CODE_ARDUINO_SOURCE, filename: 'platform/arduino/relay_arduino.cpp' };
      case 'example': return { code: CODE_EXAMPLE_USAGE, filename: 'examples/relay_dual_usage.cpp' };
      case 'tests': return { code: CODE_UNIT_TEST, filename: 'tests/test_relay.cpp' };
    }
  };

  const activeCodeData = getActiveCode();

  return (
    <div className="space-y-8 text-slate-100">
      {/* Module Header & Status Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                MODULE 01 OF 14
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Ready for Approval</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mt-2">
              Relay Driver & Controller Subsystem
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Commercial-grade, thread-safe FreeRTOS relay actuation layer for ESP32-S3. Supports 1 to 16 Gangs, 
              Latching, Momentary, and non-blocking FreeRTOS software timer Pulse modes with zero post-boot heap allocations.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              id="approve-module-btn"
              onClick={onModuleApproved}
              disabled={isApproved}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center space-x-2 transition-all ${
                isApproved
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/25 active:scale-95'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isApproved ? 'Module 1 Approved ✓' : 'Approve Module 1 & Next'}</span>
            </button>
          </div>
        </div>

        {/* Quick Specs Pill Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800 text-xs">
          <div>
            <span className="text-slate-400">Target MCU:</span>
            <p className="font-semibold text-white font-mono mt-0.5">ESP32-S3-WROOM-N8R8</p>
          </div>
          <div>
            <span className="text-slate-400">Supported Gangs:</span>
            <p className="font-semibold text-white font-mono mt-0.5">1G, 2G, 4G, 6G, 8G, 16G</p>
          </div>
          <div>
            <span className="text-slate-400">Concurrency:</span>
            <p className="font-semibold text-white font-mono mt-0.5">Static FreeRTOS Mutex</p>
          </div>
          <div>
            <span className="text-slate-400">Memory Profile:</span>
            <p className="font-semibold text-emerald-400 font-mono mt-0.5">0 bytes dynamic heap</p>
          </div>
        </div>
      </div>

      {/* 10 Required Sub-Sections as mandated by user prompt */}
      <div className="space-y-6">

        {/* Section 1: Architecture */}
        <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono text-blue-400">SECTION 01</span>
              <h3 className="text-lg font-bold text-white">Subsystem Architecture</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm text-slate-300">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <h4 className="font-semibold text-white flex items-center space-x-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Layered Abstraction (HAL)</span>
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                The business logic (<code className="text-blue-300">relay.h</code>) exposes a uniform API (<code className="text-blue-300">relay.on()</code>, <code className="text-blue-300">relay.off()</code>, <code className="text-blue-300">relay.toggle()</code>) across both ESP-IDF and Arduino Core. Direct GPIO manipulation is isolated into platform-specific driver backends.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <h4 className="font-semibold text-white flex items-center space-x-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>FreeRTOS Thread Safety</span>
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                All public operations take a statically allocated FreeRTOS mutex (<code className="text-amber-300">xSemaphoreCreateMutexStatic</code>). Relays can be safely actuated concurrently by the MQTT task, Physical Touch ISR/Task, WebServer, or Scheduler without race conditions.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <h4 className="font-semibold text-white flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                <span>Deterministic Pulse Timers</span>
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pulse mode uses ESP-IDF <code className="text-blue-300">esp_timer</code> or FreeRTOS software timers (<code className="text-blue-300">xTimerCreate</code>). Absolutely no blocking <code className="text-rose-400">delay()</code> or <code className="text-rose-400">vTaskDelay()</code> is ever called inside the API execution path.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Folder Structure */}
        <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono text-indigo-400">SECTION 02</span>
              <h3 className="text-lg font-bold text-white">Repository & Module Folder Structure</h3>
            </div>
          </div>

          <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto">
{`SmartSwitchFirmware/
├── common/
│   └── relay/
│       ├── relay.h               <-- Uniform C/C++ public API for all products
│       └── relay_types.h         <-- Enums (LATCHING, PULSE), gang configs, structs
├── platform/
│   ├── esp_idf/
│   │   └── relay_esp_idf.c       <-- ESP-IDF driver (driver/gpio, esp_timer, FreeRTOS static mutex)
│   └── arduino/
│       └── relay_arduino.cpp     <-- Arduino Core driver (digitalWrite, FreeRTOS xTimer)
├── apps/
│   ├── switch_1g/                <-- Compile configuration for 1-Gang model
│   ├── switch_2g/                <-- Compile configuration for 2-Gang model
│   ├── switch_4g/                <-- Compile configuration for 4-Gang model
│   ├── switch_8g/                <-- Compile configuration for 8-Gang model
│   └── switch_16g/               <-- Compile configuration for 16-Gang commercial board
└── tests/
    └── test_relay.cpp            <-- CMock & Unity automated unit test harness`}
          </pre>
        </div>

        {/* Sections 3-6: Code Browser (Header, ESP-IDF, Arduino, Example, Unit Tests) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900">
            <div className="flex items-center space-x-2">
              <FileCode className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-bold text-white">Production Implementation Code</span>
              <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                {activeCodeData.filename}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                id="copy-active-code-btn"
                onClick={() => copyToClipboard(activeCodeData.code, activeCodeTab)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center space-x-1.5 transition"
              >
                {copiedKey === activeCodeTab ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy File</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Code Tab Navigation */}
          <div className="flex border-b border-slate-800 bg-slate-950/80 px-4 overflow-x-auto">
            {[
              { id: 'header', label: '1. Common Header (relay.h)' },
              { id: 'idf_src', label: '2. ESP-IDF Driver (relay_esp_idf.c)' },
              { id: 'ard_src', label: '3. Arduino Driver (relay_arduino.cpp)' },
              { id: 'example', label: '4. Dual Usage Example (main.cpp)' },
              { id: 'tests', label: '5. Unity Unit Tests' },
            ].map((tab) => (
              <button
                key={tab.id}
                id={`code-tab-${tab.id}`}
                onClick={() => setActiveCodeTab(tab.id as any)}
                className={`py-3 px-4 text-xs font-medium border-b-2 whitespace-nowrap transition-all ${
                  activeCodeTab === tab.id
                    ? 'border-blue-500 text-blue-400 bg-blue-500/5 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Code Editor Container */}
          <div className="p-4 bg-slate-950 overflow-x-auto max-h-[480px]">
            <pre className="text-xs font-mono text-slate-300 leading-relaxed">
              <code>{activeCodeData.code}</code>
            </pre>
          </div>
        </div>

        {/* Section 8: Unit Testing Method */}
        <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono text-emerald-400">SECTION 08</span>
              <h3 className="text-lg font-bold text-white">Unit Testing & Hardware-in-the-Loop (HIL) Method</h3>
            </div>
          </div>
          <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
            <p>
              1. <strong>Mock GPIO Verification:</strong> On native desktop compilation (x86/Linux host), the <code className="text-blue-300">gpio_set_level</code> call is redirected to a mock register array to assert pin state transitions without physical hardware.
            </p>
            <p>
              2. <strong>Concurrency & Race Condition Stress Test:</strong> Spawn 4 separate FreeRTOS tasks (Task 1: Touch switch, Task 2: MQTT receiver, Task 3: Scheduler, Task 4: Local Timer). Have all 4 tasks rapidly actuate <code className="text-blue-300">relay.toggle(1)</code> 5,000 times concurrently. Assert that the FreeRTOS static mutex prevents state corruption and heap fragmentation remains 0 bytes.
            </p>
            <p>
              3. <strong>Pulse Mode Accuracy Test:</strong> Trigger <code className="text-blue-300">relay.pulse(1, 250)</code>. Use high-resolution timer capture or logic analyzer to verify the coil de-energizes within 250ms ± 2ms.
            </p>
          </div>
        </div>

        {/* Section 9: Future Improvements */}
        <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono text-amber-400">SECTION 09</span>
              <h3 className="text-lg font-bold text-white">Future Commercial Product Expansions</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <h5 className="font-semibold text-amber-300 mb-1">Zero-Cross Switching (ZCD)</h5>
              <p className="text-slate-400">
                Synchronize relay closure with the AC mains zero-crossing point (0V) to eliminate arcing, prolonging mechanical relay contact lifespan to over 200,000 cycles.
              </p>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <h5 className="font-semibold text-amber-300 mb-1">Cycle Count NVS Persistence</h5>
              <p className="text-slate-400">
                Commit relay actuation count (<code className="text-blue-300">cycle_count</code>) to flash memory every 100 cycles to provide predictive maintenance telemetry via MQTT.
              </p>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <h5 className="font-semibold text-amber-300 mb-1">Triac / Dimmer Subclass</h5>
              <p className="text-slate-400">
                Because <code className="text-blue-300">RelayController</code> uses a standardized interface, a future <code className="text-blue-300">DimmerController</code> will seamlessly inherit the same API surface with phase-angle control.
              </p>
            </div>
          </div>
        </div>

        {/* Section 10: Migration Notes */}
        <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono text-rose-400">SECTION 10</span>
              <h3 className="text-lg font-bold text-white">Migration Notes: ESP-IDF vs Arduino Core</h3>
            </div>
          </div>
          <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
            <p>
              • <strong>ESP32-S3 GPIO Constraints:</strong> On the ESP32-S3-WROOM-N8R8 module, avoid using strapping pins (GPIO 0, GPIO 3, GPIO 45, GPIO 46) and internal Octal SPI Flash/PSRAM pins (GPIO 33–37) for relay coils. Recommended general GPIOs for 16-Gang are GPIO 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17.
            </p>
            <p>
              • <strong>Arduino Core 3.0 (IDF 5.1 underlying):</strong> In Arduino Core 3.x, <code className="text-blue-300">digitalWrite()</code> has minimal overhead. However, the ESP-IDF driver utilizes direct register write for &lt; 200 nanosecond reaction time.
            </p>
            <p>
              • <strong>Optocoupler Active-Low vs Active-High:</strong> Most commercial 5V relay modules with PC817 optocouplers are active LOW. Ensure <code className="text-blue-300">RELAY_ACTIVE_LOW</code> is set in the hardware profile.
            </p>
          </div>
        </div>

      </div>

      {/* Approval Next Steps Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-white text-base">Module 1 is Ready for Your Approval</h4>
          <p className="text-slate-300 text-xs mt-1">
            As mandated by the workflow rules, development halts until you review and approve this Relay Driver Subsystem.
            Upon your sign-off, we immediately proceed to <strong>Module 2: Touch Subsystem (TTP223 / TTP229 8-16 Key with Debounce, Long-press & Double-click)</strong>.
          </p>
        </div>
        <button
          id="confirm-approval-bottom-btn"
          onClick={onModuleApproved}
          disabled={isApproved}
          className={`px-6 py-3 rounded-xl font-semibold text-xs uppercase tracking-wider transition whitespace-nowrap ${
            isApproved 
              ? 'bg-emerald-600 text-white' 
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 active:scale-95'
          }`}
        >
          {isApproved ? 'Approved for Module 2 ✓' : 'Approve & Request Module 2'}
        </button>
      </div>
    </div>
  );
};
