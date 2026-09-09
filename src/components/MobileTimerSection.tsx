import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Power, 
  Shield, 
  History, 
  CheckCircle2, 
  ChevronRight,
  Sun,
  Moon,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { RelayChannelConfig, GangCount } from '../types/firmware';

export interface MobileUserSchedule {
  id: string;
  name: string;
  time: string; // "HH:MM" 24h
  days: ('Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat')[];
  action: 'ON' | 'OFF';
  channelIds: number[]; // e.g. [1, 2] or [1, 2, 3, 4] for all
  enabled: boolean;
  category?: 'morning' | 'night' | 'custom';
}

interface MobileTimerSectionProps {
  channels: RelayChannelConfig[];
  gangCount: GangCount;
  onToggle: (id: number) => void;
  activeTimers: Record<number, number>;
  onSetTimer: (channelId: number, minutes: number) => void;
  formatTimer: (seconds: number) => string;
  roomName: string;
}

const ALL_DAYS: ('Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat')[] = [
  'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
];

export const MobileTimerSection: React.FC<MobileTimerSectionProps> = ({
  channels,
  gangCount,
  onToggle,
  activeTimers,
  onSetTimer,
  formatTimer,
  roomName,
}) => {
  const activeChannels = channels.slice(0, gangCount);

  // Sub-tabs designed strictly for end-users
  const [subTab, setSubTab] = useState<'schedules' | 'countdown' | 'away' | 'activity'>('schedules');

  // End-user schedules list
  const [schedules, setSchedules] = useState<MobileUserSchedule[]>([
    {
      id: 'sch_1',
      name: 'Night Auto-Off',
      time: '23:00',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      action: 'OFF',
      channelIds: activeChannels.map(c => c.id),
      enabled: true,
      category: 'night',
    },
    {
      id: 'sch_2',
      name: 'Morning Wakeup',
      time: '07:00',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      action: 'ON',
      channelIds: [1], // Main Chandelier or primary light
      enabled: true,
      category: 'morning',
    },
    {
      id: 'sch_3',
      name: 'Balcony Evening Light',
      time: '18:30',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      action: 'ON',
      channelIds: activeChannels.length >= 4 ? [4] : [activeChannels[activeChannels.length - 1].id],
      enabled: false,
      category: 'custom',
    },
  ]);

  // Activity Log (Card based, mobile friendly, no 7-column tables!)
  const [activities, setActivities] = useState<{
    id: string;
    time: string;
    scheduleName: string;
    summary: string;
    status: 'success' | 'manual';
  }[]>([
    {
      id: 'act_1',
      time: 'Today, 11:00 PM',
      scheduleName: 'Night Auto-Off',
      summary: `Turned OFF all ${gangCount} lights in ${roomName}`,
      status: 'success',
    },
    {
      id: 'act_2',
      time: 'Today, 07:00 AM',
      scheduleName: 'Morning Wakeup',
      summary: `Turned ON ${activeChannels[0]?.name || 'Main Light'}`,
      status: 'success',
    },
    {
      id: 'act_3',
      time: 'Yesterday, 11:00 PM',
      scheduleName: 'Night Auto-Off',
      summary: `Turned OFF all ${gangCount} lights in ${roomName}`,
      status: 'success',
    },
  ]);

  // Away / Vacation Mode state
  const [awayMode, setAwayMode] = useState({
    enabled: false,
    startTime: '19:00',
    endTime: '23:30',
    selectedChannels: [1],
  });

  // Countdown tab state
  const [selectedCountdownChannel, setSelectedCountdownChannel] = useState<number>(activeChannels[0]?.id || 1);
  const [customMinutes, setCustomMinutes] = useState<string>('45');

  // Add / Edit Schedule Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  
  // Form fields
  const [formName, setFormName] = useState('');
  const [formTime, setFormTime] = useState('22:30');
  const [formDays, setFormDays] = useState<('Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat')[]>([
    'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
  ]);
  const [formAction, setFormAction] = useState<'ON' | 'OFF'>('OFF');
  const [formChannels, setFormChannels] = useState<number[]>(activeChannels.map(c => c.id));
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setBannerNotice(msg);
    setTimeout(() => setBannerNotice(null), 3500);
  };

  // Convert "23:00" to "11:00 PM"
  const formatTime12h = (time24: string) => {
    const [hStr, mStr] = time24.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${m < 10 ? '0' : ''}${m} ${period}`;
  };

  // Format days repeat label
  const formatRepeatDays = (days: string[]) => {
    if (days.length === 7) return 'Everyday';
    if (days.length === 5 && !days.includes('Sat') && !days.includes('Sun')) return 'Weekdays (Mon-Fri)';
    if (days.length === 2 && days.includes('Sat') && days.includes('Sun')) return 'Weekends';
    if (days.length === 0) return 'Only Once';
    return days.join(', ');
  };

  // Toggle schedule enabled state
  const handleToggleSchedule = (id: string) => {
    setSchedules(prev => prev.map(s => {
      if (s.id !== id) return s;
      const nextState = !s.enabled;
      showNotice(`Schedule "${s.name}" ${nextState ? 'Enabled' : 'Paused'}`);
      return { ...s, enabled: nextState };
    }));
  };

  // Delete schedule
  const handleDeleteSchedule = (id: string) => {
    const target = schedules.find(s => s.id === id);
    if (!target) return;
    setSchedules(prev => prev.filter(s => s.id !== id));
    showNotice(`Deleted "${target.name}"`);
  };

  // Quick run schedule now (test)
  const handleRunNow = (sch: MobileUserSchedule) => {
    sch.channelIds.forEach(chId => {
      const ch = channels.find(c => c.id === chId);
      if (ch) {
        const targetState = sch.action === 'ON' ? 1 : 0;
        if (ch.state !== targetState) {
          onToggle(chId);
        }
      }
    });

    // Add activity record
    const newAct = {
      id: `act_${Date.now()}`,
      time: `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      scheduleName: sch.name,
      summary: `Manually executed: Turned ${sch.action} ${sch.channelIds.length} switches`,
      status: 'manual' as const,
    };
    setActivities(prev => [newAct, ...prev]);
    showNotice(`Executed "${sch.name}" successfully!`);
  };

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingScheduleId(null);
    setFormName('Evening Routine');
    setFormTime('20:00');
    setFormDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    setFormAction('OFF');
    setFormChannels(activeChannels.map(c => c.id));
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (sch: MobileUserSchedule) => {
    setEditingScheduleId(sch.id);
    setFormName(sch.name);
    setFormTime(sch.time);
    setFormDays(sch.days);
    setFormAction(sch.action);
    setFormChannels(sch.channelIds);
    setIsModalOpen(true);
  };

  // Save Schedule
  const handleSaveSchedule = () => {
    if (!formName.trim()) {
      showNotice('Please enter a schedule name');
      return;
    }
    if (formChannels.length === 0) {
      showNotice('Please select at least one switch');
      return;
    }

    if (editingScheduleId) {
      // Edit existing
      setSchedules(prev => prev.map(s => {
        if (s.id !== editingScheduleId) return s;
        return {
          ...s,
          name: formName.trim(),
          time: formTime,
          days: formDays,
          action: formAction,
          channelIds: formChannels,
        };
      }));
      showNotice(`Updated schedule "${formName}"`);
    } else {
      // Create new
      const newSch: MobileUserSchedule = {
        id: `sch_${Date.now()}`,
        name: formName.trim(),
        time: formTime,
        days: formDays,
        action: formAction,
        channelIds: formChannels,
        enabled: true,
        category: formTime >= '05:00' && formTime <= '11:59' ? 'morning' : formTime >= '21:00' ? 'night' : 'custom',
      };
      setSchedules(prev => [newSch, ...prev]);
      showNotice(`Created schedule "${formName}"`);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="w-full max-w-full space-y-3.5 overflow-hidden">
      
      {/* Toast Notice */}
      {bannerNotice && (
        <div className="bg-slate-900 text-white text-xs px-3.5 py-2 rounded-2xl shadow-lg flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{bannerNotice}</span>
          </div>
          <button onClick={() => setBannerNotice(null)} className="text-slate-400 hover:text-white ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sub-tab Switcher: Mobile Optimized Pill Bar */}
      <div className="grid grid-cols-4 bg-slate-200/80 p-1 rounded-2xl text-[11px] font-bold w-full">
        <button
          onClick={() => setSubTab('schedules')}
          className={`py-2 rounded-xl transition flex flex-col sm:flex-row items-center justify-center space-x-1 ${
            subTab === 'schedules' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Schedules</span>
        </button>

        <button
          onClick={() => setSubTab('countdown')}
          className={`py-2 rounded-xl transition flex flex-col sm:flex-row items-center justify-center space-x-1 ${
            subTab === 'countdown' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Timer</span>
        </button>

        <button
          onClick={() => setSubTab('away')}
          className={`py-2 rounded-xl transition flex flex-col sm:flex-row items-center justify-center space-x-1 ${
            subTab === 'away' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Away Mode</span>
        </button>

        <button
          onClick={() => setSubTab('activity')}
          className={`py-2 rounded-xl transition flex flex-col sm:flex-row items-center justify-center space-x-1 ${
            subTab === 'activity' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Activity</span>
        </button>
      </div>

      {/* =========================================================================
          SUB-TAB 1: SCHEDULES (AUTOMATED DAILY / WEEKLY ON/OFF)
          ========================================================================= */}
      {subTab === 'schedules' && (
        <div className="space-y-3 w-full">
          {/* Header Card with "+ Add Schedule" */}
          <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Switch Schedules</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Saved to switch hardware • Runs offline
              </p>
            </div>
            <button
              onClick={handleOpenCreate}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1 shadow-xs transition active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add</span>
            </button>
          </div>

          {/* Schedule Cards List */}
          <div className="space-y-2.5 w-full">
            {schedules.map(sch => {
              const targetNames = sch.channelIds
                .map(id => channels.find(c => c.id === id)?.name)
                .filter(Boolean);

              return (
                <div
                  key={sch.id}
                  className={`bg-white rounded-3xl p-4 border transition shadow-xs w-full overflow-hidden ${
                    sch.enabled ? 'border-slate-100' : 'border-slate-200/60 opacity-70 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {/* Time and Action */}
                      <div className="flex items-center space-x-2">
                        <span className="text-xl font-black tracking-tight text-slate-900 font-mono">
                          {formatTime12h(sch.time)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          sch.action === 'ON' 
                            ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          Turn {sch.action}
                        </span>
                      </div>

                      {/* Schedule Name */}
                      <h4 className="text-xs font-bold text-slate-800 mt-1 truncate">
                        {sch.name}
                      </h4>

                      {/* Repeat Days and Targets */}
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {formatRepeatDays(sch.days)} • {targetNames.join(', ')}
                      </p>
                    </div>

                    {/* Quick Toggle Switch */}
                    <button
                      onClick={() => handleToggleSchedule(sch.id)}
                      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                        sch.enabled ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                      title={sch.enabled ? 'Disable Schedule' : 'Enable Schedule'}
                    >
                      <span className={`w-5 h-5 rounded-full bg-white shadow-xs block absolute top-0.5 transition-transform ${
                        sch.enabled ? 'right-0.5' : 'left-0.5'
                      }`}></span>
                    </button>
                  </div>

                  {/* Actions: Edit, Run Now, Delete */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-xs">
                    <button
                      onClick={() => handleRunNow(sch)}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                    >
                      <span>Run Now (Test)</span>
                    </button>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenEdit(sch)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(sch.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Delete Schedule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* User Reassurance Note */}
          <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-100 text-slate-600 text-[11px] flex items-start space-x-2">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              <strong>Offline Reliability:</strong> Schedules are stored directly in your switch’s internal flash memory. They trigger on time even if your Wi-Fi or router is disconnected!
            </p>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 2: COUNTDOWN TIMER (QUICK TURN-OFF COUNTDOWN)
          ========================================================================= */}
      {subTab === 'countdown' && (
        <div className="space-y-3 w-full">
          {/* Active Countdown Hero Card (if any switch has an active timer) */}
          {Object.keys(activeTimers).length > 0 && (
            <div className="bg-amber-500 text-white rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-100 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                  <span>Active Countdown</span>
                </span>
                <span className="text-[10px] bg-amber-600/60 px-2 py-0.5 rounded-full font-mono font-bold">
                  Auto-Off Running
                </span>
              </div>

              {Object.entries(activeTimers).map(([chIdStr, secs]) => {
                const chId = Number(chIdStr);
                const ch = channels.find(c => c.id === chId);
                return (
                  <div key={chId} className="flex items-center justify-between border-t border-amber-400/50 pt-2.5">
                    <div>
                      <p className="text-sm font-bold text-white leading-tight">{ch?.name || `Switch ${chId}`}</p>
                      <p className="text-2xl font-black font-mono tracking-tight mt-0.5">
                        {formatTimer(secs)}
                      </p>
                    </div>
                    <button
                      onClick={() => onSetTimer(chId, 0)}
                      className="px-3 py-1.5 rounded-xl bg-white text-amber-700 hover:bg-amber-50 text-xs font-bold shadow-xs transition"
                    >
                      Cancel Timer
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Set New Countdown Card */}
          <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100 space-y-3.5">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Set Auto-Off Countdown</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pick a switch and duration to automatically turn it off
              </p>
            </div>

            {/* Select Switch Channel */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1.5">Select Switch:</label>
              <div className="grid grid-cols-2 gap-1.5">
                {activeChannels.map(ch => {
                  const isSelected = selectedCountdownChannel === ch.id;
                  const hasTimer = activeTimers[ch.id] !== undefined;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedCountdownChannel(ch.id)}
                      className={`p-2 rounded-2xl text-left transition border ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-400 text-blue-800' 
                          : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold truncate">{ch.name}</span>
                        {hasTimer && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>}
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        {ch.state === 1 ? 'Currently ON' : 'Currently OFF'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preset Time Buttons */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1.5">Quick Presets:</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[15, 30, 45, 60].map(mins => (
                  <button
                    key={mins}
                    onClick={() => {
                      onSetTimer(selectedCountdownChannel, mins);
                      showNotice(`Set ${mins}m timer on ${channels.find(c => c.id === selectedCountdownChannel)?.name}`);
                    }}
                    className="py-2.5 px-2 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 text-center font-bold text-xs text-slate-800 hover:text-blue-700 transition"
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* Longer & Custom Time */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  onSetTimer(selectedCountdownChannel, 120);
                  showNotice(`Set 2 Hours timer on ${channels.find(c => c.id === selectedCountdownChannel)?.name}`);
                }}
                className="py-2.5 px-3 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 text-center font-bold text-xs text-slate-700 hover:text-blue-700 transition"
              >
                2 Hours
              </button>

              <button
                onClick={() => {
                  onSetTimer(selectedCountdownChannel, 240);
                  showNotice(`Set 4 Hours timer on ${channels.find(c => c.id === selectedCountdownChannel)?.name}`);
                }}
                className="py-2.5 px-3 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 text-center font-bold text-xs text-slate-700 hover:text-blue-700 transition"
              >
                4 Hours
              </button>
            </div>

            {/* Custom Minutes Input */}
            <div className="pt-2 border-t border-slate-100 flex items-center space-x-2">
              <input
                type="number"
                min="1"
                max="720"
                value={customMinutes}
                onChange={e => setCustomMinutes(e.target.value)}
                className="w-20 px-3 py-2 text-xs border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                placeholder="Mins"
              />
              <span className="text-xs text-slate-500">minutes</span>
              <button
                onClick={() => {
                  const m = parseInt(customMinutes, 10);
                  if (m > 0) {
                    onSetTimer(selectedCountdownChannel, m);
                    showNotice(`Set ${m}m timer on ${channels.find(c => c.id === selectedCountdownChannel)?.name}`);
                  }
                }}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                Start Timer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 3: AWAY / VACATION MODE (ANTI-BURGLAR SECURITY TIMER)
          ========================================================================= */}
      {subTab === 'away' && (
        <div className="space-y-3 w-full">
          <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-100 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <h4 className="text-base font-bold text-slate-900">Away Security Guard</h4>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Simulates presence when you're away from home by turning selected lights ON and OFF at random intervals during evening hours.
                </p>
              </div>

              <button
                onClick={() => {
                  setAwayMode(prev => ({ ...prev, enabled: !prev.enabled }));
                  showNotice(`Away Mode ${!awayMode.enabled ? 'Activated' : 'Turned Off'}`);
                }}
                className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ${
                  awayMode.enabled ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span className={`w-6 h-6 rounded-full bg-white shadow-xs block absolute top-0.5 transition-transform ${
                  awayMode.enabled ? 'right-0.5' : 'left-0.5'
                }`}></span>
              </button>
            </div>

            {/* Time Window */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <span className="text-xs font-bold text-slate-700 block">Active Time Window:</span>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <label className="text-[10px] text-slate-400 block">From (Evening):</label>
                  <input 
                    type="time" 
                    value={awayMode.startTime}
                    onChange={e => setAwayMode(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block">Until (Night):</label>
                  <input 
                    type="time" 
                    value={awayMode.endTime}
                    onChange={e => setAwayMode(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Channels to randomize */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 block">Lights to Randomize:</span>
              <div className="space-y-1">
                {activeChannels.map(ch => {
                  const isChecked = awayMode.selectedChannels.includes(ch.id);
                  return (
                    <label 
                      key={ch.id} 
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/70 border border-slate-100 text-xs cursor-pointer hover:bg-slate-100/70"
                    >
                      <span className="font-semibold text-slate-800">{ch.name}</span>
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setAwayMode(prev => ({
                            ...prev,
                            selectedChannels: isChecked
                              ? prev.selectedChannels.filter(id => id !== ch.id)
                              : [...prev.selectedChannels, ch.id]
                          }));
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            <div className={`p-3 rounded-2xl text-xs flex items-center space-x-2 ${
              awayMode.enabled ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500'
            }`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                {awayMode.enabled 
                  ? `Active between ${formatTime12h(awayMode.startTime)} and ${formatTime12h(awayMode.endTime)}` 
                  : 'Enable Away Guard before leaving for vacation'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 4: ACTIVITY LOG (MOBILE FITTED, NO 7-COLUMN TABLE!)
          ========================================================================= */}
      {subTab === 'activity' && (
        <div className="space-y-3 w-full">
          <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Recent Executions</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Past schedule & timer triggers on this switch
              </p>
            </div>
            <span className="text-[10px] bg-slate-100 px-2.5 py-1 rounded-full text-slate-600 font-bold font-mono">
              {activities.length} Records
            </span>
          </div>

          <div className="space-y-2 w-full">
            {activities.map(act => (
              <div 
                key={act.id} 
                className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-xs flex items-start space-x-3"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h5 className="text-xs font-bold text-slate-800 truncate">{act.scheduleName}</h5>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">{act.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {act.summary}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          MOBILE MODAL: ADD / EDIT SCHEDULE (BOTTOM SHEET / COMPACT DIALOG)
          ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  {editingScheduleId ? 'Edit Schedule' : 'Add New Schedule'}
                </h4>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              
              {/* Schedule Name */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Schedule Name:</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Night Lamp Off, Morning Wakeup"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Time Picker */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Trigger Time:</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="time"
                    value={formTime}
                    onChange={e => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold font-mono text-base text-slate-900 focus:outline-none focus:border-blue-500 bg-slate-50"
                  />
                  <span className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 font-bold font-mono whitespace-nowrap text-xs">
                    {formatTime12h(formTime)}
                  </span>
                </div>
              </div>

              {/* Action (Turn ON or Turn OFF) */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Switch Action:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormAction('OFF')}
                    className={`py-2 rounded-xl font-bold text-xs transition border ${
                      formAction === 'OFF'
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Turn OFF
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormAction('ON')}
                    className={`py-2 rounded-xl font-bold text-xs transition border ${
                      formAction === 'ON'
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Turn ON
                  </button>
                </div>
              </div>

              {/* Repeat Days */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-700">Repeat Days:</label>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setFormDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])}
                      className="text-[10px] text-blue-600 font-bold hover:underline"
                    >
                      Everyday
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setFormDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])}
                      className="text-[10px] text-blue-600 font-bold hover:underline"
                    >
                      Weekdays
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {ALL_DAYS.map(day => {
                    const isSelected = formDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          setFormDays(prev => 
                            isSelected ? prev.filter(d => d !== day) : [...prev, day]
                          );
                        }}
                        className={`py-2 rounded-xl text-xs font-bold transition text-center ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {day[0]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Channel Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Target Switches:</label>
                <div className="space-y-1.5">
                  {activeChannels.map(ch => {
                    const isChecked = formChannels.includes(ch.id);
                    return (
                      <label
                        key={ch.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                          isChecked ? 'bg-blue-50/60 border-blue-200 text-blue-900' : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="font-semibold">{ch.name}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setFormChannels(prev => 
                              isChecked ? prev.filter(id => id !== ch.id) : [...prev, ch.id]
                            );
                          }}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-slate-100 flex items-center space-x-2 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSchedule}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition"
              >
                {editingScheduleId ? 'Save Changes' : 'Create Schedule'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
