import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { toast, Toaster } from 'react-hot-toast';
import axios from 'axios';
import { FiFlag, FiMenu, FiX, FiMessageSquare, FiAlertTriangle } from 'react-icons/fi';

const DashboardLayout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dismissedAlertToastRef = useRef(new Set());
  const [requestFeed, setRequestFeed] = useState([]);
  const [requestFeedLoading, setRequestFeedLoading] = useState(true);
  const [isRequestMobileOpen, setIsRequestMobileOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [requestSearch, setRequestSearch] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState('ALL');
  const [requestPage, setRequestPage] = useState(1);
  const [requestSeenMap, setRequestSeenMap] = useState({});
  const [alertFeed, setAlertFeed] = useState([]);
  const [alertFeedLoading, setAlertFeedLoading] = useState(true);
  const requestItemsPerPage = 5;
  const requestSeenStorageKey = user?.id ? `request_monitor_seen_${user.id}` : '';

  const getStatusLabel = (status) => {
    const labels = {
      PENDING: 'Menunggu NOC',
      REVIEWED_BY_NOC: 'Menunggu Review GM',
      APPROVED_BY_GM: 'Menunggu NOC Mengirim',
      APPROVED_READY_TO_SHIP: 'Siap Dikirim',
      ON_DELIVERY: 'Dalam Pengiriman',
      FULFILLED: 'Selesai',
      REJECTED_BY_NOC: 'Ditolak oleh NOC',
      REJECTED_BY_GM: 'Ditolak oleh GM',
      CANCELLED: 'Dibatalkan'
    };
    return labels[status] || status;
  };

  const getUrgencyConfig = (urgency) => {
    if (urgency === 'CRITICAL') return { label: 'Critical', badge: 'bg-red-50 text-red-600 border-red-200', flag: 'text-red-600' };
    return { label: 'Penting', badge: 'bg-amber-50 text-amber-600 border-amber-200', flag: 'text-amber-600' };
  };

  const getAlertPriorityConfig = (priority) => {
    if (priority === 'CRITICAL') {
      return { badge: 'bg-red-50 text-red-600 border-red-200', label: 'Kritis' };
    }
    return { badge: 'bg-amber-50 text-amber-600 border-amber-200', label: 'Peringatan' };
  };

  const statusFilterOptions = [
    { value: 'ALL', label: 'Semua Status' },
    { value: 'PENDING', label: 'Menunggu NOC' },
    { value: 'REVIEWED_BY_NOC', label: 'Menunggu Review GM' },
    { value: 'APPROVED_BY_GM', label: 'Menunggu NOC Mengirim' },
    { value: 'APPROVED_READY_TO_SHIP', label: 'Siap Dikirim' },
    { value: 'ON_DELIVERY', label: 'Dalam Pengiriman' },
    { value: 'FULFILLED', label: 'Selesai' },
    { value: 'REJECTED_BY_NOC', label: 'Ditolak oleh NOC' },
    { value: 'REJECTED_BY_GM', label: 'Ditolak oleh GM' },
    { value: 'CANCELLED', label: 'Dibatalkan' }
  ];

  const getRequestVersion = (req) => new Date(req.updatedAt || req.createdAt || Date.now()).getTime();

  useEffect(() => {
    if (!user) return;

    const socket = io('http://localhost:5000');
    
    socket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    socket.on('new_material_request', (data) => {
      window.dispatchEvent(new Event('mr_new_request'));
      window.dispatchEvent(new Event('mr_flow_update'));
    });

    socket.on('request_shipped', (data) => {
      window.dispatchEvent(new Event('mr_flow_update'));
    });

    socket.on('request_reviewed', (data) => {
      window.dispatchEvent(new Event('mr_flow_update'));
    });

    socket.on('request_approved', (data) => {
      window.dispatchEvent(new Event('mr_flow_update'));
    });

    socket.on('request_rejected', (data) => {
      window.dispatchEvent(new Event('mr_flow_update'));
    });

    socket.on('inventory_updated', () => {
      window.dispatchEvent(new Event('inventory_updated'));
    });

    socket.on('new_alert', (data) => {
      window.dispatchEvent(new Event('alerts_updated'));
      if (user.role === 'NOC' || user.role === 'GM' || user.role === 'OM' || user.role === 'PROGRAMMER') {
        const alertToastId = `alert-${data.alertId || data.materialId || data.siteId || data.message}`;
        if (dismissedAlertToastRef.current.has(alertToastId)) return;
        toast.custom((t) => (
          <div
            className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-[2rem] pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-l-8 border-red-500 cursor-pointer`}
            onClick={() => {
              navigate('/alerts');
              toast.dismiss(alertToastId);
            }}
          >
            <div className="flex-1 w-0 p-6">
              <div className="flex items-start">
                <div className="ml-3 flex-1">
                  <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Stock Alert</p>
                  <p className="mt-1 text-sm font-bold text-slate-500">{data.message}</p>
                  <p className="mt-2 text-[10px] font-black text-red-600 uppercase tracking-[0.2em]">Site: {data.site}</p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-slate-50">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismissedAlertToastRef.current.add(alertToastId);
                  toast.dismiss(alertToastId);
                }}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-bold text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        ), { id: alertToastId, duration: 5000, position: 'top-right' });
      }
    });

    socket.on('alert_resolved', (data) => {
      window.dispatchEvent(new Event('alerts_updated'));
      if (user.role === 'NOC' || user.role === 'GM' || user.role === 'OM' || user.role === 'PROGRAMMER') {
        const resolvedToastId = `alert-resolved-${data.alertId || data.materialId || data.siteId || data.message}`;
        toast.custom((t) => (
          <div
            className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-[2rem] pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-l-8 border-emerald-500 cursor-pointer`}
            onClick={() => {
              navigate('/alerts');
              toast.dismiss(resolvedToastId);
            }}
          >
            <div className="flex-1 w-0 p-6">
              <div className="flex items-start">
                <div className="ml-3 flex-1">
                  <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Alert Resolved</p>
                  <p className="mt-1 text-sm font-bold text-slate-500">{data.message}</p>
                  <p className="mt-2 text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Site: {data.site}</p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-slate-50">
              <button onClick={(e) => { e.stopPropagation(); toast.dismiss(resolvedToastId); }} className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-bold text-slate-400 hover:text-slate-600 focus:outline-none">Close</button>
            </div>
          </div>
        ), { id: resolvedToastId, duration: 4000, position: 'top-right' });
      }
    });

    return () => socket.disconnect();
  }, [user]);

  useEffect(() => {
    setIsSidebarOpen(window.innerWidth >= 768);
  }, []);

  useEffect(() => {
    if (!requestSeenStorageKey) {
      setRequestSeenMap({});
      return;
    }
    try {
      const raw = localStorage.getItem(requestSeenStorageKey);
      setRequestSeenMap(raw ? JSON.parse(raw) : {});
    } catch (err) {
      setRequestSeenMap({});
    }
  }, [requestSeenStorageKey]);

  const persistSeenMap = (nextMap) => {
    setRequestSeenMap(nextMap);
    if (requestSeenStorageKey) {
      localStorage.setItem(requestSeenStorageKey, JSON.stringify(nextMap));
    }
  };

  const markRequestAsSeen = (req) => {
    if (!req) return;
    const version = getRequestVersion(req);
    const current = Number(requestSeenMap[req.id] || 0);
    if (current >= version) return;
    persistSeenMap({ ...requestSeenMap, [req.id]: version });
  };

  useEffect(() => {
    if (!user) return;
    const fetchRequestFeed = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setRequestFeed([]);
          setRequestFeedLoading(false);
          return;
        }
        const res = await axios.get('http://localhost:5000/api/requests', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const list = res.data?.data || [];
        const sorted = [...list].sort((a, b) => {
          const aTime = new Date(a.updatedAt || a.createdAt).getTime();
          const bTime = new Date(b.updatedAt || b.createdAt).getTime();
          return bTime - aTime;
        });
        setRequestFeed(sorted);
        setRequestFeedLoading(false);
      } catch (err) {
        setRequestFeedLoading(false);
      }
    };

    fetchRequestFeed();
    const intervalId = setInterval(fetchRequestFeed, 20000);
    const handleUpdate = () => fetchRequestFeed();
    window.addEventListener('mr_new_request', handleUpdate);
    window.addEventListener('mr_flow_update', handleUpdate);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('mr_new_request', handleUpdate);
      window.removeEventListener('mr_flow_update', handleUpdate);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchAlertFeed = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setAlertFeed([]);
          setAlertFeedLoading(false);
          return;
        }
        const res = await axios.get('http://localhost:5000/api/notifications', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        const filtered = list
          .filter((n) => n.type === 'ALERT' || n.type === 'ALERT_RESOLVED' || n.alertId || n.Alert)
          .slice(0, 30);
        setAlertFeed(filtered);
        setAlertFeedLoading(false);
      } catch (err) {
        setAlertFeed([]);
        setAlertFeedLoading(false);
      }
    };
    fetchAlertFeed();
    const intervalId = setInterval(fetchAlertFeed, 20000);
    const handleAlertUpdate = () => fetchAlertFeed();
    const handleNotificationUpdate = () => fetchAlertFeed();
    window.addEventListener('alerts_updated', handleAlertUpdate);
    window.addEventListener('notifications_updated', handleNotificationUpdate);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('alerts_updated', handleAlertUpdate);
      window.removeEventListener('notifications_updated', handleNotificationUpdate);
    };
  }, [user]);

  useEffect(() => {
    setRequestPage(1);
  }, [requestSearch, requestStatusFilter]);

  const filteredRequestFeed = requestFeed.filter((req) => {
    if (requestStatusFilter !== 'ALL' && req.status !== requestStatusFilter) return false;
    if (!requestSearch) return true;
    const keyword = requestSearch.toLowerCase();
    const project = (req.project || '').toLowerCase();
    const site = (req.Site?.name || req.site || '').toLowerCase();
    const idText = String(req.id || '');
    return project.includes(keyword) || site.includes(keyword) || idText.includes(keyword);
  });
  const requestTotalPages = Math.max(1, Math.ceil(filteredRequestFeed.length / requestItemsPerPage));
  const requestSafePage = Math.min(requestPage, requestTotalPages);
  const pagedRequestFeed = filteredRequestFeed.slice(
    (requestSafePage - 1) * requestItemsPerPage,
    requestSafePage * requestItemsPerPage
  );
  const unreadRequestCount = requestFeed.filter((req) => Number(requestSeenMap[req.id] || 0) < getRequestVersion(req)).length;
  const unreadAlertCount = alertFeed.filter((item) => !item.readAt).length;
  const monitorBadgeCount = unreadRequestCount + unreadAlertCount;

  const markAlertNotificationAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5000/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAlertFeed((prev) => prev.map((item) => (
        item.id === id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item
      )));
      window.dispatchEvent(new CustomEvent('notifications_updated', {
        detail: { unreadCount: Math.max(0, unreadAlertCount - 1) }
      }));
    } catch (err) {
      // no-op, panel keeps previous state
    }
  };

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Toaster />
      <button
        type="button"
        onClick={() => setIsSidebarOpen((prev) => !prev)}
        className="fixed top-3 left-3 z-50 w-8 h-8 rounded-full bg-white/90 border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:text-sundaya-red transition-colors"
      >
        {isSidebarOpen ? <FiX size={14} /> : <FiMenu size={14} />}
      </button>
      <div className={`fixed inset-0 z-30 bg-slate-900/40 transition-opacity md:hidden ${isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)} />
      <button
        type="button"
        onClick={() => setIsRequestMobileOpen((prev) => !prev)}
        className="fixed top-3 right-3 z-40 w-9 h-9 rounded-full bg-slate-900 text-white shadow-lg flex items-center justify-center"
      >
        <FiMessageSquare size={16} />
        {monitorBadgeCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center">
            {monitorBadgeCount}
          </span>
        )}
      </button>
      {isRequestMobileOpen && (
        <div className="fixed top-14 right-3 z-40 w-[calc(100vw-1.5rem)] sm:w-80 space-y-2">
          <div className="bg-slate-900 text-white px-3 py-2 rounded-2xl flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest">Monitor Notifikasi</span>
            <span className="text-[10px] font-bold text-slate-300">
              Req {unreadRequestCount} • Alert {unreadAlertCount}
            </span>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-3 space-y-2">
            <input
              value={requestSearch}
              onChange={(e) => setRequestSearch(e.target.value)}
              placeholder="Cari request..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 focus:outline-none focus:border-slate-400"
            />
            <select
              value={requestStatusFilter}
              onChange={(e) => setRequestStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 focus:outline-none focus:border-slate-400"
            >
              {statusFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                const nextMap = { ...requestSeenMap };
                requestFeed.forEach((req) => {
                  nextMap[req.id] = getRequestVersion(req);
                });
                persistSeenMap(nextMap);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-sundaya-red hover:border-sundaya-red transition-all"
            >
              Tandai semua dibaca
            </button>
          </div>
          {requestFeedLoading ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-3 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memuat</p>
            </div>
          ) : filteredRequestFeed.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-3 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Belum Ada Request</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto">
              {pagedRequestFeed.map((req) => {
                const urgencyConfig = getUrgencyConfig(req.urgency);
                const isUnread = Number(requestSeenMap[req.id] || 0) < getRequestVersion(req);
                return (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => {
                      setSelectedRequest(req);
                      markRequestAsSeen(req);
                    }}
                    className={isUnread ? "w-full text-left bg-white border border-red-100 rounded-2xl p-3 shadow-sm" : "w-full text-left bg-white border border-slate-100 rounded-2xl p-3 shadow-sm"}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FiFlag size={14} className={urgencyConfig.flag} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            REQ-{req.id.toString().padStart(4, '0')}
                          </span>
                          {isUnread && (
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-slate-800 truncate">{req.project}</p>
                        <p className="text-[10px] font-bold text-slate-400">{req.Site?.name || req.site || 'N/A'}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${urgencyConfig.badge}`}>
                            {urgencyConfig.label}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-slate-200 text-slate-500">
                            {getStatusLabel(req.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {requestTotalPages > 1 && (
            <div className="bg-white rounded-2xl border border-slate-100 px-3 py-2 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Page {requestSafePage} / {requestTotalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRequestPage(Math.max(1, requestSafePage - 1))}
                  disabled={requestSafePage === 1}
                  className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-500 hover:text-sundaya-red hover:border-sundaya-red transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <button
                  onClick={() => setRequestPage(Math.min(requestTotalPages, requestSafePage + 1))}
                  disabled={requestSafePage === requestTotalPages}
                  className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-500 hover:text-sundaya-red hover:border-sundaya-red transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-slate-100 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Alert Stok</span>
              <span className="text-[10px] font-bold text-slate-400">{unreadAlertCount} belum dibaca</span>
            </div>
            {alertFeedLoading ? (
              <div className="text-center py-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memuat Alert</p>
              </div>
            ) : alertFeed.length === 0 ? (
              <div className="text-center py-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Belum Ada Alert</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {alertFeed.slice(0, 10).map((item) => {
                  const priority = getAlertPriorityConfig(item.Alert?.priority);
                  const isUnread = !item.readAt;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={async () => {
                        if (isUnread) {
                          await markAlertNotificationAsRead(item.id);
                        }
                        setIsRequestMobileOpen(false);
                        navigate('/alerts');
                      }}
                      className={isUnread ? "w-full text-left p-3 rounded-xl border border-red-100 bg-red-50/40" : "w-full text-left p-3 rounded-xl border border-slate-100 bg-white"}
                    >
                      <div className="flex items-start gap-2">
                        <FiAlertTriangle className={isUnread ? "text-red-500 mt-0.5" : "text-slate-400 mt-0.5"} size={14} />
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-[11px] font-bold text-slate-700 leading-snug">{item.message}</p>
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${priority.badge}`}>
                              {priority.label}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400">
                              {new Date(item.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setSelectedRequest(null)}>
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-100 shadow-xl p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                REQ-{selectedRequest.id.toString().padStart(4, '0')}
              </h4>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600"
              >
                Tutup
              </button>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800">{selectedRequest.project || '-'}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {selectedRequest.Site?.name || selectedRequest.site || 'N/A'} • {getStatusLabel(selectedRequest.status)}
              </p>
              <p className="text-[10px] text-slate-500">
                Diperbarui: {new Date(selectedRequest.updatedAt || selectedRequest.createdAt).toLocaleString('id-ID')}
              </p>
              {selectedRequest.description && (
                <p className="text-xs text-slate-600 leading-relaxed">{selectedRequest.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                markRequestAsSeen(selectedRequest);
                setSelectedRequest(null);
              }}
              className="w-full py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
            >
              Tandai Sudah Dibaca
            </button>
          </div>
        </div>
      )}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className={`flex-1 ${isSidebarOpen ? 'ml-72' : 'ml-0'} p-0 overflow-hidden transition-all`}>
        <div className="h-screen overflow-y-auto custom-scrollbar">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
