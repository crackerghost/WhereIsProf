import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const roomSort = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
const normalizeRoomId = (room) => {
  const raw = String(room || '').trim();
  if (!raw) return '';
  const digitGroups = raw.match(/\d+/g);
  if (!digitGroups || digitGroups.length === 0) return raw.toUpperCase();
  return digitGroups[digitGroups.length - 1];
};

const toColor = ({ selected, occupied, roomState }) => {
  if (selected) return new THREE.Color('#f8fafc');
  if (occupied && roomState === 'classroom') return new THREE.Color('#eab308');
  if (occupied && roomState === 'cabin') return new THREE.Color('#22c55e');
  if (occupied) return new THREE.Color('#38bdf8');
  return new THREE.Color('#27272a');
};

const RoomBlock = ({ position, roomNumber, selected, occupied, roomState, isHovered, onHover }) => {
  const meshRef = useRef(null);
  const matRef = useRef(null);

  useFrame((state, delta) => {
    if (!meshRef.current || !matRef.current) return;

    const targetY = selected ? 1.05 : occupied ? 0.82 : 0.62;
    meshRef.current.position.y = THREE.MathUtils.damp(meshRef.current.position.y, targetY, 7, delta);

    const targetScale = selected ? 1.1 : 1;
    meshRef.current.scale.x = THREE.MathUtils.damp(meshRef.current.scale.x, targetScale, 8, delta);
    meshRef.current.scale.z = THREE.MathUtils.damp(meshRef.current.scale.z, targetScale, 8, delta);

    const targetColor = toColor({ selected, occupied, roomState });
    matRef.current.color.lerp(targetColor, Math.min(1, delta * 8));

    const pulse = occupied ? 0.2 + Math.sin(state.clock.elapsedTime * 3.2) * 0.12 : 0;
    matRef.current.emissiveIntensity = THREE.MathUtils.damp(
      matRef.current.emissiveIntensity,
      selected ? 0.22 : pulse,
      7,
      delta
    );
  });

  return (
    <group
      position={position}
      onPointerOver={() => onHover?.(roomNumber)}
      onPointerOut={() => onHover?.(null)}
    >
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[1.12, 1.05, 1.12]} />
        <meshStandardMaterial
          ref={matRef}
          color={selected ? '#f8fafc' : occupied && roomState === 'classroom' ? '#eab308' : occupied && roomState === 'cabin' ? '#22c55e' : occupied ? '#38bdf8' : '#27272a'}
          emissive={occupied && roomState === 'classroom' ? '#78350f' : occupied && roomState === 'cabin' ? '#14532d' : occupied ? '#0c4a6e' : '#000000'}
          emissiveIntensity={occupied ? 0.15 : 0}
          roughness={0.38}
          metalness={0.18}
        />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <ringGeometry args={[0.52, 0.6, 40]} />
        <meshBasicMaterial
          color={
            selected
              ? '#ffffff'
              : occupied && roomState === 'classroom'
                ? '#eab308'
                : occupied && roomState === 'cabin'
                  ? '#22c55e'
                  : occupied
                    ? '#38bdf8'
                    : '#3f3f46'
          }
          transparent
          opacity={0.85}
        />
      </mesh>
      <Text
        position={[0, 1.65, 0]}
        fontSize={0.28}
        color={selected ? '#ffffff' : '#a1a1aa'}
        anchorX="center"
        anchorY="middle"
      >
        {String(roomNumber)}
      </Text>
      {isHovered && roomState === 'classroom' ? (
        <Text
          position={[0, 1.98, 0]}
          fontSize={0.16}
          color="#facc15"
          anchorX="center"
          anchorY="middle"
        >
          (CLASS)
        </Text>
      ) : null}
    </group>
  );
};

const Campus3D = ({ rooms = [], highlightedRoom, hoveredRoom, occupiedRooms = new Set(), roomOccupancyType = {}, onRoomHover }) => {
  const normalizedHighlightedRoom = normalizeRoomId(highlightedRoom);

  const roomNumbers = useMemo(() => {
    const fromRooms = rooms.map((room) => normalizeRoomId(room.roomNumber)).filter(Boolean);
    const fromOccupied = Array.from(occupiedRooms).map((room) => normalizeRoomId(room)).filter(Boolean);
    const merged = new Set([...fromRooms, ...fromOccupied]);
    if (normalizedHighlightedRoom) merged.add(normalizedHighlightedRoom);
    return Array.from(merged).sort(roomSort);
  }, [rooms, occupiedRooms, normalizedHighlightedRoom]);

  const blocks = useMemo(() => {
    const total = roomNumbers.length;
    if (!total) return [];

    const leftWingCount = Math.ceil(total / 2);
    const leftWing = roomNumbers.slice(0, leftWingCount);
    const rightWing = roomNumbers.slice(leftWingCount);
    const rowGap = 1.75;
    const corridorHalfWidth = 2.4;
    const maxRows = Math.max(leftWing.length, rightWing.length);

    const makeSide = (list, x) =>
      list.map((room, idx) => {
        const z = (idx - (maxRows - 1) / 2) * rowGap;
        return { room, position: [x, 0, z] };
      });

    return [...makeSide(leftWing, -corridorHalfWidth), ...makeSide(rightWing, corridorHalfWidth)];
  }, [roomNumbers]);

  const corridorLength = useMemo(() => {
    const total = roomNumbers.length;
    const maxRows = Math.max(Math.ceil(total / 2), Math.floor(total / 2));
    return Math.max(6, maxRows * 1.75 + 2);
  }, [roomNumbers]);

  return (
    <div className="w-full h-full min-h-[420px] rounded-[2rem] border border-zinc-900 bg-black overflow-hidden relative">
      <Canvas camera={{ position: [0, 11.5, 15], fov: 48 }} shadows>
        <color attach="background" args={['#030303']} />
        <fog attach="fog" args={['#030303', 12, 30]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[8, 14, 8]} intensity={1.2} castShadow />
        <pointLight position={[-8, 6, -4]} intensity={0.35} color="#60a5fa" />

        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
          <planeGeometry args={[90, 90]} />
          <meshStandardMaterial color="#09090b" roughness={1} />
        </mesh>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[2.9, corridorLength]} />
          <meshStandardMaterial color="#111827" roughness={0.9} metalness={0.05} />
        </mesh>

        {blocks.map((block) => (
          <RoomBlock
            key={block.room}
            position={block.position}
            roomNumber={block.room}
            selected={block.room === normalizedHighlightedRoom}
            occupied={occupiedRooms.has(block.room)}
            roomState={roomOccupancyType[block.room] || 'occupied'}
            isHovered={normalizeRoomId(hoveredRoom) === block.room}
            onHover={onRoomHover}
          />
        ))}

        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={8}
          maxDistance={22}
          minPolarAngle={0.45}
          maxPolarAngle={1.35}
          autoRotate
          autoRotateSpeed={0.35}
          dampingFactor={0.08}
          enableDamping
        />
      </Canvas>

      <div className="absolute top-4 left-4 px-3 py-2 rounded-xl bg-black/75 border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-300 flex items-center gap-3">
        <span>Campus Floor</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Office</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" />Classroom</span>
      </div>
      {hoveredRoom ? (
        <div className="absolute top-4 right-4 px-3 py-2 rounded-xl bg-black/80 border border-zinc-700 text-xs font-black uppercase tracking-wider text-white">
          {`Room ${hoveredRoom}${roomOccupancyType[normalizeRoomId(hoveredRoom)] === 'classroom' ? ' (CLASS)' : ''}`}
        </div>
      ) : null}
    </div>
  );
};

export default Campus3D;
