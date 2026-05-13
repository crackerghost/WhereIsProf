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

const Classroom = () => {
  const { user } = useAuth();
   const [sessions, setSessions] = useState([]);
   const [departments, setDepartments] = useState([]);
   const [classGroups, setClassGroups] = useState([]);
   const [selectedDept, setSelectedDept] = useState('');
   const [selectedClassGroup, setSelectedClassGroup] = useState('');
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
      });
   }, [sessions, user?.role]);

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

  return (
    <div className="space-y-10 pb-20">
      <div className="max-w-3xl space-y-4">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none uppercase">
          Today's <br/> <span className="text-zinc-600">Protocol</span>
        </h1>
        <p className="text-zinc-500 text-lg font-medium max-w-xl">
          Your synchronized academic schedule for the current operational cycle.
        </p>
      </div>

         {user?.role === 'student' && (
            <div className="bg-zinc-950/40 border border-zinc-900 rounded-3xl p-6 md:p-8 space-y-4">
               <h2 className="text-white text-lg font-black uppercase tracking-tight">Select Active Class</h2>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select
                     className="bg-black border border-zinc-900 rounded-xl px-4 py-3 text-[10px] md:text-xs uppercase tracking-widest text-zinc-400"
                     value={selectedDept}
                     onChange={(e) => {
                        setSelectedDept(e.target.value);
                        setSelectedClassGroup('');
                     }}
                  >
                     <option value="">Department</option>
                     {departments.map((dept) => (
                        <option key={dept._id} value={dept._id}>{dept.name}</option>
                     ))}
                  </select>
                  <select
                     className="bg-black border border-zinc-900 rounded-xl px-4 py-3 text-[10px] md:text-xs uppercase tracking-widest text-zinc-400"
                     value={selectedClassGroup}
                     onChange={(e) => setSelectedClassGroup(e.target.value)}
                  >
                     <option value="">Class</option>
                     {classGroups.map((group) => (
                        <option key={group._id} value={group._id}>
                           {group.name}
                        </option>
                     ))}
                  </select>
                  <button
                     type="button"
                     onClick={handleSetActiveClass}
                     className="bg-white text-black rounded-xl px-4 py-3 text-[10px] md:text-xs font-black uppercase tracking-widest"
                     disabled={!selectedClassGroup}
                  >
                     Activate
                  </button>
               </div>
               {activeClassGroupId && (
                  <p className="text-[9px] uppercase tracking-widest text-zinc-600">Active class linked.</p>
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
                        <span className="text-[8px] font-black uppercase mt-1 tracking-tighter">Schedule</span>
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
                        <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest block">Lead</span>
                        <div className="flex items-center space-x-2">
                           <RiUser3Fill className="text-zinc-500" size={14} />
                           <span className="text-sm font-bold text-zinc-400 uppercase tracking-tight">
                              {item.lead || 'TBD'}
                           </span>
                        </div>
                     </div>

                     <div className="space-y-1">
                        <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest block">Terminal</span>
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
          <p className="text-zinc-600 text-lg font-black uppercase tracking-[0.3em]">No Sessions Scheduled</p>
        </div>
      )}
    </div>
  );
};

export default Classroom;
