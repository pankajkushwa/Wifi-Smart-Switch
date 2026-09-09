import React, { useState } from 'react';
import { 
  Building2, 
  Home, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  MapPin, 
  ChevronRight, 
  Layers, 
  Sparkles,
  Bed,
  Utensils,
  Tv,
  Briefcase,
  Sun,
  Warehouse,
  FolderPlus
} from 'lucide-react';

export interface Building {
  id: string;
  name: string;
  type: 'Home' | 'Apartment' | 'Villa' | 'Office' | 'Commercial' | 'Warehouse';
  address?: string;
}

export interface Room {
  id: string;
  name: string;
  buildingId: string;
  iconType?: string;
}

interface BuildingRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildings: Building[];
  rooms: Room[];
  activeBuildingId: string;
  onSelectBuilding: (id: string) => void;
  onAddBuilding: (building: Omit<Building, 'id'>) => void;
  onDeleteBuilding: (id: string) => void;
  onAddRoom: (room: Omit<Room, 'id'>) => void;
  onDeleteRoom: (id: string) => void;
  initialTab?: 'buildings' | 'rooms';
}

const ROOM_PRESETS = [
  { name: 'Living Room', icon: 'tv' },
  { name: 'Master Bedroom', icon: 'bed' },
  { name: 'Kids Bedroom', icon: 'bed' },
  { name: 'Kitchen', icon: 'utensils' },
  { name: 'Balcony / Patio', icon: 'sun' },
  { name: 'Conference Room', icon: 'briefcase' },
  { name: 'Private Office', icon: 'briefcase' },
  { name: 'Dining Area', icon: 'utensils' },
  { name: 'Guest Room', icon: 'bed' },
  { name: 'Garage / Storage', icon: 'warehouse' },
];

