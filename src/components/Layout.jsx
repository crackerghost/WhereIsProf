import { useState } from 'react';
import Sidebar from './Sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { RiMenuLine } from 'react-icons/ri';
import { useLocation } from 'react-router-dom';

export const Layout = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-black flex w-full selection:bg-white selection:text-black font-sans overflow-hidden relative">
      <div className="app-grid-bg" />
      <div className="app-ambient-glow left" />
      <div className="app-ambient-glow right" />

      {/* Sidebar View - Responsive system */}
      <Sidebar 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content View */}
      <motion.div
        animate={{ 
          marginLeft: typeof window !== 'undefined' && window.innerWidth < 1024 ? 0 : (isCollapsed ? 116 : 312) 
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="flex-1 flex flex-col min-w-0 relative z-10"
      >
        {/* Top Header */}
        <motion.header
           initial={{ y: -16, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           transition={{ duration: 0.35, ease: 'easeOut' }}
           className="h-24 flex items-center justify-between px-6 md:px-10 bg-black/55 backdrop-blur-xl z-40 border-b border-zinc-900/40"
        >
           <div className="flex items-center space-x-4">
              {/* Mobile Menu Toggle */}
              <button 
                onClick={() => setIsMobileOpen(true)}
                className="lg:hidden p-1 text-white hover:text-zinc-300 transition-colors"
              >
                <RiMenuLine size={20} />
              </button>
              
              <div className="flex items-center space-x-4">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.6)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600 hidden sm:inline">Secure Protocol Active</span>
              </div>
           </div>
           
        
        </motion.header>

        {/* Dynamic Content Area */}
        <main className="flex-1 p-4 md:p-10 lg:p-14 custom-scrollbar overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${location.pathname}${location.search}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Mini Footer */}
        <footer className="h-16 flex items-center px-6 md:px-10 bg-black/55 backdrop-blur-xl justify-between border-t border-zinc-900/40">
           <span className="text-[8px] font-black text-zinc-800 uppercase tracking-[0.5em] truncate mr-4">WhereIsProf v2.0.4 - Intelligence Layer</span>
           <div className="flex items-center space-x-6 shrink-0">
              <span className="text-[8px] font-bold text-zinc-800 uppercase tracking-widest cursor-pointer hover:text-zinc-500 transition-colors">Docs</span>
              <span className="text-[8px] font-bold text-zinc-800 uppercase tracking-widest cursor-pointer hover:text-zinc-500 transition-colors">Support</span>
           </div>
        </footer>
      </motion.div>
    </div>
  );
};
