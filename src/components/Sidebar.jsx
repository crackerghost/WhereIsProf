import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RiDashboardFill, 
  RiMapPin2Fill, 
  RiUserSettingsFill, 
  RiLogoutBoxRLine,
  RiMenuUnfoldFill,
  RiMenuFoldFill,
  RiShieldUserFill,
  RiLoginBoxLine,
  RiCalendarEventFill,
  RiArrowDownSLine,
  RiUserFollowFill,
  RiTimeLine,
  RiNotification4Fill,
  RiCloseLine,
  RiBroadcastFill
} from 'react-icons/ri';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { useState, useEffect } from 'react';

const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedMenus, setExpandedMenus] = useState(['Classroom']);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname, setIsMobileOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMenu = (name) => {
    if (isCollapsed) {
        setIsCollapsed(false);
        setExpandedMenus([name]);
        return;
    }
    setExpandedMenus(prev => 
      prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name]
    );
  };

  // Define Menus for each Role
  const studentMenuItems = [
    { name: 'Faculty Directory', path: '/locator', icon: RiDashboardFill },
    { name: 'Campus Map', path: '/map', icon: RiMapPin2Fill },
    {
      name: 'Classroom',
      icon: RiCalendarEventFill,
      subItems: [
        { name: 'Timetable', path: '/classroom', icon: RiTimeLine },
        { name: 'Announcements', path: '/updates', icon: RiNotification4Fill },
        { name: 'Attendance', path: '/attendance', icon: RiUserFollowFill },
      ]
    },
  ];

  const facultyMenuItems = [
    { name: 'Faculty Directory', path: '/locator', icon: RiDashboardFill },
    { name: 'My Dashboard', path: '/faculty', icon: RiUserSettingsFill },
    { name: 'Schedule', path: '/faculty?tab=schedule', icon: RiTimeLine },
    { name: 'Attendance', path: '/attendance', icon: RiUserFollowFill },
    { name: 'Announcements', path: '/faculty?tab=broadcast', icon: RiBroadcastFill },
    { name: 'Campus Map', path: '/map', icon: RiMapPin2Fill },
  ];

  const menuItems = user?.role === 'faculty' ? facultyMenuItems : studentMenuItems;

  const sidebarContent = (
    <div className="h-full flex flex-col relative">
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-zinc-700/15 via-transparent to-transparent pointer-events-none z-0" />
      
      <div className="h-24 flex items-center px-6 justify-between border-b border-zinc-900/30 relative z-10 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="bg-white p-2.5 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            <RiShieldUserFill className="text-black text-xl" />
          </div>
          <AnimatePresence mode="wait">
            {(!isCollapsed || isMobileOpen) && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col"
              >
                <span className="text-white font-black uppercase tracking-tighter text-xl leading-none">WhereIsProf</span>
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.4em] mt-1">
                  {user?.role === 'faculty' ? 'Faculty Portal' : 'Student Portal'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button onClick={() => setIsMobileOpen(false)} className="lg:hidden p-2 text-zinc-500 hover:text-white">
          <RiCloseLine size={24} />
        </button>
      </div>

      <div className="hidden lg:block px-5 mt-8 relative z-10 shrink-0">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full h-12 flex items-center justify-center rounded-2xl bg-zinc-900/30 border border-zinc-800/50 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all duration-300 active:scale-95"
        >
          {isCollapsed ? <RiMenuUnfoldFill size={20} /> : <RiMenuFoldFill size={20} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-8 relative z-10">
        <div className="space-y-3">
          <div className={cn("px-1 mb-4", (isCollapsed && !isMobileOpen) ? "hidden" : "block")}>
            <span className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.5em]">Menu</span>
          </div>
          
          {menuItems.map((item) => {
            const isMenuExpanded = expandedMenus.includes(item.name);
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isAnySubItemActive = hasSubItems && item.subItems.some(sub => location.pathname === sub.path);
            const isActive = location.pathname + location.search === item.path || isAnySubItemActive;

            return (
              <div key={item.name} className="space-y-1">
                {hasSubItems ? (
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={cn(
                      "w-full flex items-center h-12 rounded-2xl transition-all duration-300 group/item relative overflow-hidden",
                      isActive && !isMenuExpanded
                        ? "text-black font-black" 
                        : "text-zinc-500 hover:text-white hover:bg-zinc-900/40"
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center min-w-[44px] h-full z-10",
                      (isCollapsed && !isMobileOpen) && "mx-auto"
                    )}>
                      <item.icon size={22} />
                    </div>
                    {!isCollapsed && (
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex items-center justify-between pr-4 z-10">
                        <span className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">{item.name}</span>
                        <RiArrowDownSLine size={16} className={cn("transition-transform duration-300", isMenuExpanded && "rotate-180")} />
                      </motion.div>
                    )}
                    {isActive && !isMenuExpanded && (
                      <motion.div layoutId="active-pill" className="absolute inset-0 bg-white rounded-2xl z-0 shadow-lg shadow-white/5" transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                    )}
                  </button>
                ) : (
                  <Link to={item.path}>
                    <div
                      className={cn(
                        "flex items-center h-12 rounded-2xl transition-all duration-300 group/item relative overflow-hidden",
                        isActive 
                          ? "text-black font-black" 
                          : "text-zinc-500 hover:text-white hover:bg-zinc-900/40"
                      )}
                    >
                      <div className={cn(
                        "flex items-center justify-center min-w-[44px] h-full z-10",
                        (isCollapsed && !isMobileOpen) && "mx-auto"
                      )}>
                        <item.icon size={22} />
                      </div>
                      {!isCollapsed && (
                        <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="ml-2 text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap z-10">
                          {item.name}
                        </motion.span>
                      )}
                      {isActive && (
                        <motion.div layoutId="active-pill" className="absolute inset-0 bg-white rounded-2xl z-0 shadow-lg shadow-white/5" transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                      )}
                    </div>
                  </Link>
                )}

                <AnimatePresence>
                  {hasSubItems && isMenuExpanded && (!isCollapsed || isMobileOpen) && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pl-4 space-y-1">
                      {item.subItems.map((sub) => {
                        const isSubActive = location.pathname === sub.path;
                        return (
                          <Link key={sub.path} to={sub.path}>
                            <div className={cn("flex items-center h-10 rounded-xl transition-all duration-200 group/sub relative overflow-hidden", isSubActive ? "text-white bg-zinc-900 border border-zinc-800 shadow-xl" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/20")}>
                              <div className="flex items-center justify-center min-w-[36px]">
                                <sub.icon size={14} className={cn(isSubActive ? "text-white" : "text-zinc-600")} />
                              </div>
                              <span className="text-[9px] font-black uppercase tracking-[0.1em]">{sub.name}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-5 border-t border-zinc-900/30 relative z-10 shrink-0">
        {user ? (
          <div className="space-y-4">
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex items-center p-3 bg-zinc-900/20 rounded-2xl border border-zinc-800/30 space-x-3">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-black font-black text-xs shrink-0 shadow-lg shadow-black/20">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-white text-[10px] font-black uppercase truncate">{user.name}</span>
                  <span className="text-zinc-600 text-[8px] font-bold uppercase tracking-widest truncate">{user.role}</span>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className={cn(
                "w-full h-12 flex items-center rounded-2xl bg-zinc-950 border border-zinc-900/50 text-zinc-600 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-500 transition-all duration-300 active:scale-95 overflow-hidden",
                (isCollapsed && !isMobileOpen) ? "justify-center" : "px-4"
              )}
            >
              <RiLogoutBoxRLine size={20} className="shrink-0" />
              {(!isCollapsed || isMobileOpen) && <span className="ml-4 text-[10px] font-black uppercase tracking-[0.1em] whitespace-nowrap">Sign Out</span>}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
             <Link to="/login">
                <button
                  className={cn("w-full h-12 flex items-center rounded-2xl bg-white text-black font-black hover:bg-zinc-200 transition-all duration-300 active:scale-95 overflow-hidden shadow-xl shadow-white/5", (isCollapsed && !isMobileOpen) ? "justify-center" : "px-4")}
                >
                  <RiLoginBoxLine size={22} className="shrink-0" />
                  {(!isCollapsed || isMobileOpen) && <span className="ml-4 text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Sign In</span>}
                </button>
             </Link>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <motion.div initial={false} animate={{ width: isCollapsed ? 84 : 280 }} style={{ margin: '16px' }} className="hidden lg:flex h-[calc(100vh-32px)] bg-zinc-950/80 backdrop-blur-xl border border-zinc-900 flex-col fixed top-0 left-0 z-50 overflow-hidden rounded-[2.5rem] shadow-2xl shadow-black group" transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
        {sidebarContent}
      </motion.div>
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileOpen(false)} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] lg:hidden" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-y-0 left-0 w-[280px] bg-zinc-950 z-[101] lg:hidden overflow-hidden">
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