export const BuildingRoomModal: React.FC<BuildingRoomModalProps> = ({
  isOpen,
  onClose,
  buildings,
  rooms,
  activeBuildingId,
  onSelectBuilding,
  onAddBuilding,
  onDeleteBuilding,
  onAddRoom,
  onDeleteRoom,
  initialTab = 'buildings',
}) => {
  const [tab, setTab] = useState<'buildings' | 'rooms'>(initialTab);
  
  // New Building Form State
  const [isAddingBuilding, setIsAddingBuilding] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBuildingType, setNewBuildingType] = useState<Building['type']>('Home');
  const [newBuildingAddress, setNewBuildingAddress] = useState('');

  // New Room Form State
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedRoomIcon, setSelectedRoomIcon] = useState('tv');

  if (!isOpen) return null;

  const activeBuilding = buildings.find(b => b.id === activeBuildingId) || buildings[0];
  const activeBuildingRooms = rooms.filter(r => r.buildingId === activeBuildingId);

  const handleCreateBuilding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuildingName.trim()) return;

    onAddBuilding({
      name: newBuildingName.trim(),
      type: newBuildingType,
      address: newBuildingAddress.trim() || undefined,
    });

    setNewBuildingName('');
    setNewBuildingAddress('');
    setIsAddingBuilding(false);
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    onAddRoom({
      name: newRoomName.trim(),
      buildingId: activeBuildingId,
      iconType: selectedRoomIcon,
    });

    setNewRoomName('');
    setIsAddingRoom(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span>Manage Homes, Buildings & Rooms</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Organize your smart touch switches across locations and zones
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 px-5 pt-3 bg-white">
          <button
            onClick={() => { setTab('buildings'); setIsAddingBuilding(false); }}
            className={`pb-2.5 px-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 ${
              tab === 'buildings'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Homes / Buildings ({buildings.length})</span>
          </button>

          <button
            onClick={() => { setTab('rooms'); setIsAddingRoom(false); }}
            className={`pb-2.5 px-3 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 ${
              tab === 'rooms'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Rooms in {activeBuilding?.name} ({activeBuildingRooms.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: BUILDINGS / HOMES */}
          {tab === 'buildings' && (
            <div className="space-y-4">
              {!isAddingBuilding ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Select Active Property
                    </span>
                    <button
                      onClick={() => setIsAddingBuilding(true)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1 bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Add Home / Building</span>
                    </button>
                  </div>

                  {/* Buildings List */}
                  <div className="space-y-2.5">
                    {buildings.map((b) => {
                      const isSelected = b.id === activeBuildingId;
                      const roomCount = rooms.filter(r => r.buildingId === b.id).length;

                      return (
                        <div
                          key={b.id}
                          onClick={() => onSelectBuilding(b.id)}
                          className={`p-4 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-300/50'
                              : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="flex items-center space-x-3.5">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              isSelected ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {b.type === 'Office' || b.type === 'Commercial' ? (
                                <Briefcase className="w-5 h-5" />
                              ) : b.type === 'Warehouse' ? (
                                <Warehouse className="w-5 h-5" />
                              ) : (
                                <Home className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm font-bold text-slate-900">{b.name}</h4>
                                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                  {b.type}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {b.address ? `${b.address} • ` : ''}{roomCount} room{roomCount === 1 ? '' : 's'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {isSelected ? (
                              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </span>
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                            {buildings.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteBuilding(b.id);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                title="Delete Property"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* Add New Building Form */
                <form onSubmit={handleCreateBuilding} className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                      <FolderPlus className="w-4 h-4 text-blue-600" />
                      <span>New Property / Building</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsAddingBuilding(false)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Property Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vacation Villa, City Office, Building B"
                      value={newBuildingName}
                      onChange={e => setNewBuildingName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Type
                      </label>
                      <select
                        value={newBuildingType}
                        onChange={e => setNewBuildingType(e.target.value as Building['type'])}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-medium"
                      >
                        <option value="Home">Home</option>
                        <option value="Apartment">Apartment</option>
                        <option value="Villa">Villa</option>
                        <option value="Office">Office</option>
                        <option value="Commercial">Commercial</option>
                        <option value="Warehouse">Warehouse</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Address / Location
                      </label>
                      <input
                        type="text"
                        placeholder="Floor 2, Sunset Blv"
                        value={newBuildingAddress}
                        onChange={e => setNewBuildingAddress(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingBuilding(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-xl font-semibold transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition"
                    >
                      Save Property
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: ROOMS FOR ACTIVE BUILDING */}
          {tab === 'rooms' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Rooms in {activeBuilding?.name}
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Switch location to create rooms in another building
                  </p>
                </div>
                {!isAddingRoom && (
                  <button
                    onClick={() => setIsAddingRoom(true)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1 bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add Room</span>
                  </button>
                )}
              </div>

              {isAddingRoom && (
                <form onSubmit={handleCreateRoom} className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                      <Plus className="w-4 h-4 text-blue-600" />
                      <span>Add Room to {activeBuilding?.name}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsAddingRoom(false)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Room Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Master Bedroom, Dining Hall"
                      value={newRoomName}
                      onChange={e => setNewRoomName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-500 font-medium"
                    />
                  </div>

                  {/* Fast Presets */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                      Quick Suggestions:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {ROOM_PRESETS.map(preset => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            setNewRoomName(preset.name);
                            setSelectedRoomIcon(preset.icon);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] bg-white hover:bg-blue-50 hover:text-blue-600 border border-slate-200 text-slate-600 transition"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingRoom(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-xl font-semibold transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition"
                    >
                      Create Room
                    </button>
                  </div>
                </form>
              )}

              {/* Room Grid / List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeBuildingRooms.map(r => (
                  <div
                    key={r.id}
                    className="p-3 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        {r.iconType === 'bed' ? (
                          <Bed className="w-4 h-4" />
                        ) : r.iconType === 'utensils' ? (
                          <Utensils className="w-4 h-4" />
                        ) : r.iconType === 'briefcase' ? (
                          <Briefcase className="w-4 h-4" />
                        ) : r.iconType === 'sun' ? (
                          <Sun className="w-4 h-4" />
                        ) : (
                          <Tv className="w-4 h-4" />
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-800">{r.name}</span>
                    </div>

                    {activeBuildingRooms.length > 1 && (
                      <button
                        onClick={() => onDeleteRoom(r.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete Room"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Active: <strong className="text-slate-800">{activeBuilding?.name}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
