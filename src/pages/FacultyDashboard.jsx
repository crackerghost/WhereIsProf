import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useStatus } from '../hooks/useStatus';
import { Card, Button, Input } from '../components/ui';
import {
  User,
  MapPin,
  Clock,
  MessageSquarePlus,
  Calendar,
  FileUp,
  ArrowRight,
  Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import * as api from '../services/api';
import { getSocket, resetSocket } from '../services/socket';
import PageSkeleton from '../components/PageSkeleton';
import { useToast } from '../hooks/useToast';

const formatClassGroupLabel = (group) => {
  const name = String(group?.name || '').trim();
  const semester = String(group?.semester || '').trim();
  const section = String(group?.section || '').trim();
  if (semester && section) return `${name} ${semester}-${section}`;
  if (section) return `${name} ${section}`;
  if (semester) return `${name} ${semester}`;
  return name || 'Class';
};

const getTodayDateInputValue = () => {
  const now = new Date();
  const tzOffsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 10);
};

const getDayNameFromDateInput = (dateValue) => {
  if (!dateValue) return '';
  const date = new Date(`${dateValue}T00:00:00`);
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
};

const shiftDate = (dateValue, days) => {
  const base = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  base.setDate(base.getDate() + days);
  const tzOffsetMs = base.getTimezoneOffset() * 60000;
  return new Date(base.getTime() - tzOffsetMs).toISOString().slice(0, 10);
};

const StatusBadge = ({ status }) => {
  const configs = {
    cabin: { label: 'In Office', color: 'bg-green-500 text-black border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.3)]' },
    in_classroom: { label: 'In Class', color: 'bg-yellow-500 text-black border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.3)]' },
    busy: { label: 'Busy', color: 'bg-red-500 text-white border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.3)]' },
    logoff: { label: 'Offline', color: 'bg-zinc-800 text-zinc-300 border-zinc-700/40 shadow-[0_0_20px_rgba(24,24,27,0.3)]' },
  };
  const config = configs[status] || configs.logoff;
  return (
    <div className={cn("px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500", config.color)}>
      {config.label}
    </div>
  );
};

