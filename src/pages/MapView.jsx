import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layers, MapPin } from 'lucide-react';
import * as api from '../services/api';
import { useStatus } from '../hooks/useStatus';
import PageSkeleton from '../components/PageSkeleton';
import Campus3D from '../features/map/Campus3D';

const floors = [
  { id: 0, name: 'Ground Floor', code: 'GF' },
  { id: 1, name: 'First Floor', code: '1F' },
  { id: 2, name: 'Second Floor', code: '2F' },
  { id: 3, name: 'Third Floor', code: '3F' },
];

const normalizeRoomId = (room) => {
  const raw = String(room || '').trim();
  if (!raw) return '';
  const digitGroups = raw.match(/\d+/g);
  if (!digitGroups || digitGroups.length === 0) return raw.toUpperCase();
  const threeDigit = digitGroups.find((group) => group.length >= 3);
  if (threeDigit) return threeDigit;
  const canonicalDigits = digitGroups.sort((a, b) => b.length - a.length)[0];
  return canonicalDigits || '';
};

const normalizeStatus = (status) => {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'available') return 'cabin';
  if (value === 'in-class' || value === 'in_class' || value === 'in class') return 'in_classroom';
  return value;
};

const deriveFloorFromRoom = (room) => {
  const normalizedRoom = normalizeRoomId(room);
  if (!normalizedRoom) return null;
  const firstDigit = Number(normalizedRoom[0]);
  return Number.isFinite(firstDigit) && firstDigit >= 0 && firstDigit <= 3 ? firstDigit : null;
};

const normalizeFloorValue = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const resolveFacultyLocation = (prof) => {
  const status = normalizeStatus(prof?.status);
  const room =
    prof?.currentLocationRoomNumber ||
    prof?.classroomNumber ||
    prof?.cabinRoomNumber ||
    prof?.cabinNumber ||
    '';
  const normalizedRoom = normalizeRoomId(room);
  const derivedFloor = deriveFloorFromRoom(normalizedRoom);
  const floor =
    derivedFloor ??
    normalizeFloorValue(prof?.currentLocationFloor) ??
    normalizeFloorValue(prof?.classroomFloor) ??
    normalizeFloorValue(prof?.cabinFloor);
  return { status, room: normalizedRoom, floor };
};

