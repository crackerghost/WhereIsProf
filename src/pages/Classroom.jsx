import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { 
  RiTimeLine, 
  RiUser3Fill, 
  RiMapPinRangeFill,
  RiCalendarCheckFill
} from 'react-icons/ri';
import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/ui';
import * as api from '../services/api';
import PageSkeleton from '../components/PageSkeleton';

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

const Classroom = () => {
  const { user } = useAuth();
   const [sessions, setSessions] = useState([]);
   const [departments, setDepartments] = useState([]);
   const [classGroups, setClassGroups] = useState([]);
   const [selectedDept, setSelectedDept] = useState('');
   const [selectedClassGroup, setSelectedClassGroup] = useState('');
   const [classSearch, setClassSearch] = useState('');
   const [selectedDate, setSelectedDate] = useState(getTodayDateInputValue());
   const [loading, setLoading] = useState(true);

   const activeClassGroupId = user?.activeClassGroup?._id || user?.activeClassGroup;

   useEffect(() => {
      const fetchTimetable = async () => {
         try {
            const { data } = await api.getTimetable();
            setSessions(data);
         } catch (error) {
            console.error('Failed to fetch timetable', error);
            setSessions([]);
         }
         setLoading(false);
      };

      if (user) {
         fetchTimetable();
      }
   }, [user]);

   useEffect(() => {
      const loadDepartments = async () => {
         try {
            const { data } = await api.getDepartments();
            setDepartments(data);
         } catch (error) {
            console.error('Failed to fetch departments', error);
            setDepartments([]);
         }
      };

      if (user?.role === 'student') {
         loadDepartments();
      }
   }, [user?.role]);

   useEffect(() => {
      const departmentId = selectedDept || user?.department?._id || user?.department;
      if (!departmentId) {
         setClassGroups([]);
         return;
      }

      const loadGroups = async () => {
         try {
            const { data } = await api.getClassGroups(departmentId);
            setClassGroups(data);
         } catch (error) {
            console.error('Failed to fetch class groups', error);
            setClassGroups([]);
         }
      };

      loadGroups();
   }, [selectedDept, user?.department]);

   const timetableItems = useMemo(() => {
      const selectedDay = getDayNameFromDateInput(selectedDate);
      return sessions.map((session) => {
         const time = `${session.startTime} - ${session.endTime}`;
         const lead = user?.role === 'faculty'
            ? session.classGroup?.name
            : session.faculty?.name;
         return {
            id: session._id,
            day: session.day,
            time,
            subject: session.subject,
            lead,
            room: session.roomNumber,
         };
      }).filter((item) => item.day === selectedDay);
   }, [selectedDate, sessions, user?.role]);

   const filteredClassGroups = useMemo(() => {
      const query = classSearch.trim().toLowerCase();
      if (!query) return classGroups;
      return classGroups.filter((group) => formatClassGroupLabel(group).toLowerCase().includes(query));
   }, [classGroups, classSearch]);

  const handleSetActiveClass = async () => {
      if (!selectedClassGroup) return;
      try {
         await api.setActiveClassGroup(selectedClassGroup);
         const { data } = await api.getProfile();
         localStorage.setItem('user', JSON.stringify({ ...data, token: user.token }));
         window.location.reload();
      } catch (error) {
         console.error('Failed to set active class group', error);
      }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-10 pb-20">
      <div className="max-w-3xl space-y-4">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none uppercase">
          Class <br/> <span className="text-zinc-600">Timetable</span>
        </h1>
        <p className="text-zinc-500 text-lg font-medium max-w-xl">
          Your classes for the selected date.
        </p>
        <div className="pt-2 max-w-xl">
          <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest block mb-2">Date</label>
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/60 p-2 flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayDateInputValue())}
                className="h-9 px-3 rounded-xl border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-white hover:border-zinc-700"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(shiftDate(getTodayDateInputValue(), 1))}
                className="h-9 px-3 rounded-xl border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-300 hover:text-white hover:border-zinc-700"
              >
                Tomorrow
              </button>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 flex-1 bg-black border border-zinc-900 rounded-xl px-3 text-zinc-300 text-xs uppercase tracking-widest"
            />
          </div>
        </div>
      </div>

         {user?.role === 'student' && (
            <div className="bg-zinc-950/40 border border-zinc-900 rounded-3xl p-6 md:p-8 space-y-4">
               <h2 className="text-white text-lg font-black uppercase tracking-tight">Choose Your Class</h2>
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <select
                     className="bg-black border border-zinc-900 rounded-xl px-4 py-3 text-[10px] md:text-xs uppercase tracking-widest text-zinc-400"
                     value={selectedDept}
                     onChange={(e) => {
                        setSelectedDept(e.target.value);
                        setSelectedClassGroup('');
                        setClassSearch('');
                     }}
                  >
                     <option value="">Department</option>
                     {departments.map((dept) => (
                        <option key={dept._id} value={dept._id}>{dept.name}</option>
                     ))}
                  </select>
                  <div className="space-y-2">
                     <input
                        type="text"
                        value={classSearch}
                        onChange={(e) => setClassSearch(e.target.value)}
                        placeholder="Search classes..."
                        className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-3 text-[10px] md:text-xs uppercase tracking-widest text-zinc-300 placeholder:text-zinc-600"
                     />
                     <div className="max-h-40 overflow-y-auto rounded-xl border border-zinc-900 bg-black p-2 space-y-1">
                        {filteredClassGroups.map((group) => {
                           const isSelected = selectedClassGroup === group._id;
                           return (
                              <button
                                 key={group._id}
                                 type="button"
                                 onClick={() => setSelectedClassGroup(group._id)}
                                 className={`w-full text-left px-3 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition ${
                                    isSelected ? 'bg-white text-black' : 'text-zinc-300 hover:bg-zinc-900'
                                 }`}
                              >
                                 {formatClassGroupLabel(group)}
                              </button>
                           );
                        })}
                        {filteredClassGroups.length === 0 && (
                           <p className="px-3 py-2 text-[10px] uppercase tracking-widest text-zinc-600">No classes found</p>
                        )}
                     </div>
                  </div>
                  <button
                     type="button"
                     onClick={handleSetActiveClass}
                     className="bg-white text-black rounded-xl px-4 py-3 text-[10px] md:text-xs font-black uppercase tracking-widest"
                     disabled={!selectedClassGroup}
                  >
                     Set as Active
                  </button>
               </div>
               {activeClassGroupId && (
                  <p className="text-[9px] uppercase tracking-widest text-zinc-600">Active class selected.</p>
               )}
            </div>
         )}

         <div className="grid grid-cols-1 gap-6">
            {timetableItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-8 border-zinc-900 bg-zinc-950/50 hover:border-zinc-700 transition-all duration-300 group relative overflow-hidden">
               {/* Decorative background element */}
               <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                  <RiCalendarCheckFill size={120} className="text-white" />
               </div>

               <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                  <div className="flex items-center space-x-6">
                     <div className="h-16 w-16 bg-white rounded-2xl flex flex-col items-center justify-center text-black shrink-0 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                        <RiTimeLine size={24} />
                        <span className="text-[8px] font-black uppercase mt-1 tracking-tighter">Class</span>
                     </div>
                     <div>
                        <div className="flex items-center space-x-2 text-zinc-500 mb-1">
                           <RiTimeLine size={14} />
                           <span className="text-[10px] font-black uppercase tracking-[0.2em]">{item.day} · {item.time}</span>
                        </div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight group-hover:text-zinc-200 transition-colors">
                           {item.subject}
                        </h2>
                     </div>
                  </div>

                  <div className="grid grid-cols-2 md:flex md:items-center gap-6 md:gap-12">
                     <div className="space-y-1">
                        <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest block">Faculty</span>
                        <div className="flex items-center space-x-2">
                           <RiUser3Fill className="text-zinc-500" size={14} />
                           <span className="text-sm font-bold text-zinc-400 uppercase tracking-tight">
                              {item.lead || 'TBD'}
                           </span>
                        </div>
                     </div>

                     <div className="space-y-1">
                        <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest block">Room</span>
                        <div className="flex items-center space-x-2">
                           <RiMapPinRangeFill className="text-white" size={14} />
                           <span className="text-sm font-black text-white uppercase tracking-tight">{item.room}</span>
                        </div>
                     </div>
                  </div>

                  <div className="flex justify-end">
                     <div className="h-2 w-2 rounded-full bg-zinc-800 group-hover:bg-white transition-colors duration-500" />
                  </div>
               </div>
            </Card>
          </motion.div>
        ))}
      </div>

         {!loading && timetableItems.length === 0 && (
        <div className="text-center py-40 bg-zinc-950/30 rounded-3xl border border-dashed border-zinc-900">
          <RiCalendarCheckFill className="mx-auto text-zinc-800 mb-6" size={48} />
          <p className="text-zinc-600 text-lg font-black uppercase tracking-[0.3em]">No Classes Scheduled</p>
        </div>
      )}
    </div>
  );
};

export default Classroom;
