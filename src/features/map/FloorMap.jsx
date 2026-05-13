const FloorMap = ({ highlightedRoom, rooms = [] }) => {
  const roomNumbers = Array.from(
    new Set(
      rooms
        .map((room) => room.roomNumber)
        .filter(Boolean)
        .map((room) => String(room).trim())
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  const normalizedHighlightedRoom = highlightedRoom ? String(highlightedRoom).trim() : null;
  const columns = Math.max(1, Math.ceil(roomNumbers.length / 2));
  const boxWidth = 620 / columns;
  const roomWidth = Math.min(120, Math.max(42, boxWidth - 10));
  const xOffset = (boxWidth - roomWidth) / 2;

  return (
    <div className="relative w-full aspect-[16/9] bg-black rounded-xl border border-zinc-900 overflow-hidden">
      <svg
        viewBox="0 0 800 450"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Hallway */}
        <rect x="50" y="200" width="700" height="50" fill="#09090b" stroke="#18181b" strokeWidth="1" />
        
        {/* Rooms Top */}
        {roomNumbers.slice(0, Math.ceil(roomNumbers.length / 2)).map((room, idx) => {
          const isHighlighted = room === normalizedHighlightedRoom;
          const x = 90 + idx * boxWidth + xOffset;
          return (
            <g key={room} className="cursor-pointer group">
              <rect
                x={x}
                y="50"
                width={roomWidth}
                height="150"
                fill={isHighlighted ? '#ffffff' : '#000000'}
                stroke={isHighlighted ? '#ffffff' : '#18181b'}
                strokeWidth={isHighlighted ? '2' : '1'}
                className="transition-all duration-300"
              />
              <text
                x={x + roomWidth / 2}
                y="130"
                textAnchor="middle"
                className={`text-[10px] font-black tracking-tighter pointer-events-none uppercase ${
                  isHighlighted ? 'fill-black' : 'fill-zinc-700 group-hover:fill-zinc-400'
                }`}
              >
                {room || 'TBD'}
              </text>
            </g>
          );
        })}

        {/* Rooms Bottom */}
        {roomNumbers.slice(Math.ceil(roomNumbers.length / 2)).map((room, idx) => {
          const isHighlighted = room === normalizedHighlightedRoom;
          const x = 90 + idx * boxWidth + xOffset;
          return (
            <g key={room} className="cursor-pointer group">
              <rect
                x={x}
                y="250"
                width={roomWidth}
                height="150"
                fill={isHighlighted ? '#ffffff' : '#000000'}
                stroke={isHighlighted ? '#ffffff' : '#18181b'}
                strokeWidth={isHighlighted ? '2' : '1'}
                className="transition-all duration-300"
              />
              <text
                x={x + roomWidth / 2}
                y="330"
                textAnchor="middle"
                className={`text-[10px] font-black tracking-tighter pointer-events-none uppercase ${
                  isHighlighted ? 'fill-black' : 'fill-zinc-700 group-hover:fill-zinc-400'
                }`}
              >
                {room || 'TBD'}
              </text>
            </g>
          );
        })}

        <text x="400" y="232" textAnchor="middle" className="fill-zinc-800 text-[10px] font-bold uppercase tracking-[0.4em]">
          Central Corridor
        </text>
      </svg>

      {normalizedHighlightedRoom && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-2 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)] text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
          Target Locked: {normalizedHighlightedRoom}
        </div>
      )}
    </div>
  );
};

export default FloorMap;
