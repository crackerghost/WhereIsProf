import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RiNotification4Fill, 
  RiMessage3Fill, 
  RiFileDownloadFill, 
  RiArrowRightSLine,
  RiTimeLine,
  RiUser3Fill,
  RiCloseLine
} from 'react-icons/ri';
import { Card } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';
import { getSocket } from '../services/socket';

const UpdateDetail = ({ subject, onClose }) => {
  const isImageAttachment = (update) => {
    const name = (update.fileName || '').toLowerCase();
    const url = (update.content || '').toLowerCase();
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name) || /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/.test(url);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-zinc-950 border-l border-zinc-900 z-[100] shadow-2xl flex flex-col"
    >
      <div className="p-6 md:p-8 border-b border-zinc-900 flex justify-between items-center bg-gradient-to-b from-zinc-800/20 to-transparent">
        <div className="min-w-0">
          <h2 className="text-white font-black uppercase tracking-tighter text-xl md:text-2xl leading-none truncate">{subject.subject}</h2>
          <span className="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-widest truncate block mt-1">{subject.faculty || 'Faculty'}</span>
        </div>
        <button onClick={onClose} className="p-2 bg-zinc-900 rounded-xl text-zinc-400 hover:text-white transition-colors shrink-0 ml-4">
          <RiCloseLine size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
        {subject.updates.map((update) => (
          <div key={update.id} className="space-y-3">
            <div className="flex items-center space-x-3 text-zinc-600">
              <RiTimeLine size={12} />
              <span className="text-[9px] font-black uppercase tracking-widest">{update.date}</span>
            </div>
            
            {update.type === 'text' ? (
              <div className="p-4 md:p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                <p className="text-zinc-300 text-xs md:text-sm leading-relaxed">{update.content}</p>
              </div>
            ) : isImageAttachment(update) ? (
              <a
                href={update.content}
                target="_blank"
                rel="noreferrer"
                className="block p-3 bg-zinc-900/40 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-colors"
              >
                <img
                  src={update.content}
                  alt={update.fileName || 'attachment'}
                  className="w-full max-h-[420px] object-contain rounded-xl bg-black"
                />
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-tight text-zinc-200 truncate">{update.fileName || 'Image'}</p>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase">{update.fileSize}</span>
                </div>
              </a>
            ) : (
              <a
                href={update.content}
                target="_blank"
                rel="noreferrer"
                download={update.fileName || 'attachment'}
                className="p-4 md:p-5 bg-white text-black rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-zinc-200 transition-colors"
              >
                <div className="flex items-center space-x-4 min-w-0">
                  <div className="bg-black p-2 rounded-xl text-white shrink-0">
                    <RiFileDownloadFill size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] md:text-xs font-black uppercase tracking-tight truncate">{update.fileName}</p>
                    <span className="text-[8px] md:text-[9px] font-bold opacity-50 uppercase">{update.fileSize}</span>
                  </div>
                </div>
                <RiArrowRightSLine size={20} className="shrink-0 ml-2" />
              </a>
            )}
          </div>
        ))}
      </div>
      
      <div className="p-6 md:p-8 border-t border-zinc-900 bg-zinc-950 shrink-0">
         <p className="text-[8px] md:text-[9px] font-bold text-zinc-700 uppercase tracking-[0.3em] text-center">Protocol Communications Secured</p>
      </div>
    </motion.div>
  );
};