const FacultyDashboard = () => {
  const { user } = useAuth();
  const toast = useToast();
  const { professors, updateCabin, loading } = useStatus();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('status');
  
  // Find the professor profile for the logged in user
  const profProfile = professors.find(p => p.email === user?.email);
  
  const [currentStatus, setCurrentStatus] = useState('logoff');
  const [cabinRoom, setCabinRoom] = useState('');
  const [currentClassroomRoom, setCurrentClassroomRoom] = useState('');
  const [customStatusMessage, setCustomStatusMessage] = useState('');
  const [departments, setDepartments] = useState([]);
  const [classGroups, setClassGroups] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [selectedClassGroup, setSelectedClassGroup] = useState('');
  const [sessionClassSearch, setSessionClassSearch] = useState('');
  const [broadcastClassSearch, setBroadcastClassSearch] = useState('');
  const [newMsg, setNewMsg] = useState('');
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [selectedScheduleDate, setSelectedScheduleDate] = useState(getTodayDateInputValue());
  const fileInputRef = useRef(null);
  const hydratedProfileRef = useRef(false);
  const [classGroupForm, setClassGroupForm] = useState({
    departmentId: '',
    name: '',
    floor: '',
  });
  const [sessionForm, setSessionForm] = useState({
    classGroupId: '',
    subject: '',
    day: 'Monday',
    startTime: '09:00',
    endTime: '10:00',
    roomNumber: '',
  });

  const filteredScheduleSessions = useMemo(() => {
    const selectedDay = getDayNameFromDateInput(selectedScheduleDate);
    return sessions.filter((item) => String(item.day || '') === selectedDay);
  }, [selectedScheduleDate, sessions]);

  const filteredClassGroupsForSessionForm = useMemo(() => {
    const query = sessionClassSearch.trim().toLowerCase();
    if (!query) return classGroups;
    return classGroups.filter((group) => formatClassGroupLabel(group).toLowerCase().includes(query));
  }, [classGroups, sessionClassSearch]);

  const filteredClassGroupsForBroadcast = useMemo(() => {
    const query = broadcastClassSearch.trim().toLowerCase();
    if (!query) return classGroups;
    return classGroups.filter((group) => formatClassGroupLabel(group).toLowerCase().includes(query));
  }, [broadcastClassSearch, classGroups]);

  const isImageAttachment = (broadcast) => {
    const name = (broadcast?.fileName || '').toLowerCase();
    const url = (broadcast?.content || '').toLowerCase();
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name) || /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/.test(url);
  };

  // Hydrate editable fields from profile once, then avoid resetting on every live socket tick.
  useEffect(() => {
    if (!profProfile || hydratedProfileRef.current) return;
    hydratedProfileRef.current = true;
    setCurrentStatus(profProfile.status || 'logoff');
    setCabinRoom(profProfile.cabinRoomNumber || profProfile.cabinNumber || '');
    setCurrentClassroomRoom(profProfile.currentLocationRoomNumber || '');
    setCustomStatusMessage(profProfile.customStatusMessage || '');
  }, [profProfile]);

  // Sync tab with search params
  useEffect(() => {
    const tab = searchParams.get('tab');
    const validTabs = ['status', 'schedule', 'broadcast'];

    const timeoutId = setTimeout(() => {
      if (tab && validTabs.includes(tab) && tab !== activeTab) {
        setActiveTab(tab);
      } else if (!tab && activeTab !== 'status') {
        setActiveTab('status');
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [searchParams, activeTab]);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const { data } = await api.getDepartments();
        setDepartments(data);
      } catch (error) {
        console.error('Failed to load departments', error);
      }
    };

    loadDepartments();
  }, []);

  useEffect(() => {
    const departmentId = classGroupForm.departmentId || user?.department?._id || user?.department;
    const loadGroups = async () => {
      try {
        const { data } = await api.getClassGroups(departmentId);
        setClassGroups(data);
      } catch (error) {
        console.error('Failed to load class groups', error);
      }
    };

    if (user) {
      loadGroups();
    }
  }, [classGroupForm.departmentId, user]);

  useEffect(() => {
    if (!profProfile?._id) return;

    const loadSessions = async () => {
      try {
        const { data } = await api.getClassSessions({ facultyId: profProfile._id });
        setSessions(data);
      } catch (error) {
        console.error('Failed to load class sessions', error);
      }
    };

    loadSessions();
  }, [profProfile?._id]);

  useEffect(() => {
    const loadBroadcasts = async () => {
      try {
        const { data } = await api.getBroadcasts(selectedClassGroup || undefined);
        setBroadcasts(data);
      } catch (error) {
        console.error('Failed to load broadcasts', error);
      }
    };

    if (user) {
      loadBroadcasts();
    }
  }, [selectedClassGroup, user]);

  useEffect(() => {
    if (!user?.token) {
      resetSocket();
      return;
    }

    const socket = getSocket(user.token);
    const classIds = Array.from(
      new Set(
        sessions
          .map((session) => session.classGroup?._id || session.classGroup)
          .filter(Boolean)
      )
    );

    classIds.forEach((id) => socket.emit('class:join', id));

    const handleBroadcast = (broadcast) => {
      setBroadcasts((prev) => [broadcast, ...prev.filter((item) => item._id !== broadcast._id)]);
    };

    socket.on('broadcast:new', handleBroadcast);

    return () => {
      socket.off('broadcast:new', handleBroadcast);
      classIds.forEach((id) => socket.emit('class:leave', id));
    };
  }, [sessions, user?.token]);

  const dayOptions = useMemo(() => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], []);

  const formatFileSize = (size) => {
    if (!size && size !== 0) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = Number(size);
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
  };

  const deriveFloorFromRoom = (room) => {
    const normalized = String(room || '').trim();
    const match = normalized.match(/^(\d)/);
    if (!match) return null;
    const floor = Number(match[1]);
    return Number.isFinite(floor) ? floor : null;
  };

  const handleUpdate = async () => {
    if (!profProfile) return;
    const payload = {
      status: currentStatus,
      customStatusMessage: String(customStatusMessage || '').trim().slice(0, 80),
    };

    // Cabin coordinates are only applied when the faculty is in cabin mode.
    if (currentStatus === 'cabin') {
      const room = String(cabinRoom || '').trim();
      payload.cabinRoomNumber = room;
      payload.cabinFloor = deriveFloorFromRoom(room);
    }

    if (currentStatus === 'in_classroom') {
      const room = String(currentClassroomRoom || '').trim();
      payload.currentLocationRoomNumber = room;
      payload.currentLocationFloor = deriveFloorFromRoom(room);
    } else {
      payload.currentLocationRoomNumber = '';
      payload.currentLocationFloor = null;
    }

    const ok = await updateCabin(profProfile._id, payload);
    if (ok) {
      toast.success('Status updated');
    } else {
      toast.error('Could not update status. Please try again.');
    }
  };

  const tabTitles = {
    status: 'My Status',
    schedule: 'My Schedule',
    broadcast: 'Announcements',
  };

  if (loading || !profProfile) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-zinc-950/40 p-6 md:p-8 rounded-[2.5rem] border border-zinc-900 backdrop-blur-md">
        <div className="flex items-center space-x-6 md:space-x-8">
          <div className="h-20 w-24 md:h-24 md:w-24 bg-white rounded-[2rem] flex items-center justify-center text-black shrink-0 shadow-[0_0_50px_rgba(255,255,255,0.15)] group hover:scale-105 transition-transform duration-500">
             <User size={40} className="group-hover:rotate-12 transition-transform duration-500" />
          </div>
          <div className="space-y-2 md:space-y-3 min-w-0">
             <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none truncate">
               {tabTitles[activeTab] || 'Dashboard'}
             </h1>
             <div className="flex flex-col space-y-1">
                <span className="text-white font-black uppercase text-[10px] md:text-sm tracking-[0.1em] truncate">{profProfile.name}</span>
                <span className="text-zinc-500 font-bold uppercase text-[8px] md:text-[9px] tracking-[0.2em] truncate">{profProfile.department?.name || profProfile.department}</span>
             </div>
          </div>
        </div>
        <div className="hidden lg:flex items-center bg-black border border-zinc-900 px-8 py-6 rounded-[2rem] shadow-2xl">
           <div className="text-right mr-6">
              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.4em] block mb-2">Current Status</span>
              <span className="text-white font-black uppercase tracking-tighter text-sm">Visible to students</span>
           </div>
           <StatusBadge status={currentStatus} />
        </div>
      </div>

      {/* Main Content Area */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {activeTab === 'status' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <Card className="xl:col-span-2 p-6 md:p-10 border-zinc-900 bg-zinc-950/20 backdrop-blur-xl">
              <div className="space-y-12">
                <div>
                   <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-8 flex items-center">
                      <Clock className="mr-4 text-zinc-500" /> Set Availability
                   </h2>
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     {[
                       { id: 'cabin', label: 'In Office' },
                       { id: 'in_classroom', label: 'In Class' },
                       { id: 'busy', label: 'Busy' },
                       { id: 'logoff', label: 'Offline' },
                     ].map(({ id, label }) => (
                        <button
                          key={id}
                          onClick={() => setCurrentStatus(id)}
                          className={cn(
                            "flex flex-col items-center justify-center p-8 rounded-3xl border-2 transition-all duration-300 relative group overflow-hidden",
                            currentStatus === id
                              ? `border-white bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.1)]`
                              : 'border-zinc-900 bg-black text-zinc-600 hover:border-zinc-800 hover:text-white'
                          )}
                        >
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
                        </button>
                      ))}
                   </div>
                </div>
                <div>
                   <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-8 flex items-center">
                      <MapPin className="mr-4 text-zinc-500" /> Location Details
                   </h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <Input
                        label="Office Room"
                        value={cabinRoom}
                        onChange={(e) => setCabinRoom(e.target.value)}
                        className="bg-black h-14 text-lg border-zinc-900"
                      />
                      <Input
                        label="Status Note (Optional)"
                        value={customStatusMessage}
                        onChange={(e) => setCustomStatusMessage(e.target.value.slice(0, 80))}
                        placeholder="e.g. In a meeting, back in 10 mins"
                        className="bg-black h-14 text-sm border-zinc-900"
                      />
                      {currentStatus === 'in_classroom' && (
                        <Input
                          label="Current Classroom"
                          value={currentClassroomRoom}
                          onChange={(e) => setCurrentClassroomRoom(e.target.value)}
                          className="bg-black h-14 text-lg border-zinc-900"
                        />
                      )}
                      <p className="md:col-span-2 text-zinc-600 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                         Floor is detected from the room number (e.g. 205 → floor 2).
                      </p>
                    </div>
                </div>
                <Button onClick={handleUpdate} className="w-full h-16 text-[10px] font-black uppercase tracking-[0.4em]">Save Changes</Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="grid grid-cols-1 gap-6">
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-2xl font-black text-white uppercase tracking-tight">Class Schedule</h2>
               <div className="rounded-2xl border border-zinc-900 bg-zinc-950/60 p-2 flex items-center gap-2">
                 <button
                   type="button"
                   onClick={() => setSelectedScheduleDate(getTodayDateInputValue())}
                   className="h-9 px-3 rounded-xl border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-white hover:border-zinc-700"
                 >
                   Today
                 </button>
                 <button
                   type="button"
                   onClick={() => setSelectedScheduleDate(shiftDate(getTodayDateInputValue(), 1))}
                   className="h-9 px-3 rounded-xl border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-white hover:border-zinc-700"
                 >
                   Tomorrow
                 </button>
                 <input
                   type="date"
                   value={selectedScheduleDate}
                   onChange={(e) => setSelectedScheduleDate(e.target.value)}
                   className="h-9 bg-black border border-zinc-900 rounded-xl px-3 text-zinc-300 text-xs uppercase tracking-widest"
                 />
               </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 md:p-8 border-zinc-900 bg-zinc-950/30">
                <h3 className="text-white font-black uppercase tracking-tight mb-6">Add Class</h3>
                <div className="space-y-4">
                  <select
                    className="w-full h-12 bg-black border border-zinc-900 rounded-xl px-4 text-[10px] uppercase tracking-widest text-zinc-400"
                    value={classGroupForm.departmentId}
                    onChange={(e) => setClassGroupForm((prev) => ({ ...prev, departmentId: e.target.value }))}
                  >
                    <option value="">Department</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>{dept.name}</option>
                    ))}
                  </select>
                  <Input
                    label="Class Name"
                    value={classGroupForm.name}
                    onChange={(e) => setClassGroupForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="bg-black border-zinc-900"
                  />
                  <Input
                    label="Floor"
                    type="number"
                    value={classGroupForm.floor}
                    onChange={(e) => setClassGroupForm((prev) => ({ ...prev, floor: e.target.value }))}
                    className="bg-black border-zinc-900"
                  />
                  <Button
                    className="w-full h-12 text-[10px] font-black uppercase tracking-[0.2em]"
                    disabled={!classGroupForm.name || classGroupForm.floor === '' || !(classGroupForm.departmentId || user?.department)}
                    onClick={async () => {
                      try {
                        const departmentId = classGroupForm.departmentId || user?.department?._id || user?.department;
                        await api.createClassGroup({
                          departmentId,
                          name: classGroupForm.name,
                          floor: Number(classGroupForm.floor),
                        });
                        setClassGroupForm({ departmentId: '', name: '', floor: '' });
                        const { data } = await api.getClassGroups(departmentId);
                        setClassGroups(data);
                      } catch (error) {
                        console.error('Failed to create class group', error);
                      }
                    }}
                  >
                    Save Class
                  </Button>
                </div>
              </Card>
              <Card className="p-6 md:p-8 border-zinc-900 bg-zinc-950/30">
                <h3 className="text-white font-black uppercase tracking-tight mb-6">Add Session</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    value={sessionClassSearch}
                    onChange={(e) => setSessionClassSearch(e.target.value)}
                    placeholder="Search classes..."
                    className="w-full h-12 bg-black border border-zinc-900 rounded-xl px-4 text-[10px] uppercase tracking-widest text-zinc-300 placeholder:text-zinc-600"
                  />
                  <div className="max-h-44 overflow-y-auto rounded-xl border border-zinc-900 bg-black p-2 space-y-1">
                    {filteredClassGroupsForSessionForm.map((group) => {
                      const isSelected = sessionForm.classGroupId === group._id;
                      return (
                        <button
                          key={group._id}
                          type="button"
                          onClick={() => setSessionForm((prev) => ({ ...prev, classGroupId: group._id }))}
                          className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition ${
                            isSelected ? 'bg-white text-black' : 'text-zinc-300 hover:bg-zinc-900'
                          }`}
                        >
                          {formatClassGroupLabel(group)}
                        </button>
                      );
                    })}
                    {filteredClassGroupsForSessionForm.length === 0 && (
                      <p className="px-3 py-2 text-[10px] uppercase tracking-widest text-zinc-600">No classes found</p>
                    )}
                  </div>
                  <Input
                    label="Subject"
                    value={sessionForm.subject}
                    onChange={(e) => setSessionForm((prev) => ({ ...prev, subject: e.target.value }))}
                    className="bg-black border-zinc-900"
                  />
                  <div className="grid grid-cols-1 gap-4">
                    <select
                      className="w-full h-12 bg-black border border-zinc-900 rounded-xl px-4 text-[10px] uppercase tracking-widest text-zinc-400"
                      value={sessionForm.day}
                      onChange={(e) => setSessionForm((prev) => ({ ...prev, day: e.target.value }))}
                    >
                      {dayOptions.map((day) => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Start"
                      value={sessionForm.startTime}
                      onChange={(e) => setSessionForm((prev) => ({ ...prev, startTime: e.target.value }))}
                      className="bg-black border-zinc-900"
                    />
                    <Input
                      label="End"
                      value={sessionForm.endTime}
                      onChange={(e) => setSessionForm((prev) => ({ ...prev, endTime: e.target.value }))}
                      className="bg-black border-zinc-900"
                    />
                  </div>
                  <Input
                    label="Room"
                    value={sessionForm.roomNumber}
                    onChange={(e) => setSessionForm((prev) => ({ ...prev, roomNumber: e.target.value }))}
                    className="bg-black border-zinc-900"
                  />
                  <Button
                    className="w-full h-12 text-[10px] font-black uppercase tracking-[0.2em]"
                    disabled={!sessionForm.classGroupId || !sessionForm.subject || !sessionForm.day || !sessionForm.startTime || !sessionForm.endTime || !sessionForm.roomNumber}
                    onClick={async () => {
                      try {
                        const selectedGroup = classGroups.find((group) => group._id === sessionForm.classGroupId);
                        const payload = {
                          ...sessionForm,
                          floor: selectedGroup?.floor,
                        };
                        await api.createClassSession(payload);
                        setSessionForm((prev) => ({
                          ...prev,
                          subject: '',
                          roomNumber: '',
                        }));
                        const { data } = await api.getClassSessions({ facultyId: profProfile._id });
                        setSessions(data);
                      } catch (error) {
                        console.error('Failed to create class session', error);
                      }
                    }}
                  >
                    Save Session
                  </Button>
                </div>
              </Card>
            </div>
            {filteredScheduleSessions.map((item) => (
              <Card key={item._id} className="p-8 border-zinc-900 bg-zinc-950/20 group hover:border-zinc-700 transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="flex items-center space-x-6">
                    <div className="h-14 w-14 bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-500 group-hover:text-white transition-all">
                       <Calendar size={24} />
                    </div>
                    <div>
                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block mb-1">{item.day} · {item.startTime}-{item.endTime}</span>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">{item.subject}</h3>
                    </div>
                  </div>
                  <div className="flex items-center space-x-12">
                     <div>
                        <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest block mb-1">Class</span>
                    <span className="text-white font-black uppercase text-sm">{item.classGroup?.name}</span>
                     </div>
                     <div>
                        <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest block mb-1">Room</span>
                    <span className="text-white font-black uppercase text-sm">{item.roomNumber}</span>
                     </div>
                  </div>
                </div>
              </Card>
            ))}
            {filteredScheduleSessions.length === 0 && (
              <Card className="p-8 border-zinc-900 bg-zinc-950/20">
                <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">No sessions scheduled for this date.</p>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'broadcast' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 p-10 border-zinc-900 bg-zinc-950/20">
               <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-10 flex items-center">
                  <MessageSquarePlus className="mr-4 text-zinc-500" /> New Announcement
               </h2>
               <div className="space-y-8">
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block ml-1">Class</label>
                    <input
                      type="text"
                      value={broadcastClassSearch}
                      onChange={(e) => setBroadcastClassSearch(e.target.value)}
                      placeholder="Search classes..."
                      className="w-full h-12 mb-3 bg-black border border-zinc-900 rounded-2xl px-4 text-zinc-300 font-bold uppercase text-xs focus:ring-1 focus:ring-white outline-none placeholder:text-zinc-700"
                    />
                    <div className="max-h-52 overflow-y-auto rounded-2xl border border-zinc-900 bg-black p-2 space-y-1">
                      {filteredClassGroupsForBroadcast.map((group) => {
                        const isSelected = selectedClassGroup === group._id;
                        return (
                          <button
                            key={group._id}
                            type="button"
                            onClick={() => setSelectedClassGroup(group._id)}
                            className={`w-full text-left px-3 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition ${
                              isSelected ? 'bg-white text-black' : 'text-zinc-300 hover:bg-zinc-900'
                            }`}
                          >
                            {formatClassGroupLabel(group)}
                          </button>
                        );
                      })}
                      {filteredClassGroupsForBroadcast.length === 0 && (
                        <p className="px-3 py-3 text-[10px] uppercase tracking-widest text-zinc-600">No class match</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block ml-1">Subject</label>
                    <select 
                      value={broadcastSubject}
                      onChange={(e) => setBroadcastSubject(e.target.value)}
                      className="w-full h-14 bg-black border border-zinc-900 rounded-2xl px-4 text-white font-bold uppercase text-xs focus:ring-1 focus:ring-white outline-none"
                    >
                      <option value="">Select Subject</option>
                      {sessions
                        .filter((session) => !selectedClassGroup || session.classGroup?._id === selectedClassGroup)
                        .map((session) => (
                        <option key={session._id} value={session.subject}>{session.subject}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block ml-1">Message</label>
                    <textarea
                      value={newMsg}
                      onChange={(e) => setNewMsg(e.target.value)}
                      className="w-full h-40 bg-black border border-zinc-900 rounded-2xl p-6 text-zinc-300 text-sm focus:ring-1 focus:ring-white outline-none placeholder:text-zinc-700"
                      placeholder="Write your announcement..."
                    />
                  </div>
                  {attachmentFile && (
                    <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-3 flex items-center justify-between">
                      <span className="text-zinc-300 text-[10px] font-bold uppercase tracking-wider truncate">
                        {attachmentFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAttachmentFile(null)}
                        className="text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-wider"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  <div className="flex flex-col md:flex-row gap-4">
                     <input
                       ref={fileInputRef}
                       type="file"
                       className="hidden"
                       onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                     />
                     <button
                       type="button"
                       onClick={() => fileInputRef.current?.click()}
                       className="flex-1 h-14 bg-zinc-900 rounded-2xl border border-zinc-800 flex items-center justify-center space-x-3 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                     >
                        <FileUp size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {attachmentFile ? 'File Attached' : 'Attach File'}
                        </span>
                     </button>
                    <Button
                      className="flex-[2] h-14 text-[10px] font-black uppercase tracking-[0.3em]"
                      onClick={async () => {
                       try {
                        if (attachmentFile) {
                          setUploadingAttachment(true);
                          const { data: uploaded } = await api.uploadBroadcastAttachment(attachmentFile);
                          await api.createBroadcast({
                            classGroupId: selectedClassGroup,
                            subject: broadcastSubject,
                            type: 'file',
                            content: uploaded.url,
                            fileName: uploaded.fileName || attachmentFile.name,
                            fileSize: formatFileSize(uploaded.fileSize ?? attachmentFile.size),
                          });
                          setAttachmentFile(null);
                        }

                        if (newMsg.trim()) {
                          await api.createBroadcast({
                            classGroupId: selectedClassGroup,
                            subject: broadcastSubject,
                            type: 'text',
                            content: newMsg.trim(),
                          });
                          setNewMsg('');
                        }
                       } catch (error) {
                        console.error('Failed to create broadcast', error);
                       } finally {
                        setUploadingAttachment(false);
                       }
                      }}
                      disabled={!selectedClassGroup || !broadcastSubject || (!newMsg.trim() && !attachmentFile) || uploadingAttachment}
                    >
                      {uploadingAttachment ? 'Sending...' : 'Send Announcement'}
                    </Button>
                  </div>
               </div>
            </Card>
            <div className="space-y-6">
               <h3 className="text-zinc-500 font-black uppercase tracking-[0.3em] text-[10px] px-2">Recent Announcements</h3>
                {broadcasts.slice(0, 5).map((broadcast) => (
                  <Card key={broadcast._id} className="p-6 border-zinc-900 bg-zinc-950/20">
                    <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest block mb-2">{new Date(broadcast.createdAt).toLocaleString()}</span>
                    {broadcast.type === 'file' && isImageAttachment(broadcast) ? (
                      <a href={broadcast.content} target="_blank" rel="noreferrer" className="block">
                        <img
                          src={broadcast.content}
                          alt={broadcast.fileName || 'attachment'}
                          className="w-full max-h-44 object-cover rounded-xl border border-zinc-800 bg-black mb-2"
                        />
                        <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider truncate">{broadcast.fileName || 'Image'}</p>
                      </a>
                    ) : broadcast.type === 'file' ? (
                      <a
                        href={broadcast.content}
                        target="_blank"
                        rel="noreferrer"
                        download={broadcast.fileName || 'attachment'}
                        className="p-4 md:p-5 bg-white text-black rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-zinc-200 transition-colors"
                      >
                        <div className="flex items-center space-x-4 min-w-0">
                          <div className="bg-black p-2 rounded-xl text-white shrink-0">
                            <Download size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] md:text-xs font-black uppercase tracking-tight truncate">
                              {broadcast.fileName || 'Attachment'}
                            </p>
                            <span className="text-[8px] md:text-[9px] font-bold opacity-50 uppercase">
                              {broadcast.fileSize || ''}
                            </span>
                          </div>
                        </div>
                        <ArrowRight size={18} className="shrink-0 ml-2" />
                      </a>
                    ) : (
                      <div className="p-4 md:p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                        <p className="text-zinc-300 text-xs md:text-sm leading-relaxed">{broadcast.content}</p>
                      </div>
                    )}
                  </Card>
                ))}
            </div>
          </div>
        )}

      </motion.div>
    </div>
  );
};

export default FacultyDashboard;
