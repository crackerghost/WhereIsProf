import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RiArrowRightLine, RiShieldUserFill, RiMapPin2Line, RiQrScan2Line } from 'react-icons/ri';

const Landing = () => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      <div className="auth-grid-bg opacity-60" />
      <div className="auth-grid-line-h" />
      <div className="auth-grid-line-v" />

      <div className="app-ambient-glow left" />
      <div className="app-ambient-glow right" />

      <div className="relative z-10 min-h-screen flex flex-col">
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

        <main className="flex-1 px-6 md:px-10 py-10 md:py-16">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="space-y-6"
            >
              <div className="inline-flex items-center h-8 px-3 rounded-full border border-zinc-800 bg-zinc-950/60 text-zinc-400 text-[10px] uppercase tracking-[0.25em] font-black">
                Campus Intelligence Platform
              </div>
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight leading-[0.95]">
                <span className="text-white">Locate Faculty.</span>
                <br />
                <span className="not-italic text-zinc-500">Track </span>
                <span className="italic font-extrabold text-white">Sessions.</span>
                <br />
                <span className="not-italic text-zinc-500">Verify </span>
                <span className="italic font-extrabold text-white">Attendance.</span>
              </h1>
              <p className="text-zinc-400 text-sm md:text-base max-w-xl leading-relaxed">
                A modern real-time system for live faculty status, room discovery, class updates, and secure QR attendance workflows.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link to="/login" className="h-12 px-6 rounded-xl bg-white text-black hover:bg-zinc-200 text-[11px] uppercase font-black tracking-[0.2em] flex items-center justify-center">
                  Open Platform <RiArrowRightLine className="ml-2" />
                </Link>
                <Link to="/register" className="h-12 px-6 rounded-xl border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 text-[11px] uppercase font-black tracking-[0.2em] flex items-center justify-center">
                  Create Account
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut', delay: 0.1 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {[
                { icon: RiMapPin2Line, title: 'Live Locator', desc: 'Find current room and floor quickly.' },
                { icon: RiShieldUserFill, title: 'Faculty Console', desc: 'Broadcast updates and manage schedule.' },
                { icon: RiQrScan2Line, title: 'QR Attendance', desc: 'Rotating secure code every 10 seconds.' },
                { icon: RiArrowRightLine, title: 'Realtime Updates', desc: 'Socket events across roles instantly.' },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, delay: 0.15 + i * 0.06 }}
                  className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950/60 backdrop-blur-md"
                >
                  <div className="h-10 w-10 rounded-xl bg-white text-black flex items-center justify-center mb-4">
                    <item.icon size={18} />
                  </div>
                  <h3 className="text-white font-black text-sm uppercase tracking-tight">{item.title}</h3>
                  <p className="text-zinc-500 text-xs mt-2 leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Landing;