const Updates = () => {
  const { user } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [broadcasts, setBroadcasts] = useState([]);

  const classGroupId = user?.activeClassGroup?._id || user?.activeClassGroup;

  useEffect(() => {
    if (!classGroupId) return;

    const loadBroadcasts = async () => {
      try {
        const { data } = await api.getBroadcasts(classGroupId);
        setBroadcasts(data);
      } catch (error) {
        console.error('Failed to load broadcasts', error);
      }
    };

    loadBroadcasts();
  }, [classGroupId]);

  useEffect(() => {
    if (!user?.token || !classGroupId) return;

    const socket = getSocket(user.token);
    socket.emit('class:join', classGroupId);

    const handleBroadcast = (payload) => {
      setBroadcasts((prev) => [payload, ...prev]);
    };

    socket.on('broadcast:new', handleBroadcast);

    return () => {
      socket.off('broadcast:new', handleBroadcast);
      socket.emit('class:leave', classGroupId);
    };
  }, [user?.token, classGroupId]);

  const subjectUpdates = useMemo(() => {
    const grouped = new Map();

    broadcasts.forEach((broadcast) => {
      const subjectKey = broadcast.subject || 'General';
      if (!grouped.has(subjectKey)) {
        grouped.set(subjectKey, {
          subject: subjectKey,
          faculty: broadcast.faculty?.name || 'Faculty',
          updates: [],
        });
      }

      grouped.get(subjectKey).updates.push({
        id: broadcast._id,
        date: new Date(broadcast.createdAt).toLocaleString(),
        type: broadcast.type || 'text',
        content: broadcast.content,
        fileName: broadcast.fileName,
        fileSize: broadcast.fileSize,
      });
    });

    return Array.from(grouped.values());
  }, [broadcasts]);

  useEffect(() => {
    if (!selectedSubject) return;
    const updated = subjectUpdates.find((item) => item.subject === selectedSubject.subject);
    if (updated && updated !== selectedSubject) {
      const timeoutId = setTimeout(() => {
        setSelectedSubject(updated);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [subjectUpdates, selectedSubject]);

  return (
    <div className="space-y-10 pb-20 relative">
      <div className="max-w-3xl space-y-4">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tighter leading-none uppercase">
          Signal <br className="hidden sm:block"/> <span className="text-zinc-600">Broadcast</span>
        </h1>
        <p className="text-zinc-500 text-sm md:text-lg font-medium max-w-xl">
          Receive critical updates and administrative directives from faculty leads.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {!classGroupId && (
          <Card className="p-6 border-zinc-900 bg-zinc-950/50">
            <p className="text-zinc-500 text-sm">Select an active class group to receive broadcasts.</p>
          </Card>
        )}
        {subjectUpdates.map((subject, index) => (
          <motion.div
            key={subject.subject}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card 
              onClick={() => setSelectedSubject(subject)}
              className="p-5 md:p-6 border-zinc-900 bg-zinc-950/50 hover:border-zinc-700 transition-all duration-300 group cursor-pointer"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center space-x-4 md:space-x-6 min-w-0">
                  <div className="h-12 w-12 md:h-14 md:w-14 bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-500 group-hover:text-white group-hover:bg-zinc-800 transition-all shrink-0">
                    <RiMessage3Fill size={20} md:size={24} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight leading-none mb-2 truncate">{subject.subject}</h3>
                    <div className="flex items-center space-x-2 md:space-x-3">
                       <RiUser3Fill size={10} className="text-zinc-700" />
                       <span className="text-[8px] md:text-[10px] font-bold text-zinc-600 uppercase tracking-widest truncate">{subject.faculty || 'Faculty'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 md:space-x-6 shrink-0">
                  <div className="text-right hidden sm:block">
                     <span className="text-white font-black text-xs block">{subject.updates.length}</span>
                     <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">Active Signals</span>
                  </div>
                  <div className="h-8 w-8 md:h-10 md:w-10 bg-zinc-950 border border-zinc-900 rounded-xl flex items-center justify-center text-zinc-700 group-hover:text-white group-hover:border-zinc-700 transition-all">
                    <RiArrowRightSLine size={18} md:size={20} />
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedSubject && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSubject(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[90]"
            />
            <UpdateDetail 
              subject={selectedSubject} 
              onClose={() => setSelectedSubject(null)} 
            />
          </>
        )}
      </AnimatePresence>

      <div className="pt-10 flex items-center justify-center px-4">
         <div className="flex items-center space-x-3 md:space-x-4 px-5 py-2.5 md:px-6 md:py-3 bg-zinc-950 rounded-full border border-zinc-900 shadow-2xl">
            <RiNotification4Fill className="text-white animate-bounce" size={14} md:size={16} />
            <span className="text-[8px] md:text-[9px] font-black text-white uppercase tracking-[0.2em] md:tracking-[0.3em] text-center">All signals current and synchronized</span>
         </div>
      </div>
    </div>
  );
};

export default Updates;
