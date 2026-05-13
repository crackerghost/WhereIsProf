import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useStatus } from '../hooks/useStatus';
import { Card, Button, Input } from '../components/ui';
import { 
  User,
  MapPin, 
  Clock, 
  ShieldCheck,
  MessageSquarePlus, 
  Calendar, 
  FileUp, 
  Users,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import * as api from '../services/api';
import { getSocket, resetSocket } from '../services/socket';

const StatusBadge = ({ status }) => {
  const configs = {
    cabin: { label: 'In Cabin', color: 'bg-green-500 text-black border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.3)]' },
    in_classroom: { label: 'In Class', color: 'bg-yellow-500 text-black border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.3)]' },
    busy: { label: 'Busy', color: 'bg-red-500 text-white border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.3)]' },
    logoff: { label: 'Logoff', color: 'bg-zinc-800 text-zinc-300 border-zinc-700/40 shadow-[0_0_20px_rgba(24,24,27,0.3)]' },
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
  const { professors, updateCabin, loading } = useStatus();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('status');
  
  // Find the professor profile for the logged in user
  const profProfile = professors.find(p => p.email === user?.email);
  
  const [currentStatus, setCurrentStatus] = useState('logoff');
  const [cabinRoom, setCabinRoom] = useState('');
  const [cabinFloor, setCabinFloor] = useState('');
  const [departments, setDepartments] = useState([]);
  const [classGroups, setClassGroups] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [broadcasts, setBroadcasts] = useState([]);
  const [selectedClassGroup, setSelectedClassGroup] = useState('');
  const [newMsg, setNewMsg] = useState('');
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const fileInputRef = useRef(null);
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

  const isImageAttachment = (broadcast) => {
    const name = (broadcast?.fileName || '').toLowerCase();
    const url = (broadcast?.content || '').toLowerCase();
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name) || /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/.test(url);
  };

  // Sync state when profProfile is loaded without triggering cascading render lint error
  useEffect(() => {
    if (profProfile) {
      const timeoutId = setTimeout(() => {
        setCurrentStatus(profProfile.status || 'logoff');
        setCabinRoom(profProfile.cabinRoomNumber || profProfile.cabinNumber || '');
        setCabinFloor(profProfile.cabinFloor ?? '');
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [profProfile]);

  // Sync tab with search params
  useEffect(() => {
    const tab = searchParams.get('tab');
    const validTabs = ['status', 'schedule', 'broadcast', 'analytics'];
    
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

  const handleUpdate = async () => {
    if (!profProfile) return;
    const ok = await updateCabin(profProfile._id, {
      status: currentStatus,
      cabinRoomNumber: cabinRoom,
      cabinFloor: cabinFloor === '' ? undefined : Number(cabinFloor),
    });
    if (ok) {
      alert("Protocol Synchronized Successfully");
    } else {
      alert("Failed to synchronize. Please retry.");
    }
  };

  if (loading || !profProfile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center flex-col space-y-4">
        <div className="h-2 w-48 bg-zinc-900 rounded-full overflow-hidden">
           <motion.div 
             animate={{ x: [-200, 200] }}
             transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
             className="h-full w-24 bg-white" 
           />
        </div>
        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">Establishing Control Link...</span>
      </div>
    );
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
               {activeTab} <span className="text-zinc-700">Hub</span>
             </h1>
             <div className="flex flex-col space-y-1">
                <span className="text-white font-black uppercase text-[10px] md:text-sm tracking-[0.1em] truncate">{profProfile.name}</span>
                <div className="flex items-center space-x-2 md:space-x-3">
                   <span className="text-zinc-500 font-bold uppercase text-[8px] md:text-[9px] tracking-[0.2em] truncate">{profProfile.department?.name || profProfile.department}</span>
                   <div className="h-1 w-1 rounded-full bg-zinc-800 shrink-0" />
                   <span className="text-zinc-600 font-medium uppercase text-[8px] md:text-[9px] tracking-widest leading-none shrink-0">0x{profProfile._id?.substring(0,4)}FF</span>
                </div>
             </div>
          </div>
        </div>
        <div className="hidden lg:flex items-center bg-black border border-zinc-900 px-8 py-6 rounded-[2rem] shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <ShieldCheck size={80} className="text-white" />
           </div>
           <div className="text-right mr-8 relative z-10">
              <span className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.4em] block mb-2">Live Node Status</span>
              <span className="text-white font-black uppercase tracking-tighter text-sm">System Synchronized</span>
           </div>
           <div className="relative z-10">
              <StatusBadge status={currentStatus} />
           </div>
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
                      <Clock className="mr-4 text-zinc-500" /> Availability Matrix
                   </h2>
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     {['cabin', 'in_classroom', 'busy', 'logoff'].map((id) => (
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
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">{id.replace('_', ' ')}</span>
                        </button>
                      ))}
                   </div>
                </div>
                <div>
                   <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-8 flex items-center">
                      <MapPin className="mr-4 text-zinc-500" /> Terminal Deployment
                   </h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <Input 
                        label="Cabin Room" 
                        value={cabinRoom}
                        onChange={(e) => setCabinRoom(e.target.value)}
                        className="bg-black h-14 text-lg border-zinc-900"
                      />
                      <Input 
                        label="Cabin Floor" 
                        type="number"
                        value={cabinFloor}
                        onChange={(e) => setCabinFloor(e.target.value)}
                        className="bg-black h-14 text-lg border-zinc-900"
                      />
                      <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest leading-relaxed flex items-center">
                         Sync terminal ID with global floor plan database.
                      </p>
                   </div>
                </div>
                <Button onClick={handleUpdate} className="w-full h-16 text-[10px] font-black uppercase tracking-[0.4em]">Commit Updates</Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="grid grid-cols-1 gap-6">
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-2xl font-black text-white uppercase tracking-tight">Active Sessions</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 md:p-8 border-zinc-900 bg-zinc-950/30">
                <h3 className="text-white font-black uppercase tracking-tight mb-6">Create Class</h3>
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
                <h3 className="text-white font-black uppercase tracking-tight mb-6">Create Session</h3>
                <div className="space-y-4">
                  <select
                    className="w-full h-12 bg-black border border-zinc-900 rounded-xl px-4 text-[10px] uppercase tracking-widest text-zinc-400"
                    value={sessionForm.classGroupId}
                    onChange={(e) => setSessionForm((prev) => ({ ...prev, classGroupId: e.target.value }))}
                  >
                    <option value="">Class Group</option>
                    {classGroups.map((group) => (
                      <option key={group._id} value={group._id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
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
            {sessions.map((item) => (
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
                        <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest block mb-1">Target Class</span>
                    <span className="text-white font-black uppercase text-sm">{item.classGroup?.name}</span>
                     </div>
                     <div>
                        <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest block mb-1">Terminal</span>
                    <span className="text-white font-black uppercase text-sm">{item.roomNumber}</span>
                     </div>
                  </div>
                  <Button variant="ghost" className="text-zinc-600 hover:text-white">Edit</Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'broadcast' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 p-10 border-zinc-900 bg-zinc-950/20">
               <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-10 flex items-center">
                  <MessageSquarePlus className="mr-4 text-zinc-500" /> New Signal Broadcast
               </h2>
               <div className="space-y-8">
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block ml-1">Target Class</label>
                    <select 
                      value={selectedClassGroup}
                      onChange={(e) => setSelectedClassGroup(e.target.value)}
                      className="w-full h-14 bg-black border border-zinc-900 rounded-2xl px-4 text-white font-bold uppercase text-xs focus:ring-1 focus:ring-white outline-none"
                    >
                      <option value="">Select Class</option>
                      {classGroups.map((group) => (
                        <option key={group._id} value={group._id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block ml-1">Target Subject</label>
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
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block ml-1">Transmission Content</label>
                    <textarea 
                      value={newMsg}
                      onChange={(e) => setNewMsg(e.target.value)}
                      className="w-full h-40 bg-black border border-zinc-900 rounded-2xl p-6 text-zinc-300 text-sm focus:ring-1 focus:ring-white outline-none placeholder:text-zinc-700"
                      placeholder="Enter directive or announcement details..."
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
                          {attachmentFile ? 'Resource Attached' : 'Attach Resource'}
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
                      {uploadingAttachment ? 'Uploading...' : 'Deploy Signal'}
                    </Button>
                  </div>
               </div>
            </Card>
            <div className="space-y-6">
               <h3 className="text-zinc-500 font-black uppercase tracking-[0.3em] text-[10px] px-2">Recent Transmissions</h3>
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
                    ) : (
                      <p className="text-zinc-400 text-xs leading-relaxed truncate">{broadcast.content || broadcast.fileName}</p>
                    )}
                  </Card>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-10 bg-white text-black border-none md:col-span-1">
               <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-6">Total <br/> Presence</h2>
               <span className="text-6xl font-black block mb-4">84%</span>
               <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-10">Aggregated student participation across all active modules.</p>
               <Button className="bg-black text-white w-full h-14 text-[9px] font-black uppercase tracking-widest">View Heatmap</Button>
            </Card>
            <div className="md:col-span-2 grid grid-cols-1 gap-4">
              {sessions.map((session) => (
                <Card key={session._id} className="p-8 border-zinc-900 bg-zinc-950/20 flex items-center justify-between group hover:border-zinc-700 transition-all">
                     <div className="flex items-center space-x-6">
                        <div className="h-12 w-12 bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-500 group-hover:text-white transition-all">
                           <Users size={20} />
                        </div>
                        <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-tight">{session.subject}</h3>
                           <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Active Enrollment: 42 Units</span>
                        </div>
                     </div>
                     <div className="flex items-center space-x-8">
                        <div className="text-right">
                           <span className="text-2xl font-black text-white leading-none">92%</span>
                           <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest block">Operational</span>
                        </div>
                        <ArrowRight size={20} className="text-zinc-800 group-hover:text-white transition-colors" />
                     </div>
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
