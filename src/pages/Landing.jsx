import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useEffect, useRef } from 'react';
import {
  RiArrowRightLine,
  RiShieldUserFill,
  RiCalendarCheckLine,
  RiTeamLine,
  RiPulseLine,
} from 'react-icons/ri';

const Landing = () => {
  const roadmapRef = useRef(null);
  const heroRef = useRef(null);
  const modelRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: roadmapRef,
    offset: ['start 85%', 'end 20%'],
  });
  const roadmapPathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

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

          <section ref={roadmapRef} className="max-w-6xl mx-auto mt-10 md:mt-14">
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
              <div className="relative h-[980px] md:h-[1180px] z-30">
                <svg
                  viewBox="0 0 1000 1600"
                  className="absolute inset-0 h-full w-full"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M 500 70 C 210 70, 210 360, 500 360 C 790 360, 790 660, 500 660 C 210 660, 210 960, 500 960 C 790 960, 790 1260, 500 1260 C 210 1260, 210 1530, 500 1530"
                    fill="none"
                    stroke="#0a0a0a"
                    strokeWidth="108"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 500 70 C 210 70, 210 360, 500 360 C 790 360, 790 660, 500 660 C 210 660, 210 960, 500 960 C 790 960, 790 1260, 500 1260 C 210 1260, 210 1530, 500 1530"
                    fill="none"
                    stroke="#27272a"
                    strokeWidth="96"
                    strokeLinecap="round"
                  />
                  <motion.path
                    d="M 500 70 C 210 70, 210 360, 500 360 C 790 360, 790 660, 500 660 C 210 660, 210 960, 500 960 C 790 960, 790 1260, 500 1260 C 210 1260, 210 1530, 500 1530"
                    fill="none"
                    stroke="#d4d4d8"
                    strokeWidth="4"
                    strokeDasharray="14 10"
                    strokeLinecap="round"
                    style={{ pathLength: roadmapPathLength }}
                  />
                </svg>

                {[
                  { x: '50%', y: '6%', align: 'center' },
                  { x: '50%', y: '24%', align: 'right' },
                  { x: '50%', y: '42%', align: 'left' },
                  { x: '50%', y: '60%', align: 'right' },
                  { x: '50%', y: '78%', align: 'left' },
                ].map((pos, idx) => (
                  <motion.div
                    key={roadmap[idx].title}
                    initial={{ opacity: 0, y: 24, scale: 0.96 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: false, amount: 0.35 }}
                    transition={{ duration: 0.45, delay: idx * 0.06 }}
                    className="absolute z-40"
                    style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)' }}
                  >
                    <div className="relative h-14 w-14 rounded-full bg-white text-black flex items-center justify-center text-sm font-black shadow-[0_0_35px_rgba(255,255,255,0.28)]">
                      <div className="absolute inset-0 rounded-full border-2 border-indigo-400/80" />
                      <div className="absolute inset-[6px] rounded-full border border-indigo-300/50" />
                      <span className="relative z-10">{idx + 1}</span>
                    </div>
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 w-[200px] md:w-[260px] rounded-2xl bg-black/65 backdrop-blur-md shadow-[0_14px_40px_rgba(0,0,0,0.45)] p-4 ${
                        pos.align === 'left'
                          ? 'right-[62px] text-right'
                          : pos.align === 'right'
                            ? 'left-[62px] text-left'
                            : 'left-1/2 -translate-x-1/2 mt-[70px] text-center'
                      }`}
                    >
                      <p className="text-white text-xs md:text-sm font-black uppercase tracking-tight">{roadmap[idx].title}</p>
                      <p className="text-zinc-400 text-[11px] mt-1.5 leading-relaxed">{roadmap[idx].detail}</p>
                    </div>
                  </motion.div>
                ))}
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
