import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FiGrid, FiPackage, FiFileText, FiTruck, FiRefreshCw,
  FiAlertCircle, FiActivity, FiSettings, FiLogOut, FiUser, FiBell 
} from 'react-icons/fi';
import axios from 'axios';

const Sidebar = ({ isOpen = true, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [imgError, setImgError] = useState(false);
  const [circleError, setCircleError] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    if (window.innerWidth < 768) {
      onClose?.();
    }
  };

  const getDashboardPath = () => {
    if (user?.role === 'NOC') return '/admin';
    if (user?.role === 'PROGRAMMER') return '/programmer';
    if (user?.role === 'GM') return '/gm';
    if (user?.role === 'OM') return '/om';
    return '/';
  };

  const getRequestMenuName = () => {
    if (user?.role === 'NOC' || user?.role === 'GM') return 'Review Request';
    return 'Material Requests';
  };

  const menuItems = [
    { 
      title: 'MAIN DASHBOARD',
      items: [
        { 
          name: user?.role === 'PROGRAMMER' ? 'Programmer Control' : (user?.role === 'GM' ? 'Executive Monitor' : (user?.role === 'OM' ? 'Site Overview' : 'NOC Control')), 
          path: getDashboardPath(), 
          icon: <FiGrid />,
          roles: ['GM', 'NOC', 'OM', 'PROGRAMMER']
        }
      ]
    },
    {
      title: 'LOGISTICS & STOCK',
      items: [
        { name: 'Stock Master', path: '/inventory', icon: <FiPackage />, roles: ['GM', 'NOC', 'OM', 'PROGRAMMER'] },
        { name: getRequestMenuName(), path: '/requests', icon: <FiFileText />, showNotif: true, roles: ['GM', 'NOC', 'OM', 'PROGRAMMER'] },
        { name: 'Reports', path: '/reports', icon: <FiFileText />, roles: ['GM', 'NOC', 'OM', 'PROGRAMMER'] },
        { name: 'Recycle Material', path: '/used-materials', icon: <FiRefreshCw />, roles: ['GM', 'NOC', 'OM', 'PROGRAMMER'] },
        { name: 'History Inventory', path: '/inventory-usage', icon: <FiActivity />, roles: ['GM', 'NOC', 'OM', 'PROGRAMMER'] },
        { name: 'Shipping Control', path: '/shipping', icon: <FiTruck />, roles: ['NOC', 'PROGRAMMER'] }
      ]
    },
    {
      title: 'ADMINISTRATION',
      items: [
        { name: 'Notifications', path: '/notifications', icon: <FiBell />, showNotificationBadge: true, roles: ['GM', 'NOC', 'OM', 'PROGRAMMER'] },
        { name: 'System Alerts', path: '/alerts', icon: <FiAlertCircle />, showAlert: true, roles: ['GM', 'NOC', 'PROGRAMMER'] },
        { name: 'Audit Logs', path: '/logs', icon: <FiActivity />, roles: ['GM', 'NOC', 'PROGRAMMER'] },
        { name: 'Settings', path: '/settings', icon: <FiSettings />, roles: ['GM', 'NOC', 'OM', 'PROGRAMMER'] }
      ]
    }
  ];

  const filteredMenuItems = menuItems.map(section => ({
    ...section,
    items: section.items.filter(item => item.roles.includes(user?.role))
  })).filter(section => section.items.length > 0);

  useEffect(() => {
    const fetchNotifCount = async () => {
      if (!user) return;
      if (!['NOC', 'GM', 'PROGRAMMER'].includes(user.role)) {
        setNotifCount(0);
        localStorage.setItem('mr_unread_count', '0');
        return;
      }
      const token = localStorage.getItem('token');
      if (!token) {
        setNotifCount(0);
        localStorage.setItem('mr_unread_count', '0');
        return;
      }
      try {
        const res = await axios.get('http://localhost:5000/api/requests', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const list = res.data?.data || [];
        let count = 0;
        if (user.role === 'GM') {
          count = list.filter((r) => r.status === 'REVIEWED_BY_NOC').length;
        } else if (user.role === 'NOC' || user.role === 'PROGRAMMER') {
          count = list.filter((r) => r.status === 'PENDING').length;
        }
        localStorage.setItem('mr_unread_count', String(count));
        setNotifCount(count);
        window.dispatchEvent(new Event('mr_unread_update'));
      } catch (err) {
        console.error('Failed to fetch request notifications', err);
      }
    };

    fetchNotifCount();
    const intervalId = setInterval(fetchNotifCount, 20000);
    const handleUpdate = () => fetchNotifCount();
    window.addEventListener('mr_new_request', handleUpdate);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('mr_new_request', handleUpdate);
    };
  }, [user]);

  useEffect(() => {
    const fetchNotificationAndAlertCount = async () => {
      if (!user) return;
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const [notifRes, alertRes] = await Promise.all([
          axios.get('http://localhost:5000/api/notifications/unread-count', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          ['NOC', 'GM', 'PROGRAMMER'].includes(user.role)
            ? axios.get('http://localhost:5000/api/inventory/alerts?activeOnly=true', {
              headers: { Authorization: `Bearer ${token}` }
            })
            : Promise.resolve({ data: { data: [] } })
        ]);
        setNotificationUnreadCount(notifRes.data?.data?.count || 0);
        setAlertCount((alertRes.data?.data || []).length);
      } catch (err) {
        console.error('Failed to fetch notification/alert count', err);
      }
    };
    fetchNotificationAndAlertCount();
    const intervalId = setInterval(fetchNotificationAndAlertCount, 20000);
    const handleAlertUpdate = () => fetchNotificationAndAlertCount();
    const handleNotificationUpdate = (event) => {
      const unreadCount = Number(event?.detail?.unreadCount);
      if (Number.isFinite(unreadCount)) {
        setNotificationUnreadCount(Math.max(0, unreadCount));
      }
      fetchNotificationAndAlertCount();
    };
    window.addEventListener('alerts_updated', handleAlertUpdate);
    window.addEventListener('notifications_updated', handleNotificationUpdate);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('alerts_updated', handleAlertUpdate);
      window.removeEventListener('notifications_updated', handleNotificationUpdate);
    };
  }, [user]);

  useEffect(() => {
    if (location.pathname === '/requests') {
      window.dispatchEvent(new Event('mr_new_request'));
    }
  }, [location.pathname]);

  return (
    <aside className={`w-72 bg-white h-screen border-r border-slate-200 flex flex-col fixed left-0 top-0 z-20 shadow-2xl shadow-slate-200/50 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Brand Logo */}
      <div className="p-8 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
            {circleError ? (
              <div className="text-red-700 font-black text-2xl italic">S</div>
            ) : (
              <img 
                src="/favicon.ico" 
                alt="Sundaya Circle" 
                className="w-12 h-12 object-contain"
                onError={() => setCircleError(true)}
              />
            )}
          </div>
          <div className="flex flex-col gap-1">
            {imgError ? (
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase italic">SUNDAYA</h1>
            ) : (
              <img 
                src="" 
                alt="Sundaya Logo" 
                className="h-5 object-contain"
                onError={() => setImgError(true)}
              />
            )}
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Warehouse v2.0</span>
          </div>
        </div>
      </div>

      {/* User Profile Summary */}
      <div className="px-6 py-6">
        <div className="p-4 bg-slate-900 rounded-3xl flex items-center gap-3 border border-slate-800 shadow-xl">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white shadow-inner border border-white/5">
            <FiUser size={20} className="text-red-500" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-black text-white truncate uppercase tracking-tight">{user?.username || 'User'}</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{user?.role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 px-4 overflow-y-auto custom-scrollbar space-y-8 pb-8">
        {filteredMenuItems.map((section, idx) => (
          <div key={idx}>
            <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <span className="w-1 h-1 bg-red-700 rounded-full"></span>
              {section.title}
            </p>
            <nav className="space-y-1.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={handleNavClick}
                  className={({ isActive }) => `
                    group flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300
                    ${isActive 
                      ? 'bg-gradient-to-r from-red-700 to-red-800 text-white shadow-xl shadow-red-200/50 translate-x-1 border-l-4 border-white' 
                      : 'text-slate-600 hover:bg-red-50 hover:text-red-900 hover:translate-x-1'}
                  `}
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3.5">
                        <span className={`text-lg transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-red-700'}`}>
                          {item.icon}
                        </span>
                        <span className="text-sm font-black tracking-tight">{item.name}</span>
                      </div>
                      {item.showNotif && notifCount > 0 && (
                        <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center ${isActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'}`}>
                          {notifCount}
                        </span>
                      )}
                      {item.showNotificationBadge && notificationUnreadCount > 0 && (
                        <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center ${isActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>
                          {notificationUnreadCount}
                        </span>
                      )}
                      {item.showAlert && alertCount > 0 && (
                        <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center ${isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>
                          {alertCount}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </div>

      {/* System Actions */}
      <div className="p-4 mt-auto border-t border-slate-100 space-y-1">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-slate-500 hover:bg-slate-900 hover:text-white transition-all duration-300 group font-bold text-sm"
        >
          <FiLogOut className="text-lg group-hover:rotate-12 transition-transform" />
          <span>Logout System</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
