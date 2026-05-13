import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import {
  RiArrowRightLine,
  RiShieldUserFill,
  RiCalendarCheckLine,
  RiTeamLine,
  RiPulseLine,
} from 'react-icons/ri';

const Landing = () => {
  const heroRef = useRef(null);
  const modelRef = useRef(null);
  const roadmapGridRef = useRef(null);
  const [gridMeta, setGridMeta] = useState({ cols: 28, rows: 18 });

  const handleHeroMouseMove = (event) => {
    if (!heroRef.current || !modelRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const normalizedX = (event.clientX - rect.left) / rect.width;
    const normalizedY = (event.clientY - rect.top) / rect.height;
    const azimuth = 20 + normalizedX * 40;
    const polar = 62 + (0.5 - normalizedY) * 18;
    modelRef.current.cameraOrbit = `${azimuth.toFixed(1)}deg ${polar.toFixed(1)}deg auto`;
  };

  useEffect(() => {
    if (typeof window === 'undefined' || customElements.get('model-viewer')) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const roadmap = [
    { title: 'Identity & Access', detail: 'Role-based login, protected routes, and session control.' },
    { title: 'Faculty Presence', detail: 'Status updates, cabin mapping, and timetable-based classroom override.' },
    { title: 'Realtime Transport', detail: 'Socket channels deliver live room and attendance updates.' },
    { title: 'QR Attendance', detail: 'Faculty starts day session; student scans valid rotating QR token.' },
    { title: 'Analytics Layer', detail: 'Present, absent, and subject-wise attendance percentage tracking.' },
  ];
  useEffect(() => {
    if (!roadmapGridRef.current || typeof ResizeObserver === 'undefined') return;
    const cellSize = 34;
    const update = () => {
      const rect = roadmapGridRef.current.getBoundingClientRect();
      const cols = Math.max(1, Math.ceil(rect.width / cellSize));
      const rows = Math.max(1, Math.ceil(rect.height / cellSize));
      setGridMeta({ cols, rows });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(roadmapGridRef.current);
    return () => observer.disconnect();
  }, []);

  const gridColumns = gridMeta.cols;
  const animatedGridCells = Array.from({ length: gridMeta.cols * gridMeta.rows }, (_, i) => i).filter((cell) => {
    const row = Math.floor(cell / gridMeta.cols);
    return row < 2 || row >= gridMeta.rows - 2;
  });

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      <div className="auth-grid-bg opacity-60" />
      <div className="auth-grid-line-h" />
      <div className="auth-grid-line-v" />

      <div className="app-ambient-glow left" />
      <div className="app-ambient-glow right" />

      <div className="relative min-h-screen flex flex-col z-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          className="hidden lg:block fixed inset-0 w-full h-full pointer-events-none -z-10 opacity-75"
        >
          <model-viewer
            ref={modelRef}
            src="/models/laptop.glb"
            auto-rotate
            autoplay
            camera-orbit="35deg 72deg auto"
            shadow-intensity="1"
            exposure="1"
            environment-image="neutral"
            style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
          />
        </motion.div>

        <header className="h-20 px-4 md:px-10 flex items-center justify-between border-b border-zinc-900/40 bg-black/45 backdrop-blur-xl gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-white text-black flex items-center justify-center shrink-0">
              <RiShieldUserFill size={20} />
            </div>
            <span className="text-white font-black tracking-tight text-sm md:text-lg uppercase truncate">WhereIsProf</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/login" className="h-9 md:h-10 px-3 md:px-4 rounded-xl border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 text-[10px] md:text-xs uppercase font-black tracking-wider md:tracking-widest flex items-center">
              Login
            </Link>
            <Link to="/register" className="h-9 md:h-10 px-3 md:px-4 rounded-xl bg-white text-black hover:bg-zinc-200 text-[10px] md:text-xs uppercase font-black tracking-wider md:tracking-widest flex items-center">
              Register
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-8 lg:px-10 py-8 md:py-14">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: 0.08 }}
            className="lg:hidden relative w-full h-[240px] sm:h-[300px] mb-4"
          >
            <model-viewer
              src="/models/laptop.glb"
              auto-rotate
              autoplay
              camera-orbit="35deg 72deg auto"
              shadow-intensity="1"
              exposure="1"
              environment-image="neutral"
              style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
            />
          </motion.div>

          <div
            ref={heroRef}
            onMouseMove={handleHeroMouseMove}
            className="max-w-6xl mx-auto relative"
          >
            <div className="relative z-30 grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="space-y-5 lg:col-span-8 lg:max-w-4xl"
            >
              <div className="inline-flex items-center h-8 px-3 rounded-full border border-zinc-800 bg-zinc-950/60 text-zinc-400 text-[10px] uppercase tracking-[0.25em] font-black">
                Campus Intelligence Platform
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight leading-[0.95]">
                <span className="text-white">Locate Faculty.</span>
                <br />
                <span className="not-italic text-zinc-500">Track </span>
                <span className="italic font-extrabold text-white">Sessions.</span>
                <br />
                <span className="not-italic text-zinc-500">Verify </span>
                <span className="italic font-extrabold text-white">Attendance.</span>
              </h1>
              <p className="text-zinc-400 text-sm md:text-base max-w-2xl leading-relaxed">
                Production-ready campus workflow platform for real-time faculty presence, mapped navigation, and QR-based class attendance.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link to="/login" className="h-12 px-6 min-w-[180px] rounded-xl bg-white text-black hover:bg-zinc-200 text-[11px] uppercase font-black tracking-[0.2em] flex items-center justify-center">
                  Open Platform <RiArrowRightLine className="ml-2" />
                </Link>
                <Link to="/register" className="h-12 px-6 min-w-[180px] rounded-xl border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 text-[11px] uppercase font-black tracking-[0.2em] flex items-center justify-center">
                  Create Account
                </Link>
              </div>
            </motion.div>

            <div className="hidden lg:block lg:col-span-4" />
            </div>
          </div>

          <section className="max-w-6xl mx-auto mt-10 md:mt-14">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { icon: RiPulseLine, label: 'Realtime Stream', value: 'Live Socket Status' },
                { icon: RiCalendarCheckLine, label: 'Smart Timetable', value: 'Auto Classroom Mapping' },
                { icon: RiTeamLine, label: 'Role Engine', value: 'Faculty / Student Access' },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-2xl border border-zinc-900 bg-zinc-950/55 p-5">
                  <div className="h-10 w-10 rounded-xl bg-white text-black flex items-center justify-center mb-3">
                    <kpi.icon size={18} />
                  </div>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-[0.2em] font-black">{kpi.label}</p>
                  <p className="text-white text-base md:text-lg font-black mt-2 uppercase tracking-tight">{kpi.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10 md:mt-14">
            <div className="max-w-6xl mx-auto mb-6">
              <h2 className="text-white text-2xl md:text-3xl font-black uppercase tracking-tight">Product Roadmap</h2>
              <p className="text-zinc-500 text-xs md:text-sm uppercase tracking-widest mt-2">Current app flow from access to analytics</p>
            </div>

            <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 rounded-none bg-white/[0.04] backdrop-blur-sm shadow-[0_24px_90px_rgba(0,0,0,0.5)] p-4 md:p-8 overflow-hidden z-30">
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06),transparent_20%,transparent_80%,rgba(255,255,255,0.05))] pointer-events-none" />
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:34px_34px] pointer-events-none opacity-35" />
              <div
                ref={roadmapGridRef}
                className="absolute inset-0 pointer-events-none grid auto-rows-[34px] opacity-35"
                style={{ gridTemplateColumns: `repeat(${gridMeta.cols}, minmax(0, 1fr))` }}
              >
                {animatedGridCells.map((cell) => (
                  <motion.span
                    key={cell}
                    className="border-r border-b border-white/0"
                    animate={{
                      backgroundColor: ['rgba(255,255,255,0)', 'rgba(255,255,255,1)', 'rgba(255,255,255,0)'],
                    }}
                    transition={{
                      duration: 0.5,
                      delay: (() => {
                        const row = Math.floor(cell / gridColumns);
                        const col = cell % gridColumns;
                        const serpentineCol = row % 2 === 0 ? col : (gridColumns - 1 - col);
                        return row * 0.18 + serpentineCol * 0.04;
                      })(),
                      repeat: Infinity,
                      repeatDelay: 0.8,
                      ease: 'linear',
                    }}
                  />
                ))}
              </div>
              <div className="relative z-30 w-full py-12 md:py-20">
                <div className="relative max-w-6xl mx-auto space-y-6 md:space-y-10">
                  {roadmap.map((step, idx) => (
                    <motion.div
                      key={step.title}
                      initial={{ opacity: 0, y: 26 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: false, amount: 0.35 }}
                      transition={{ duration: 0.45, delay: idx * 0.08 }}
                      className={`relative ${
                        idx % 2 === 0 ? 'md:pr-40' : 'md:pl-40'
                      }`}
                    >
                      <div
                        className="relative rounded-[26px] border border-white/70 bg-white/[0.08] backdrop-blur-xl shadow-[0_22px_60px_rgba(0,0,0,0.5)] px-6 py-5 md:px-9 md:py-8 min-h-[120px] md:min-h-[150px] overflow-hidden"
                        style={{ width: `${Math.min(62 + idx * 9, 96)}%` }}
                      >
                        <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.05)_28%,rgba(0,0,0,0.22)_100%)] pointer-events-none" />
                        <div className="absolute top-0 left-0 w-full h-px bg-white/60 pointer-events-none" />
                        <p className="text-white text-base md:text-2xl font-black uppercase tracking-tight leading-tight">
                          {step.title}
                        </p>
                        <p className="text-zinc-400 text-sm md:text-lg mt-3 leading-relaxed">
                          {step.detail}
                        </p>
                      </div>

                      <div className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 flex-col items-center">
                        <div className="h-24 w-px bg-zinc-700/70 mb-3" />
                        <div className="h-16 w-16 rotate-45 rounded-2xl bg-white text-black shadow-[0_14px_32px_rgba(255,255,255,0.3)] flex items-center justify-center">
                          <span className="-rotate-45 text-2xl font-black">{idx + 1}</span>
                        </div>
                        {idx < roadmap.length - 1 && (
                          <>
                            <div className="h-10 w-px bg-zinc-700/70 mt-3" />
                            <span className="block w-3.5 h-3.5 border-r-2 border-b-2 border-zinc-400 rotate-45 -mt-[2px]" />
                          </>
                        )}
                      </div>

                      <div className="md:hidden mt-4 flex items-center gap-3">
                        <div className="h-10 w-10 rotate-45 rounded-xl bg-white text-black flex items-center justify-center">
                          <span className="-rotate-45 text-sm font-black">{idx + 1}</span>
                        </div>
                        {idx < roadmap.length - 1 && (
                          <div className="flex items-center gap-1 text-zinc-400">
                            <span className="block w-8 h-px bg-zinc-600" />
                            <span className="block w-2.5 h-2.5 border-r-2 border-b-2 border-zinc-400 rotate-[-45deg]" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="relative z-10 border-t border-zinc-900/60 bg-black/65 backdrop-blur-xl">
          <div className="max-w-6xl mx-auto px-4 md:px-8 lg:px-10 py-8 md:py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-white text-black flex items-center justify-center">
                  <RiShieldUserFill size={16} />
                </div>
                <p className="text-white font-black uppercase tracking-tight">WhereIsProf</p>
              </div>
              <p className="text-zinc-500 text-xs mt-3 leading-relaxed">
                Realtime academic presence and attendance operations platform.
              </p>
            </div>

            <div>
              <p className="text-zinc-300 text-[11px] font-black uppercase tracking-[0.2em] mb-3">Platform</p>
              <div className="space-y-2 text-zinc-500 text-xs">
                <p>Faculty Locator</p>
                <p>Campus Navigator</p>
                <p>QR Attendance</p>
                <p>Class Broadcasts</p>
              </div>
            </div>

            <div>
              <p className="text-zinc-300 text-[11px] font-black uppercase tracking-[0.2em] mb-3">Flows</p>
              <div className="space-y-2 text-zinc-500 text-xs">
                <p>Student Scan Journey</p>
                <p>Faculty Status Updates</p>
                <p>Timetable Sync</p>
                <p>Attendance Summary</p>
              </div>
            </div>

            <div>
              <p className="text-zinc-300 text-[11px] font-black uppercase tracking-[0.2em] mb-3">Access</p>
              <div className="space-y-3">
                <Link to="/login" className="h-10 w-[140px] rounded-xl border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 text-[10px] uppercase font-black tracking-[0.2em] inline-flex items-center justify-center">
                  Login
                </Link>
                <br />
                <Link to="/register" className="h-10 w-[140px] rounded-xl bg-white text-black hover:bg-zinc-200 text-[10px] uppercase font-black tracking-[0.2em] inline-flex items-center justify-center">
                  Register
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
