import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, 
  Fan, 
  Plug, 
  Flame, 
  Sparkles, 
  Wind, 
  Wifi, 
  Power, 
  Clock, 
  Settings, 
  Sliders, 
  Smartphone,
  ChevronRight,
  Plus,
  RefreshCw,
  Sun,
  Home,
  CheckCircle2,
  Moon,
  Coffee,
  Film,
  Timer,
  Check,
  X,
  ChevronDown,
  Building2,
  MapPin,
  Layers,
  FolderPlus,
  Calendar,
  Radio,
  FileCode,
  Copy,
  ExternalLink,
  Cpu,
  Bell
} from 'lucide-react';
import { RelayChannelConfig, GangCount, RelayState } from '../types/firmware';
import { ESP_FACTORY_PROFILES } from '../data/espFactoryProfiles';
import { BuildingRoomModal, Building, Room } from './BuildingRoomModal';
import { MobileTimerSection } from './MobileTimerSection';

interface MobileAppViewProps {
  gangCount: GangCount;
  channels: RelayChannelConfig[];
  onToggle: (id: number) => void;
  onSetAll: (state: RelayState) => void;
  onPulse: (id: number, ms: number) => void;
  onUpdateChannelMode: (id: number, mode: 'LATCHING' | 'MOMENTARY' | 'PULSE', pulseMs: number) => void;
  mqttConnected: boolean;
  freeHeap: number;
  wifiSsid?: string;
  deviceIp?: string;
  onOpenAddDevice: () => void;
}