const MapView = () => {
  const { professors } = useStatus();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeFloor, setActiveFloor] = useState(0);
  const [highlightedRoom, setHighlightedRoom] = useState(null);
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  useEffect(() => {
    const floor = parseInt(searchParams.get('floor'));
    const rawHighlight = searchParams.get('highlight');
    const highlight = rawHighlight && rawHighlight !== 'undefined' && rawHighlight !== 'null' ? rawHighlight : null;

    const timeoutId = setTimeout(() => {
      const isAllowedFloor = Number.isFinite(floor) && floors.some((f) => f.id === floor);
      if (isAllowedFloor && floor !== activeFloor) {
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
        setLoadingRooms(true);
        const { data } = await api.getRooms(activeFloor);
        setRooms(data);
      } catch (error) {
        console.error('Failed to fetch rooms', error);
        setRooms([]);
      } finally {
        setLoadingRooms(false);
      }
    };

    fetchRooms();
  }, [activeFloor]);

  const normalizedSelectedRoom = normalizeRoomId(highlightedRoom);
  const normalizedHoveredRoom = normalizeRoomId(hoveredRoom);
  const effectiveRoom = normalizedHoveredRoom || normalizedSelectedRoom;

  const activeFacultyByRoom = useMemo(() => {
    return professors
      .filter((prof) => {
        const { status, room, floor } = resolveFacultyLocation(prof);
        if (status === 'logoff') return false;
        return room && floor === activeFloor;
      })
      .reduce((acc, prof) => {
        const { room } = resolveFacultyLocation(prof);
        if (!acc.has(room)) acc.set(room, []);
        acc.get(room).push(prof);
        return acc;
      }, new Map());
  }, [activeFloor, professors]);

  const cabinFacultyByRoom = useMemo(() => {
    return professors.reduce((acc, prof) => {
      const cabinRoom = normalizeRoomId(prof?.cabinRoomNumber || prof?.cabinNumber || '');
      const cabinFloor = deriveFloorFromRoom(cabinRoom) ?? normalizeFloorValue(prof?.cabinFloor);
      if (!cabinRoom || cabinFloor !== activeFloor) return acc;
      if (!acc.has(cabinRoom)) acc.set(cabinRoom, []);
      acc.get(cabinRoom).push(prof);
      return acc;
    }, new Map());
  }, [activeFloor, professors]);
  const occupiedRooms = useMemo(
    () => new Set([...activeFacultyByRoom.keys(), ...cabinFacultyByRoom.keys()]),
    [activeFacultyByRoom, cabinFacultyByRoom]
  );
  const roomOccupancyType = useMemo(() => {
    const result = {};
    activeFacultyByRoom.forEach((facultyList, room) => {
      const hasClassroom = facultyList.some((prof) => normalizeStatus(prof?.status) === 'in_classroom');
      const hasCabin = facultyList.some((prof) => normalizeStatus(prof?.status) === 'cabin');
      if (hasClassroom) {
        result[room] = 'classroom';
      } else if (hasCabin) {
        result[room] = 'cabin';
      } else {
        result[room] = 'occupied';
      }
    });
    cabinFacultyByRoom.forEach((facultyList, room) => {
      if (!facultyList.length) return;
      if (!result[room]) {
        result[room] = 'cabin';
      }
    });
    return result;
  }, [activeFacultyByRoom, cabinFacultyByRoom]);
  const occupiedFaculty = activeFacultyByRoom.get(effectiveRoom) || [];

  const occupancyRows = useMemo(
    () =>
      Array.from(new Set([...activeFacultyByRoom.keys(), ...cabinFacultyByRoom.keys()]))
        .map((room) => {
          const activeFaculty = activeFacultyByRoom.get(room) || [];
          const cabinFaculty = cabinFacultyByRoom.get(room) || [];
          const mergedNames = Array.from(
            new Set([...activeFaculty.map((p) => p.name), ...cabinFaculty.map((p) => p.name)].filter(Boolean))
          );
          return {
            room,
            names: mergedNames,
            count: mergedNames.length,
            hasLiveOccupancy: activeFaculty.length > 0,
          };
        })
        .sort((a, b) => String(a.room).localeCompare(String(b.room), undefined, { numeric: true, sensitivity: 'base' })),
    [activeFacultyByRoom, cabinFacultyByRoom]
  );

  if (loadingRooms) return <PageSkeleton />;

  return (
    <div className="-m-4 md:-m-10 lg:-m-14 h-[calc(100vh-96px)] md:h-[calc(100vh-160px)] relative">
      <Campus3D
        rooms={rooms}
        highlightedRoom={effectiveRoom || highlightedRoom}
        hoveredRoom={normalizedHoveredRoom}
        occupiedRooms={occupiedRooms}
        roomOccupancyType={roomOccupancyType}
        onRoomHover={setHoveredRoom}
      />

      <div className="absolute inset-x-3 top-3 md:left-4 md:top-4 md:right-auto md:w-[360px] bg-black/78 border border-zinc-800 rounded-2xl p-4 md:p-5 backdrop-blur-md space-y-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase leading-none">
            Campus <span className="text-zinc-600">Map</span>
          </h1>
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest mt-2">Pick a floor to view rooms in 3D</p>
        </div>

        <div className="space-y-2">
          <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">Floor</p>
          <div className="grid grid-cols-4 gap-2">
            {floors.map((floor) => (
              <button
                key={floor.id}
                onClick={() => {
                  setActiveFloor(floor.id);
                  setHighlightedRoom(null);
                  setHoveredRoom(null);
                  setSearchParams({ floor: String(floor.id) });
                }}
                className={`h-10 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                  activeFloor === floor.id ? 'bg-white text-black' : 'bg-black border border-zinc-900 text-zinc-500 hover:text-zinc-200'
                }`}
              >
                {floor.code}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute left-3 right-3 bottom-3 md:left-auto md:right-4 md:bottom-4 md:w-[360px] bg-black/78 border border-zinc-800 rounded-2xl p-4 backdrop-blur-md space-y-3 max-h-[42vh] overflow-y-auto">
        <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-black uppercase tracking-widest">
          <Layers size={14} /> Current Selection
        </div>
        <p className="text-white text-sm font-bold">
          {effectiveRoom
            ? `Room ${effectiveRoom} • ${floors.find((f) => f.id === activeFloor)?.name}`
            : `${floors.find((f) => f.id === activeFloor)?.name} occupancy`}
        </p>
        <div className="pt-1">
          <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-2">
            <MapPin size={14} /> Occupancy
          </div>
          {effectiveRoom && occupiedFaculty.length === 0 ? (
            <p className="text-zinc-500 text-xs">No faculty currently in this room.</p>
          ) : occupancyRows.length === 0 ? (
            <p className="text-zinc-500 text-xs">No rooms occupied on this floor.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-zinc-900">
              <table className="w-full text-xs">
                <thead className="bg-zinc-900/70 text-zinc-400 uppercase tracking-widest text-[10px]">
                  <tr>
                    <th className="text-left px-3 py-2">Room</th>
                    <th className="text-left px-3 py-2">Faculty</th>
                    <th className="text-right px-3 py-2">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {occupancyRows.map((row) => (
                    <tr
                      key={row.room}
                      onMouseEnter={() => setHoveredRoom(row.room)}
                      onMouseLeave={() => setHoveredRoom(null)}
                      className={`border-t border-zinc-900 cursor-pointer ${
                        String(row.room) === effectiveRoom ? 'bg-zinc-800/70' : 'bg-black/20 hover:bg-zinc-900/40'
                      }`}
                    >
                      <td className="px-3 py-2 font-black text-white">{row.room}</td>
                      <td className="px-3 py-2 text-zinc-200">
                        {row.names.join(', ')}
                        {!row.hasLiveOccupancy ? <span className="ml-2 text-[10px] uppercase text-zinc-500">(Office)</span> : null}
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-400 font-bold">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapView;
