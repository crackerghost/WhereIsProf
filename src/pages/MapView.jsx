import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import FloorMap from '../features/map/FloorMap';
import { Layers } from 'lucide-react';
import * as api from '../services/api';
import { useStatus } from '../hooks/useStatus';

const MapView = () => {
  const { professors } = useStatus();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeFloor, setActiveFloor] = useState(1);
  const [highlightedRoom, setHighlightedRoom] = useState(null);
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    const floor = parseInt(searchParams.get('floor'));
    const rawHighlight = searchParams.get('highlight');
    const highlight =
      rawHighlight && rawHighlight !== 'undefined' && rawHighlight !== 'null'
        ? rawHighlight
        : null;

    const timeoutId = setTimeout(() => {
      if (floor && !isNaN(floor) && floor !== activeFloor) {
        setActiveFloor(floor);
      }
      if (highlight && highlight !== highlightedRoom) {
        setHighlightedRoom(highlight);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [searchParams, activeFloor, highlightedRoom]);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const { data } = await api.getRooms(activeFloor);
        setRooms(data);
      } catch (error) {
        console.error('Failed to fetch rooms', error);
        setRooms([]);
      }
    };

    fetchRooms();
  }, [activeFloor]);

  const floors = [
    { id: 1, name: 'Ground Floor', code: 'GF' },
    { id: 2, name: 'First Floor', code: '1F' },
    { id: 3, name: 'Second Floor', code: '2F' },
    { id: 4, name: 'Third Floor', code: '3F' },
  ];

  const normalizedSelectedRoom = highlightedRoom ? String(highlightedRoom).trim() : '';
  const occupiedFaculty = professors.filter((prof) => {
    if (prof.status !== 'in_classroom') return false;
    const profRoom = prof.classroomNumber ? String(prof.classroomNumber).trim() : '';
    const profFloor = Number.isFinite(Number(prof.classroomFloor)) ? Number(prof.classroomFloor) : null;
    return profRoom && normalizedSelectedRoom && profRoom === normalizedSelectedRoom && profFloor === activeFloor;
  });

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase leading-none">
            Campus <br className="hidden sm:block"/><span className="text-zinc-600">Navigator</span>
          </h1>
          <p className="text-zinc-500 font-medium text-xs md:text-sm uppercase tracking-widest leading-relaxed">Precision floor plan tracking system.</p>
        </div>

        <div className="flex bg-zinc-950 p-1.5 rounded-xl border border-zinc-900 shadow-xl overflow-x-auto no-scrollbar max-w-full">
          <div className="flex min-w-max">
            {floors.map((floor) => (
              <button
                key={floor.id}
                onClick={() => {
                  setActiveFloor(floor.id);
                  setHighlightedRoom(null);
                  setSearchParams({});
                }}
                className={`px-4 md:px-6 py-2 md:py-2.5 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all duration-300 ${
                  activeFloor === floor.id
                    ? 'bg-white text-black shadow-lg shadow-white/5'
                    : 'text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900'
                }`}
              >
                {floor.code}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-zinc-950 p-4 md:p-10 rounded-[2rem] border border-zinc-900 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent"></div>
        
        <div className="flex items-center mb-8 md:mb-10">
          <div className="bg-black p-2 md:p-2.5 rounded-xl mr-3 md:mr-4 border border-zinc-900 shadow-inner">
             <Layers className="h-4 w-4 md:h-5 md:w-5 text-white" />
          </div>
          <div>
            <span className="text-zinc-700 text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] block mb-0.5">Telemetry View</span>
            <span className="text-white font-black uppercase tracking-[0.1em] text-[10px] md:text-xs">{floors.find(f => f.id === activeFloor)?.name}</span>
          </div>
        </div>
        
        <div className="relative z-10 border border-zinc-900/50 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
           <FloorMap
             highlightedRoom={highlightedRoom}
             rooms={rooms}
             onRoomSelect={(room) => {
               const roomValue = String(room).trim();
               setHighlightedRoom(roomValue);
               setSearchParams((prev) => {
                 const next = new URLSearchParams(prev);
                 next.set('floor', String(activeFloor));
                 next.set('highlight', roomValue);
                 return next;
               });
             }}
           />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-black border border-zinc-900 p-6 md:p-8 rounded-[2rem] shadow-xl">
          <h3 className="text-zinc-500 font-black uppercase tracking-[0.3em] text-[9px] md:text-[10px] mb-6">Navigation Parameters</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-900 transition-colors hover:border-zinc-800">
               <span className="text-zinc-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest">Active Target</span>
               <div className="flex items-center">
                  <div className="w-3 h-3 bg-white rounded-sm mr-3 shadow-[0_0_15px_rgba(255,255,255,0.4)]"></div>
                  <span className="text-[9px] md:text-[10px] text-white font-black uppercase tracking-tighter">Selected Room</span>
               </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-900 transition-colors hover:border-zinc-800">
               <span className="text-zinc-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest">Base Layer</span>
               <div className="flex items-center">
                  <div className="w-3 h-3 bg-zinc-800 rounded-sm mr-3 border border-zinc-700"></div>
                  <span className="text-[9px] md:text-[10px] text-zinc-600 font-black uppercase tracking-tighter">Standard Node</span>
               </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-[0_20px_40px_rgba(255,255,255,0.05)] min-h-[200px]">
          <h3 className="text-black font-black uppercase tracking-tighter text-2xl md:text-3xl mb-3 leading-none">
            Classroom <br /> Occupancy
          </h3>
          <p className="text-zinc-500 text-[10px] md:text-xs font-bold uppercase tracking-wide mb-6 md:mb-8 leading-relaxed">
            {normalizedSelectedRoom
              ? `Room ${normalizedSelectedRoom} • ${floors.find((f) => f.id === activeFloor)?.name}`
              : 'Select a classroom block to see current presence.'}
          </p>
          {!normalizedSelectedRoom ? (
            <div className="bg-zinc-100 text-zinc-500 px-4 py-3 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wider">
              No Classroom Selected
            </div>
          ) : occupiedFaculty.length === 0 ? (
            <div className="bg-zinc-100 text-zinc-700 px-4 py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider">
              Empty
            </div>
          ) : (
            <div className="space-y-3">
              {occupiedFaculty.map((prof) => (
                <div
                  key={prof._id}
                  className="bg-zinc-100 text-black px-4 py-3 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider"
                >
                  {prof.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapView;