export const MobileAppView: React.FC<MobileAppViewProps> = ({
  gangCount,
  channels,
  onToggle,
  onSetAll,
  onPulse,
  onUpdateChannelMode,
  mqttConnected,
  freeHeap,
  wifiSsid = 'Home_Fiber_2.4G',
  deviceIp = '192.168.1.145',
  onOpenAddDevice,
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'scenes' | 'timer' | 'settings'>('home');
  const [selectedRoom, setSelectedRoom] = useState<string>('All');
  const [phoneFrame, setPhoneFrame] = useState(true);

  // Buildings / Homes State
  const [buildings, setBuildings] = useState<Building[]>([
    { id: 'bld_1', name: 'My Home', type: 'Apartment', address: 'Palm Avenue, Tower 3' },
    { id: 'bld_2', name: 'Office HQ', type: 'Commercial', address: 'Tech Park, Floor 4' },
    { id: 'bld_3', name: 'Holiday Villa', type: 'Villa', address: 'Sunset Bay' },
  ]);
  const [activeBuildingId, setActiveBuildingId] = useState<string>('bld_1');

  // Rooms State
  const [rooms, setRooms] = useState<Room[]>([
    { id: 'r_1', name: 'Living Room', buildingId: 'bld_1', iconType: 'tv' },
    { id: 'r_2', name: 'Master Bedroom', buildingId: 'bld_1', iconType: 'bed' },
    { id: 'r_3', name: 'Kitchen', buildingId: 'bld_1', iconType: 'utensils' },
    { id: 'r_4', name: 'Balcony', buildingId: 'bld_1', iconType: 'sun' },
    { id: 'r_5', name: 'Conference Hall', buildingId: 'bld_2', iconType: 'briefcase' },
    { id: 'r_6', name: 'Open Workspace', buildingId: 'bld_2', iconType: 'briefcase' },
    { id: 'r_7', name: 'Cafeteria', buildingId: 'bld_2', iconType: 'utensils' },
    { id: 'r_8', name: 'Poolside Lounge', buildingId: 'bld_3', iconType: 'sun' },
    { id: 'r_9', name: 'Master Suite', buildingId: 'bld_3', iconType: 'bed' },
  ]);

  // Which room this ESP32-S3 smart switch belongs to
  const [switchRoom, setSwitchRoom] = useState<string>('Living Room');

  // Building & Room management modal state
  const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);
  const [buildingModalTab, setBuildingModalTab] = useState<'buildings' | 'rooms'>('buildings');
  
  // Consumer switch countdown timers state: channelId -> remaining seconds
  const [activeTimers, setActiveTimers] = useState<Record<number, number>>({});
  const [timerModalChannelId, setTimerModalChannelId] = useState<number | null>(null);

  // MQTT Broker Configuration State
  const [isMqttModalOpen, setIsMqttModalOpen] = useState(false);
  const [isEsp32CodeModalOpen, setIsEsp32CodeModalOpen] = useState(false);
  const [mqttBrokerUri, setMqttBrokerUri] = useState('mqtt://broker.hivemq.com:1883');
  const [mqttBrokerHost, setMqttBrokerHost] = useState('broker.hivemq.com');
  const [mqttBrokerPort, setMqttBrokerPort] = useState('1883');
  const [mqttUsername, setMqttUsername] = useState('');
  const [mqttPassword, setMqttPassword] = useState('');
  const [mqttTopicPrefix, setMqttTopicPrefix] = useState('smartswitch');
  const [mqttTestStatus, setMqttTestStatus] = useState<'idle' | 'testing' | 'success'>('idle');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Settings preferences
  const [nightLightEnabled, setNightLightEnabled] = useState(true);
  const [powerOnState, setPowerOnState] = useState<'remember' | 'off' | 'on'>('remember');

  const manifest = ESP_FACTORY_PROFILES[gangCount];
  const activeChannels = channels.slice(0, gangCount);
  const activeCount = activeChannels.filter(c => c.state === 1).length;

  // Countdown timer tick effect
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTimers(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(key => {
          const id = Number(key);
          if (next[id] > 1) {
            next[id] -= 1;
            changed = true;
          } else if (next[id] === 1) {
            // Timer expired, turn off switch
            delete next[id];
            changed = true;
            onToggle(id);
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onToggle]);

  const handleSetTimer = (channelId: number, minutes: number) => {
    if (minutes === 0) {
      setActiveTimers(prev => {
        const next = { ...prev };
        delete next[channelId];
        return next;
      });
    } else {
      setActiveTimers(prev => ({
        ...prev,
        [channelId]: minutes * 60
      }));
    }
    setTimerModalChannelId(null);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  // Building & Room management handlers
  const handleAddBuilding = (newB: Omit<Building, 'id'>) => {
    const id = `bld_${Date.now()}`;
    const created: Building = { ...newB, id };
    setBuildings(prev => [...prev, created]);
    setActiveBuildingId(id);
    
    // Create default room for this building
    const defaultRoom: Room = {
      id: `r_${Date.now()}`,
      name: newB.type === 'Office' || newB.type === 'Commercial' ? 'Main Office' : 'Living Room',
      buildingId: id,
      iconType: newB.type === 'Office' ? 'briefcase' : 'tv'
    };
    setRooms(prev => [...prev, defaultRoom]);
    setSelectedRoom('All');
    setSwitchRoom(defaultRoom.name);
  };

  const handleDeleteBuilding = (id: string) => {
    if (buildings.length <= 1) return;
    setBuildings(prev => prev.filter(b => b.id !== id));
    setRooms(prev => prev.filter(r => r.buildingId !== id));
    if (activeBuildingId === id) {
      const remaining = buildings.filter(b => b.id !== id);
      setActiveBuildingId(remaining[0].id);
      setSelectedRoom('All');
    }
  };

  const handleAddRoom = (newR: Omit<Room, 'id'>) => {
    const id = `r_${Date.now()}`;
    const created: Room = { ...newR, id };
    setRooms(prev => [...prev, created]);
    setSelectedRoom(created.name);
  };

  const handleDeleteRoom = (id: string) => {
    const currentRooms = rooms.filter(r => r.buildingId === activeBuildingId);
    if (currentRooms.length <= 1) return;
    setRooms(prev => prev.filter(r => r.id !== id));
    setSelectedRoom('All');
  };

  const activeBuilding = buildings.find(b => b.id === activeBuildingId) || buildings[0];
  const activeBuildingRooms = rooms.filter(r => r.buildingId === activeBuildingId);
  const roomFilterPills = ['All', ...activeBuildingRooms.map(r => r.name)];

  // User-friendly appliance icon
  const getIcon = (iconType: string, state: RelayState) => {
    const isOn = state === 1;
    switch (iconType) {
      case 'fan': 
        return <Fan className={`w-5 h-5 transition-transform ${isOn ? 'text-cyan-600 animate-spin' : 'text-slate-400'}`} style={{ animationDuration: '2s' }} />;
      case 'socket': 
        return <Plug className={`w-5 h-5 ${isOn ? 'text-emerald-600' : 'text-slate-400'}`} />;
      case 'heater': 
        return <Flame className={`w-5 h-5 ${isOn ? 'text-rose-600' : 'text-slate-400'}`} />;
      case 'chandelier': 
        return <Sparkles className={`w-5 h-5 ${isOn ? 'text-amber-500' : 'text-slate-400'}`} />;
      case 'ac': 
        return <Wind className={`w-5 h-5 ${isOn ? 'text-blue-600' : 'text-slate-400'}`} />;
      case 'doorbell': 
        return <Bell className={`w-5 h-5 transition-transform ${isOn ? 'text-amber-500 animate-bounce' : 'text-slate-400'}`} />;
      case 'switch': 
        return <Power className={`w-5 h-5 ${isOn ? 'text-blue-600' : 'text-slate-400'}`} />;
      default: 
        return <Lightbulb className={`w-5 h-5 ${isOn ? 'text-amber-500' : 'text-slate-400'}`} />;
    }
  };

  // Friendly human name for the switch model
  const friendlySwitchName = `Smart Switch (${gangCount}-Gang)`;

  // Main interactive mobile body
  const content = (
    <div className="flex flex-col h-full bg-[#f6f8fb] text-slate-800 select-none overflow-y-auto font-sans">
      
      {/* 1. Header Bar (Smart Life Standard Style) */}
      <div className="px-5 pt-3.5 pb-2.5 bg-white border-b border-slate-100 shadow-xs sticky top-0 z-20">
        
        {/* Phone Status bar */}
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-2">
          <span>09:41</span>
          <div className="flex items-center space-x-2">
            <span className="flex items-center space-x-1 text-slate-600 text-[10px]">
              <Wifi className="w-3 h-3 text-emerald-500" />
              <span>{wifiSsid}</span>
            </span>
            <div className="w-4 h-2 rounded-xs border border-slate-400 relative flex items-center p-0.5">
              <div className="h-full w-full bg-slate-600 rounded-2xs"></div>
            </div>
          </div>
        </div>

        {/* Title & Plus Button */}
        <div className="flex items-center justify-between">
          <div>
            <div 
              onClick={() => {
                setBuildingModalTab('buildings');
                setIsBuildingModalOpen(true);
              }}
              className="flex items-center space-x-1.5 cursor-pointer group"
              title="Click to Switch Home or Add Building/Property"
            >
              <Building2 className="w-4 h-4 text-blue-600 group-hover:scale-110 transition" />
              <h2 className="text-xl font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition">
                {activeBuilding.name}
              </h2>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
              <span className="flex items-center space-x-1 text-amber-600 font-medium">
                <Sun className="w-3.5 h-3.5" />
                <span>27°C Sunny</span>
              </span>
              <span>•</span>
              <span className="text-emerald-600 font-medium flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>{activeCount} on</span>
              </span>
              <span>•</span>
              <span className="text-slate-400 font-medium text-[11px]">
                {activeBuilding.type}
              </span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center space-x-2">
            <button
              id="building-switcher-header-btn"
              onClick={() => {
                setBuildingModalTab('buildings');
                setIsBuildingModalOpen(true);
              }}
              className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
              title="Manage Homes & Buildings"
            >
              <Building2 className="w-4 h-4 text-slate-700" />
            </button>

            <button
              id="phone-frame-toggle-btn"
              onClick={() => setPhoneFrame(!phoneFrame)}
              className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
              title="Toggle Phone Frame"
            >
              <Smartphone className="w-4 h-4" />
            </button>

            {/* Smart Life Add Device (+) Button */}
            <button
              id="smart-life-add-device-btn"
              onClick={onOpenAddDevice}
              className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-md shadow-blue-600/25 active:scale-95 transition"
              title="Add New Smart Device"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Room Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pt-3 pb-1 scrollbar-none">
          {roomFilterPills.map((room) => (
            <button
              key={room}
              onClick={() => setSelectedRoom(room)}
              className={`px-3.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                selectedRoom === room
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {room}
            </button>
          ))}

          {/* "+ Add Room" Button */}
          <button
            id="smart-life-add-room-btn"
            onClick={() => {
              setBuildingModalTab('rooms');
              setIsBuildingModalOpen(true);
            }}
            className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 flex items-center space-x-1 transition shrink-0"
            title={`Add a new room to ${activeBuilding.name}`}
          >
            <Plus className="w-3 h-3 stroke-[2.5]" />
            <span>Add Room</span>
          </button>
        </div>
      </div>

      {/* 2. Main Scrollable Container */}
      <div className="flex-1 p-4 space-y-4">

        {/* TAB 1: HOME TAB */}
        {activeTab === 'home' && (
          <>
            {/* If selected room has no switches */}
            {selectedRoom !== 'All' && selectedRoom !== switchRoom ? (
              <div className="bg-white rounded-3xl p-6 text-center border border-slate-200/80 shadow-xs space-y-3 my-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">No Switches in {selectedRoom}</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    This {gangCount}-gang switch is currently assigned to <strong>{switchRoom}</strong> in {activeBuilding.name}.
                  </p>
                </div>
                <div className="flex items-center justify-center space-x-2 pt-1">
                  <button
                    onClick={() => setSwitchRoom(selectedRoom)}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-xs"
                  >
                    Move Switch to {selectedRoom}
                  </button>
                  <button
                    onClick={() => setSelectedRoom('All')}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                  >
                    View All Rooms
                  </button>
                </div>
              </div>
            ) : (
              <div>
              <div className="flex items-center justify-between mb-2.5 px-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Switches & Lights ({gangCount})
                </h4>
                <span className="text-[11px] text-blue-600 font-medium">Tap to toggle</span>
              </div>

              <div className={`grid gap-3 ${
                gangCount === 1 ? 'grid-cols-1' : 
                gangCount <= 4 ? 'grid-cols-2' : 
                gangCount <= 8 ? 'grid-cols-2 sm:grid-cols-3' : 
                'grid-cols-2 sm:grid-cols-4'
              }`}>
                {activeChannels.map((channel) => {
                  const isOn = channel.state === 1;
                  const hasTimer = activeTimers[channel.id] !== undefined;

                  return (
                    <div
                      key={channel.id}
                      id={`user-switch-card-${channel.id}`}
                      className={`rounded-3xl p-4 transition-all duration-200 border flex flex-col justify-between ${
                        isOn
                          ? 'bg-white border-blue-500/30 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/20'
                          : 'bg-white border-slate-200/80 shadow-xs hover:border-slate-300'
                      }`}
                    >
                      {/* Top: Icon + Status Pill */}
                      <div className="flex items-center justify-between">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                          isOn 
                            ? 'bg-amber-50 shadow-xs' 
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {getIcon(channel.icon, channel.state)}
                        </div>

                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-colors ${
                          isOn 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {isOn ? 'ON' : 'OFF'}
                        </span>
                      </div>

                      {/* Middle: Friendly Appliance Name */}
                      <div className="my-3">
                        <h5 className="text-sm font-bold text-slate-800 truncate">
                          {channel.name}
                        </h5>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {hasTimer ? (
                            <span className="text-amber-600 font-medium flex items-center space-x-1">
                              <Timer className="w-3 h-3 animate-pulse" />
                              <span>Off in {formatTimer(activeTimers[channel.id])}</span>
                            </span>
                          ) : (
                            isOn ? 'Power active' : 'Standby'
                          )}
                        </p>
                      </div>

                      {/* Bottom Controls: User Toggle & Timer Button */}
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        {/* Main Clean Power / Chime Button */}
                        {channel.icon === 'doorbell' ? (
                          <button
                            id={`user-toggle-btn-${channel.id}`}
                            onClick={() => onPulse(channel.id, channel.pulseDurationMs || 600)}
                            className={`w-full py-2.5 px-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 active:scale-[0.98] ${
                              isOn 
                                ? 'bg-amber-500 hover:bg-amber-400 text-white shadow-md shadow-amber-500/25' 
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <Bell className={`w-3.5 h-3.5 ${isOn ? 'text-white animate-bounce' : 'text-slate-400'}`} />
                            <span>{isOn ? 'Ringing...' : 'Ring Door Bell'}</span>
                          </button>
                        ) : (
                          <button
                            id={`user-toggle-btn-${channel.id}`}
                            onClick={() => onToggle(channel.id)}
                            className={`w-full py-2.5 px-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 active:scale-[0.98] ${
                              isOn 
                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20' 
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <Power className={`w-3.5 h-3.5 ${isOn ? 'text-white' : 'text-slate-400'}`} />
                            <span>{isOn ? 'Turn Off' : 'Turn On'}</span>
                          </button>
                        )}

                        {/* Quick Timer / Countdown Shortcut */}
                        <button
                          onClick={() => setTimerModalChannelId(channel.id)}
                          className="w-full py-1.5 px-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-500 hover:text-slate-700 transition flex items-center justify-center space-x-1"
                        >
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{hasTimer ? 'Edit Timer' : 'Set Timer'}</span>
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
            )}

            {/* Quick Automation Scenes (Smart Life Style) */}
            <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100">
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Quick Scenes</h4>
                <span className="text-[11px] text-blue-600 font-medium">One-Tap</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => {
                    onToggle(1);
                    if (gangCount >= 2) onToggle(2);
                  }}
                  className="p-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/70 hover:border-blue-200 rounded-2xl text-left transition active:scale-[0.98] group"
                >
                  <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-1.5">
                    <Sun className="w-4 h-4" />
                  </div>
                  <p className="font-bold text-slate-800 group-hover:text-blue-600 transition">Morning Mode</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Turn on main lights</p>
                </button>

                <button
                  onClick={() => onSetAll(0)}
                  className="p-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/70 hover:border-blue-200 rounded-2xl text-left transition active:scale-[0.98] group"
                >
                  <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-1.5">
                    <Moon className="w-4 h-4" />
                  </div>
                  <p className="font-bold text-slate-800 group-hover:text-blue-600 transition">Good Night</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Turn off all switches</p>
                </button>

                <button
                  onClick={() => {
                    onSetAll(1);
                  }}
                  className="p-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/70 hover:border-blue-200 rounded-2xl text-left transition active:scale-[0.98] group"
                >
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-1.5">
                    <Home className="w-4 h-4" />
                  </div>
                  <p className="font-bold text-slate-800 group-hover:text-blue-600 transition">Arrive Home</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Welcome home lights on</p>
                </button>

                <button
                  onClick={() => {
                    // Turn on ambient light only
                    onSetAll(0);
                    setTimeout(() => onToggle(1), 100);
                  }}
                  className="p-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-200/70 hover:border-blue-200 rounded-2xl text-left transition active:scale-[0.98] group"
                >
                  <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-1.5">
                    <Film className="w-4 h-4" />
                  </div>
                  <p className="font-bold text-slate-800 group-hover:text-blue-600 transition">Movie Night</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Cozy ambient mood</p>
                </button>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: SCENES TAB */}
        {activeTab === 'scenes' && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Smart Automations & Scenes</h3>
              <p className="text-xs text-slate-500 mt-1">
                Customize your home routines to automatically toggle lights and appliances with a single touch.
              </p>
            </div>

            <div className="space-y-2.5">
              {[
                { name: 'Arrive Home', desc: 'Turns on living room chandelier and hallway lights', icon: Home, color: 'text-blue-600 bg-blue-50', action: () => onSetAll(1) },
                { name: 'Good Night', desc: 'Safely turns off all switches across your home', icon: Moon, color: 'text-indigo-600 bg-indigo-50', action: () => onSetAll(0) },
                { name: 'Morning Wakeup', desc: 'Turns on ambient lights and bedroom fan', icon: Coffee, color: 'text-amber-600 bg-amber-50', action: () => onToggle(1) },
                { name: 'Cinema Mode', desc: 'Dims all lights and keeps only accent light active', icon: Film, color: 'text-purple-600 bg-purple-50', action: () => { onSetAll(0); setTimeout(() => onToggle(1), 150); } },
              ].map((scene, idx) => {
                const IconComponent = scene.icon;
                return (
                  <div 
                    key={idx} 
                    className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${scene.color}`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">{scene.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{scene.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={scene.action}
                      className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs rounded-xl border border-blue-200 transition active:scale-95"
                    >
                      Run
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: TIMER / SCHEDULE TAB */}
        {activeTab === 'timer' && (
          <MobileTimerSection
            channels={channels}
            gangCount={gangCount}
            onToggle={onToggle}
            activeTimers={activeTimers}
            onSetTimer={handleSetTimer}
            formatTimer={formatTimer}
            roomName={switchRoom}
          />
        )}

        {/* TAB 4: SETTINGS / ME TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            {/* Device Profile Card */}
            <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-500/20">
                  <Sliders className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{friendlySwitchName}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{switchRoom} in {activeBuilding.name} • Wi-Fi Online</p>
                </div>
              </div>
            </div>

            {/* Property & Room Management Card */}
            <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Property & Room Management
                </h4>
                <button
                  onClick={() => {
                    setBuildingModalTab('buildings');
                    setIsBuildingModalOpen(true);
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Property</span>
                </button>
              </div>

              {/* Current Building Box */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{activeBuilding.name}</p>
                    <p className="text-[11px] text-slate-500">{activeBuilding.type} • {activeBuildingRooms.length} rooms configured</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setBuildingModalTab('buildings');
                    setIsBuildingModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition"
                >
                  Switch
                </button>
              </div>

              {/* Room Quick Links */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-slate-600 font-medium">Switch Assigned Room:</span>
                <button
                  onClick={() => {
                    setBuildingModalTab('rooms');
                    setIsBuildingModalOpen(true);
                  }}
                  className="text-blue-600 font-bold hover:underline flex items-center space-x-1"
                >
                  <MapPin className="w-3 h-3" />
                  <span>{switchRoom} (Manage Rooms)</span>
                </button>
              </div>
            </div>

            {/* User Preferences */}
            <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Device Preferences
              </h4>

              {/* Night Light Indicator Toggle */}
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div>
                  <p className="text-xs font-bold text-slate-800">Panel Indicator Light</p>
                  <p className="text-[11px] text-slate-500">Soft LED glow so switch is easy to find in the dark</p>
                </div>
                <button
                  onClick={() => setNightLightEnabled(!nightLightEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${nightLightEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}
                >
                  <span className={`w-5 h-5 rounded-full bg-white shadow-sm block absolute top-0.5 transition-transform ${nightLightEnabled ? 'right-0.5' : 'left-0.5'}`}></span>
                </button>
              </div>

              {/* Power-On Recovery Behavior */}
              <div className="py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800 mb-1">Power-On Recovery State</p>
                <p className="text-[11px] text-slate-500 mb-2">Behavior after power outage is restored</p>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {(['remember', 'off', 'on'] as const).map(state => (
                    <button
                      key={state}
                      onClick={() => setPowerOnState(state)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold capitalize transition border ${
                        powerOnState === state 
                          ? 'bg-blue-50 border-blue-300 text-blue-700' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {state === 'remember' ? 'Last State' : state === 'off' ? 'Always Off' : 'Always On'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Network Status */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-xs font-bold text-slate-800">Wi-Fi Connection</p>
                  <p className="text-[11px] text-slate-500">{wifiSsid}</p>
                </div>
                <span className="text-xs font-semibold text-emerald-600 flex items-center space-x-1">
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Strong Signal</span>
                </span>
              </div>
            </div>

            {/* MQTT Broker Connection & ESP32 Configuration Card */}
            <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Radio className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    MQTT Broker Connection
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Online</span>
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1.5 font-mono">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400 font-sans">Broker URI:</span>
                  <span className="font-bold text-slate-900 truncate max-w-[190px]">{mqttBrokerUri}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400 font-sans">Base Topic:</span>
                  <span className="font-bold text-blue-600">{mqttTopicPrefix}/</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400 font-sans">Firmware Config:</span>
                  <span className="font-bold text-slate-700 font-mono">mqtt_config.h</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setIsMqttModalOpen(true)}
                  className="py-2 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition text-center"
                >
                  Configure Broker
                </button>
                <button
                  onClick={() => setIsEsp32CodeModalOpen(true)}
                  className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition text-center"
                >
                  ESP32 Code Details
                </button>
              </div>
            </div>

            {/* Device Info */}
            <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100 space-y-2 text-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                About Device
              </h4>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Device Model</span>
                <span className="font-semibold text-slate-800">{gangCount}-Gang Touch Switch</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Firmware Version</span>
                <span className="font-semibold text-slate-800">v1.0.4 (Up to date)</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Cloud Sync</span>
                <span className="font-semibold text-emerald-600">Connected</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 3. Bottom Navigation Tab Bar (Smart Life Standard) */}
      <div className="px-6 py-2.5 border-t border-slate-100 bg-white/95 backdrop-blur-md flex items-center justify-around sticky bottom-0 z-20 shadow-xs">
        <button 
          onClick={() => setActiveTab('home')} 
          className={`flex flex-col items-center space-y-0.5 transition ${activeTab === 'home' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Home</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('scenes')} 
          className={`flex flex-col items-center space-y-0.5 transition ${activeTab === 'scenes' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px]">Scenes</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('timer')} 
          className={`flex flex-col items-center space-y-0.5 transition ${activeTab === 'timer' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Timer className="w-5 h-5" />
          <span className="text-[10px]">Timer</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('settings')} 
          className={`flex flex-col items-center space-y-0.5 transition ${activeTab === 'settings' ? 'text-blue-600 font-bold' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px]">Settings</span>
        </button>
      </div>

      {/* User Friendly Countdown Timer Modal */}
      {timerModalChannelId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-5 shadow-2xl max-w-xs w-full space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <h4 className="font-bold text-sm text-slate-800">
                  Set Countdown Timer
                </h4>
              </div>
              <button 
                onClick={() => setTimerModalChannelId(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Automatically turn off <strong>{channels.find(c => c.id === timerModalChannelId)?.name}</strong> after the selected time:
            </p>

            <div className="grid grid-cols-2 gap-2">
              {[15, 30, 60, 120].map(mins => (
                <button
                  key={mins}
                  onClick={() => handleSetTimer(timerModalChannelId, mins)}
                  className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-2xl text-center text-xs font-semibold text-slate-700 hover:text-blue-700 transition"
                >
                  {mins >= 60 ? `${mins / 60} Hour${mins > 60 ? 's' : ''}` : `${mins} Minutes`}
                </button>
              ))}
            </div>

            {activeTimers[timerModalChannelId] !== undefined && (
              <button
                onClick={() => handleSetTimer(timerModalChannelId, 0)}
                className="w-full py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-bold border border-rose-200 transition"
              >
                Cancel Existing Timer
              </button>
            )}
          </div>
        </div>
      )}

      {/* Property & Room Management Modal */}
      <BuildingRoomModal
        isOpen={isBuildingModalOpen}
        onClose={() => setIsBuildingModalOpen(false)}
        buildings={buildings}
        rooms={rooms}
        activeBuildingId={activeBuildingId}
        onSelectBuilding={(id) => {
          setActiveBuildingId(id);
          setSelectedRoom('All');
        }}
        onAddBuilding={handleAddBuilding}
        onDeleteBuilding={handleDeleteBuilding}
        onAddRoom={handleAddRoom}
        onDeleteRoom={handleDeleteRoom}
        initialTab={buildingModalTab}
      />

      {/* MODAL 1: CONFIGURE MQTT BROKER */}
      {isMqttModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-bold text-slate-900">MQTT Broker Settings</h4>
              </div>
              <button 
                onClick={() => setIsMqttModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
              {/* Presets */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Quick Broker Presets:</label>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      setMqttBrokerUri('mqtt://broker.hivemq.com:1883');
                      setMqttBrokerHost('broker.hivemq.com');
                      setMqttBrokerPort('1883');
                    }}
                    className="p-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition"
                  >
                    HiveMQ Cloud
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMqttBrokerUri('mqtt://broker.emqx.io:1883');
                      setMqttBrokerHost('broker.emqx.io');
                      setMqttBrokerPort('1883');
                    }}
                    className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold hover:bg-slate-100 transition"
                  >
                    EMQX Public
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMqttBrokerUri('mqtt://192.168.1.100:1883');
                      setMqttBrokerHost('192.168.1.100');
                      setMqttBrokerPort('1883');
                    }}
                    className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold hover:bg-slate-100 transition"
                  >
                    Home Assistant
                  </button>
                </div>
              </div>

              {/* Broker URI */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Broker URI:</label>
                <input
                  type="text"
                  value={mqttBrokerUri}
                  onChange={e => setMqttBrokerUri(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  placeholder="mqtt://broker.hivemq.com:1883"
                />
              </div>

              {/* Username & Password */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Username (Optional):</label>
                  <input
                    type="text"
                    value={mqttUsername}
                    onChange={e => setMqttUsername(e.target.value)}
                    placeholder="None"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Password (Optional):</label>
                  <input
                    type="password"
                    value={mqttPassword}
                    onChange={e => setMqttPassword(e.target.value)}
                    placeholder="None"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Topic Prefix */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Topic Prefix:</label>
                <input
                  type="text"
                  value={mqttTopicPrefix}
                  onChange={e => setMqttTopicPrefix(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                  placeholder="smartswitch"
                />
              </div>

              {/* Test Connection Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMqttTestStatus('testing');
                    setTimeout(() => setMqttTestStatus('success'), 700);
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition"
                >
                  {mqttTestStatus === 'testing' ? (
                    <span>Testing Connection...</span>
                  ) : mqttTestStatus === 'success' ? (
                    <span className="text-emerald-600 flex items-center space-x-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Connection Successful!</span>
                    </span>
                  ) : (
                    <span>Test Broker Connection</span>
                  )}
                </button>
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex space-x-2">
              <button
                type="button"
                onClick={() => setIsMqttModalOpen(false)}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-xs transition"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: WHERE TO ENTER MQTT DETAILS IN ESP32 CODE */}
      {isEsp32CodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-bold text-slate-900">ESP32 MQTT Code Locations</h4>
              </div>
              <button 
                onClick={() => setIsEsp32CodeModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
              <p className="text-slate-600 leading-relaxed text-[11px]">
                To connect your physical ESP32 to your MQTT broker, open the configuration header file in your firmware folder:
              </p>

              {/* Location 1: ESP-IDF */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-700 text-[11px]">1. For ESP-IDF Firmware:</span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono">C / IDF</span>
                </div>
                <p className="text-slate-500 font-mono text-[10px]">
                  📁 firmware/esp32_idf/mqtt_config.h
                </p>
                <p className="text-[10px] text-slate-500">
                  Included directly by <code className="text-slate-700 font-bold">main.c</code> during startup.
                </p>
              </div>

              {/* Location 2: Arduino */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-700 text-[11px]">2. For Arduino IDE / Core:</span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono">.INO</span>
                </div>
                <p className="text-slate-500 font-mono text-[10px]">
                  📁 firmware/arduino/SmartTouchSwitch_ESP32S3/
                </p>
                <p className="text-[10px] text-slate-500">
                  Edit lines 20-30 in <code className="text-slate-700 font-bold">SmartTouchSwitch_ESP32S3.ino</code> or <code className="text-slate-700 font-bold">mqtt_config.h</code>.
                </p>
              </div>

              {/* Code Snippet */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-700 text-[11px]">Macros to Edit:</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`#define CONFIG_WIFI_SSID "${wifiSsid}"\n#define CONFIG_WIFI_PASSWORD "Your_Password"\n#define CONFIG_MQTT_BROKER_URI "${mqttBrokerUri}"\n#define CONFIG_MQTT_USERNAME "${mqttUsername}"\n#define CONFIG_MQTT_PASSWORD "${mqttPassword}"`);
                      setCopiedSnippet(true);
                      setTimeout(() => setCopiedSnippet(false), 2500);
                    }}
                    className="text-blue-600 hover:text-blue-700 text-[10px] font-bold flex items-center space-x-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedSnippet ? 'Copied!' : 'Copy Snippet'}</span>
                  </button>
                </div>

                <pre className="bg-slate-900 text-emerald-400 p-3 rounded-2xl text-[10px] font-mono overflow-x-auto leading-relaxed">
{`#define CONFIG_WIFI_SSID     "${wifiSsid}"
#define CONFIG_WIFI_PASSWORD "Your_Password"

#define CONFIG_MQTT_BROKER_URI "${mqttBrokerUri}"
#define CONFIG_MQTT_USERNAME   "${mqttUsername}"
#define CONFIG_MQTT_PASSWORD   "${mqttPassword}"`}
                </pre>
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex">
              <button
                type="button"
                onClick={() => setIsEsp32CodeModalOpen(false)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  return (
    <div className="flex justify-center items-center py-2">
      {phoneFrame ? (
        <div className="w-full max-w-md h-[800px] bg-white rounded-[46px] p-3 shadow-2xl border-4 border-slate-200 relative flex flex-col ring-1 ring-slate-300">
          {/* Dynamic Island / Speaker Pill */}
          <div className="w-32 h-4 bg-slate-900 rounded-full mx-auto mb-2 flex items-center justify-center space-x-1.5 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-800"></div>
            <div className="w-10 h-1.5 rounded-full bg-slate-800"></div>
          </div>
          
          <div className="flex-1 rounded-[36px] overflow-hidden flex flex-col border border-slate-100 shadow-inner">
            {content}
          </div>
          
          {/* iOS / Android Home Bar */}
          <div className="w-32 h-1 bg-slate-300 rounded-full mx-auto mt-2 shrink-0"></div>
        </div>
      ) : (
        <div className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xl min-h-[640px]">
          {content}
        </div>
      )}
    </div>
  );
};
