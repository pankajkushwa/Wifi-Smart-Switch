import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  Search, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Radio, 
  Cpu, 
  Smartphone, 
  ArrowRight, 
  CheckCircle2, 
  RefreshCw, 
  Layers,
  Lock,
  ChevronRight,
  Sparkles,
  Bell,
  Lightbulb,
  Fan,
  Plug,
  ShieldCheck
} from 'lucide-react';
import { GangCount, EspHardwareManifest, LoadType } from '../types/firmware';
import { ESP_FACTORY_PROFILES } from '../data/espFactoryProfiles';

export interface DiscoveredEspDevice {
  ssid: string;
  modelId: string;
  serialNumber: string;
  gangCount: GangCount;
  rssi: number;
  mac: string;
  apIp: string;
}

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceProvisioned: (device: DiscoveredEspDevice, homeSsid: string, assignedIp: string) => void;
  currentGangCount: GangCount;
}

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({
  isOpen,
  onClose,
  onDeviceProvisioned,
  currentGangCount,
}) => {
  const [step, setStep] = useState<'scanning' | 'select_device' | 'wifi_credentials' | 'connecting' | 'success'>('scanning');
  const [selectedDevice, setSelectedDevice] = useState<DiscoveredEspDevice | null>(null);
  const [homeSsid, setHomeSsid] = useState('Home_Fiber_2.4G');
  const [homePassword, setHomePassword] = useState('SmartHome2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [connectionProgress, setConnectionProgress] = useState<number>(0);
  const [progressStatus, setProgressStatus] = useState<string>('Connecting to ESP32 SoftAP...');
  const [assignedRoom, setAssignedRoom] = useState('Living Room');
  const [assignedIp, setAssignedIp] = useState('192.168.1.145');

  // Discover physical ESP32 device whose gang count & peripherals are determined by ESP32 firmware
  useEffect(() => {
    if (!isOpen) {
      setStep('scanning');
      setConnectionProgress(0);
      return;
    }

    const initialGang = currentGangCount || 4;

    const timer = setTimeout(() => {
      const active = ESP_FACTORY_PROFILES[initialGang];
      const device: DiscoveredEspDevice = {
        ssid: `SmartSwitch-S3-${active.gangCount}G-Setup`,
        modelId: active.modelId,
        serialNumber: active.serialNumber,
        gangCount: active.gangCount,
        rssi: -45,
        mac: active.macAddress,
        apIp: '192.168.4.1'
      };
      setSelectedDevice(device);
      setStep('select_device');
    }, 1800);

    return () => clearTimeout(timer);
  }, [isOpen, currentGangCount]);

  const handleStartConnection = () => {
    if (!homeSsid) return;
    setStep('connecting');
    setConnectionProgress(15);
    setProgressStatus('Connecting to smart switch...');

    setTimeout(() => {
      setConnectionProgress(45);
      setProgressStatus('Sending Wi-Fi network credentials...');
    }, 1200);

    setTimeout(() => {
      setConnectionProgress(75);
      setProgressStatus('Switch connecting to your home Wi-Fi network...');
    }, 2500);

    setTimeout(() => {
      setConnectionProgress(100);
      setProgressStatus('Finishing registration & cloud sync...');
      const genIp = `192.168.1.${Math.floor(Math.random() * 80) + 120}`;
      setAssignedIp(genIp);
      setTimeout(() => {
        setStep('success');
      }, 700);
    }, 3800);
  };

  const handleComplete = () => {
    if (selectedDevice) {
      onDeviceProvisioned(selectedDevice, homeSsid, assignedIp);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white text-slate-800 w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header (Smart Life Style) */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 leading-tight">Add New Device</h3>
              <p className="text-[11px] text-slate-400">Smart Life AP Pairing • 2.4GHz Wi-Fi</p>
            </div>
          </div>
          <button 
            id="close-add-device-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* STEP 1: SCANNING */}
          {step === 'scanning' && (
            <div className="py-10 flex flex-col items-center justify-center text-center space-y-5">
              <div className="relative w-28 h-28 flex items-center justify-center">
                {/* Concentric radar rings */}
                <div className="absolute inset-0 rounded-full border-2 border-blue-400/30 animate-ping"></div>
                <div className="absolute inset-2 rounded-full border border-blue-500/40 animate-pulse"></div>
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 z-10">
                  <Radio className="w-8 h-8 animate-pulse" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-lg font-bold text-slate-900">Searching for Smart Switches...</h4>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  Make sure your switch is powered on and ready to connect.
                </p>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-100 text-left text-xs text-blue-900 space-y-1 w-full">
                <p className="font-semibold flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Pairing Tip:</span>
                </p>
                <p className="text-blue-700/80 text-[11px] leading-relaxed">
                  Ensure the Wi-Fi status indicator light is pulsing softly on the switch glass panel.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: SELECT DEVICE */}
          {step === 'select_device' && selectedDevice && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Device Detected</h4>
                  <p className="text-xs text-slate-500">1 device ready to pair</p>
                </div>
                <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full border border-emerald-200/60 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Ready</span>
                </span>
              </div>

              {/* Single discovered device card: Just Device Name with Gang */}
              <div className="p-4 rounded-2xl border border-blue-600 bg-blue-50/40 shadow-xs flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <Power className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-base font-bold text-slate-900">
                      Smart Switch ({selectedDevice.gangCount}-Gang)
                    </h5>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ready to connect
                    </p>
                  </div>
                </div>

                <div className="w-6 h-6 rounded-full border border-blue-600 bg-blue-600 text-white flex items-center justify-center">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              </div>

              <button
                id="proceed-to-wifi-config-btn"
                disabled={!selectedDevice}
                onClick={() => setStep('wifi_credentials')}
                className="w-full mt-4 py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm shadow-md shadow-blue-600/25 active:scale-[0.99] transition flex items-center justify-center space-x-2"
              >
                <span>Connect Switch</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 3: WI-FI CREDENTIALS */}
          {step === 'wifi_credentials' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                  <Wifi className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Select 2.4 GHz Wi-Fi Network</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  ESP32-S3 will use this network to connect to your home router and access the internet.
                </p>
              </div>

              {/* Warning note for 5GHz */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs text-amber-900 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-relaxed">
                  <strong>Notice:</strong> 5 GHz Wi-Fi is not supported by IoT chips. Ensure you select your router's <strong>2.4 GHz</strong> band.
                </span>
              </div>

              {/* Form */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Wi-Fi Name (SSID)</label>
                  <div className="relative">
                    <input
                      type="text"
                      id="wifi-ssid-input"
                      value={homeSsid}
                      onChange={(e) => setHomeSsid(e.target.value)}
                      placeholder="Enter 2.4GHz Wi-Fi SSID"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:bg-white focus:border-blue-600 focus:outline-none transition"
                    />
                  </div>
                  {/* Quick network suggestions */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['Home_Fiber_2.4G', 'Office_IoT', 'Studio_WiFi'].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setHomeSsid(s)}
                        className={`text-[11px] px-2 py-1 rounded-lg border transition ${
                          homeSsid === s 
                            ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold' 
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Wi-Fi Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="wifi-password-input"
                      value={homePassword}
                      onChange={(e) => setHomePassword(e.target.value)}
                      placeholder="Enter Wi-Fi Password"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:bg-white focus:border-blue-600 focus:outline-none transition pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('select_device')}
                  className="w-1/3 py-3 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  id="confirm-wifi-provision-btn"
                  onClick={handleStartConnection}
                  disabled={!homeSsid}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-xs shadow-md shadow-blue-600/25 active:scale-[0.99] transition flex items-center justify-center space-x-1.5"
                >
                  <span>Start Provisioning</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: CONNECTING HANDSHAKE */}
          {step === 'connecting' && (
            <div className="py-6 space-y-6 text-center">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#e2e8f0"
                    strokeWidth="6"
                    fill="transparent"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#2563eb"
                    strokeWidth="6"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * connectionProgress) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-500 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-extrabold text-slate-900">{connectionProgress}%</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Configuring</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-base font-bold text-slate-900">Provisioning {selectedDevice?.modelId}</h4>
                <p className="text-xs text-blue-600 font-mono font-semibold animate-pulse">
                  {progressStatus}
                </p>
              </div>

              {/* Progress step indicators */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left text-xs space-y-2.5">
                {[
                  { title: 'Connect phone to switch hotspot', activeAt: 15 },
                  { title: 'Send home Wi-Fi credentials', activeAt: 45 },
                  { title: 'Switch joins your home Wi-Fi network', activeAt: 75 },
                  { title: 'Register switch with Smart Life cloud', activeAt: 100 },
                ].map((item, idx) => {
                  const isDone = connectionProgress >= item.activeAt;
                  return (
                    <div key={idx} className="flex items-center space-x-2.5">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isDone ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {isDone ? '✓' : idx + 1}
                      </div>
                      <span className={`text-[11px] ${isDone ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
                        {item.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: SUCCESS */}
          {step === 'success' && (
            <div className="py-4 space-y-5 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10 border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-bold text-slate-900">Device Added Successfully!</h4>
                <p className="text-xs text-slate-500">
                  Your smart touch switch is now online and ready to use.
                </p>
              </div>

              {/* Device summary card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-left text-xs space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Device Name:</span>
                  <span className="font-bold text-slate-800">Smart Touch Switch ({selectedDevice?.gangCount}-Gang)</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Wi-Fi Network:</span>
                  <span className="font-semibold text-slate-800">{homeSsid}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Connection Status:</span>
                  <span className="font-bold text-emerald-600 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Online & Ready</span>
                  </span>
                </div>
              </div>

              {/* Assign Room */}
              <div className="text-left space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-slate-700">Assign Room Location:</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['Living Room', 'Bedroom', 'Balcony', 'Kitchen', 'Office', 'Terrace'].map((room) => (
                    <button
                      key={room}
                      type="button"
                      onClick={() => setAssignedRoom(room)}
                      className={`py-2 px-2 text-xs rounded-xl font-medium border text-center transition ${
                        assignedRoom === room 
                          ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {room}
                    </button>
                  ))}
                </div>
              </div>

              <button
                id="finish-device-setup-btn"
                onClick={handleComplete}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-600/25 active:scale-[0.99] transition"
              >
                Done & Start Controlling
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
