import { MapPin, Mail, ChevronRight, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '../../components/ui';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const StatusBadge = ({ status }) => {
  const configs = {
    cabin: { label: 'In Office', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
    in_classroom: { label: 'In Class', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    busy: { label: 'Busy', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
    logoff: { label: 'Offline', color: 'bg-zinc-800/60 text-zinc-500 border-zinc-700/40' },
  };

  const config = configs[status] || configs.logoff;

  return (
    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shrink-0", config.color)}>
      {config.label}
    </span>
  );
};

export const ProfessorCard = ({ prof }) => {
  const navigate = useNavigate();
  const roomNumber = prof.classroomNumber || prof.cabinRoomNumber || prof.cabinNumber;
  const roomFloor = prof.classroomFloor || prof.cabinFloor || prof.floor;
  const cabinRoom = prof.cabinRoomNumber || prof.cabinNumber || '—';
  const cabinFloor = prof.cabinFloor ?? '—';
  const isLocationAvailable = Boolean(roomNumber);
  const currentLocationLabel = isLocationAvailable ? `${roomNumber} (Floor ${roomFloor ?? '—'})` : 'Unavailable';
  const normalizedRoom = roomNumber ? String(roomNumber).trim() : '';
  const normalizedFloor = Number.isFinite(Number(roomFloor)) ? Number(roomFloor) : 1;
  const departmentText = prof.departments?.length
    ? prof.departments.map((dept) => dept?.name).filter(Boolean).join(', ')
    : (prof.department?.name || prof.department);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.01 }}
    >
      <Card className="hover:border-zinc-700 transition-all duration-300 group overflow-hidden bg-zinc-950/40 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center p-5 md:p-6 gap-6">
          {/* Avatar/Icon section */}
          <div className="flex items-center justify-between lg:justify-start lg:flex-shrink-0">
            <div className="h-14 w-14 md:h-16 md:w-16 bg-white rounded-2xl flex items-center justify-center text-black shadow-[0_0_30px_rgba(255,255,255,0.1)] group-hover:scale-105 transition-transform duration-500">
              <User size={28} className="md:w-8 md:h-8" />
            </div>
            
            {/* Status Badge moved next to avatar on mobile */}
            <div className="lg:hidden">
              <StatusBadge status={prof.status} />
            </div>
          </div>

          {/* Details section */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col mb-4">
              <div className="flex items-center justify-between lg:justify-start gap-4">
                <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight group-hover:text-zinc-200 transition-colors leading-tight truncate">
                  {prof.name}
                </h3>
                <div className="hidden lg:block">
                  <StatusBadge status={prof.status} />
                </div>
              </div>
              <p className="text-[9px] md:text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] mt-1 md:mt-2">
                {departmentText}
              </p>
              {prof.customStatusMessage ? (
                <p className="text-[10px] text-zinc-300 font-medium mt-2 leading-snug">
                  {prof.customStatusMessage}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-x-8 gap-y-3">
              <div className="flex items-center text-sm text-zinc-400">
                <MapPin className="h-4 w-4 mr-2.5 text-zinc-600 shrink-0" />
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                  Now at <span className="text-white ml-1">{currentLocationLabel}</span>
                </span>
              </div>
              <div className="flex items-center text-sm text-zinc-400">
                <MapPin className="h-4 w-4 mr-2.5 text-zinc-600 shrink-0" />
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                  Office <span className="text-white ml-1">{cabinRoom} (Floor {cabinFloor})</span>
                </span>
              </div>
              <div className="flex items-center text-sm text-zinc-400 min-w-0">
                <Mail className="h-4 w-4 mr-2.5 text-zinc-600 shrink-0" />
                <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider truncate">
                  {prof.email}
                </span>
              </div>
            </div>
          </div>

          {/* Action section */}
          <div className="flex-shrink-0 mt-2 lg:mt-0">
            <Button
              variant="primary"
              disabled={!isLocationAvailable}
              className="w-full lg:w-auto h-12 md:h-14 px-6 md:px-8 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center group/btn shadow-[0_0_20px_rgba(255,255,255,0.05)] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
              onClick={() => {
                if (!isLocationAvailable) return;
                const params = new URLSearchParams();
                params.set('floor', String(normalizedFloor));
                if (normalizedRoom && normalizedRoom.toLowerCase() !== 'undefined') {
                  params.set('highlight', normalizedRoom);
                }
                navigate(`/map?${params.toString()}`);
              }}
            >
              {isLocationAvailable ? 'Locate on Map' : 'Not Available'}
              {isLocationAvailable && <ChevronRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />}
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
