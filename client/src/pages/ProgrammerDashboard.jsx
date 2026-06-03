import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { clsx } from 'clsx';
import { toast } from 'react-hot-toast';
import socket from '../utils/socket';
import { FiRefreshCw, FiUsers, FiMapPin, FiBell, FiPackage, FiTruck, FiClock, FiCheckCircle, FiSettings, FiActivity, FiAlertTriangle, FiMessageSquare } from 'react-icons/fi';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';

const STATUS_LABELS = {
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

const moduleCards = [
  { name: 'Settings & Flow', path: '/settings', icon: FiSettings, color: 'from-violet-500 to-fuchsia-500' },
  { name: 'Material Requests', path: '/requests', icon: FiActivity, color: 'from-red-500 to-orange-500' },
  { name: 'Stock Master', path: '/inventory', icon: FiPackage, color: 'from-blue-500 to-cyan-500' },
  { name: 'System Alerts', path: '/alerts', icon: FiAlertTriangle, color: 'from-amber-500 to-orange-500' },
  { name: 'Shipping Control', path: '/shipping', icon: FiTruck, color: 'from-emerald-500 to-teal-500' },
  { name: 'Notifications', path: '/notifications', icon: FiBell, color: 'from-slate-500 to-slate-700' }
];

const MetricCard = ({ title, value, icon: Icon, tone }) => (
  <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</p>
        <p className="text-2xl font-black text-slate-800 mt-2">{value}</p>
      </div>
      <div className={clsx("w-12 h-12 rounded-2xl text-white flex items-center justify-center", tone)}>
        <Icon size={22} />
      </div>
    </div>
  </div>
);

const ProgrammerDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState([]);
  const [sites, setSites] = useState([]);
  const [users, setUsers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [stats, setStats] = useState(null);
  const [monitoring, setMonitoring] = useState(null);
  const [executiveNotes, setExecutiveNotes] = useState([]);
  const [monitoringLoading, setMonitoringLoading] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const fetchDashboard = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [reqRes, siteRes, userRes, alertRes, notifRes, statsRes, monitorRes, notesRes] = await Promise.all([
        axios.get('http://localhost:5000/api/requests', { headers }),
        axios.get('http://localhost:5000/api/inventory/sites', { headers }),
        axios.get('http://localhost:5000/api/auth/users', { headers }),
        axios.get('http://localhost:5000/api/inventory/alerts', { headers }),
        axios.get('http://localhost:5000/api/notifications/unread-count', { headers }),
        axios.get('http://localhost:5000/api/reports/stats', { headers }),
        axios.get('http://localhost:5000/api/reports/monitoring', { headers }),
        axios.get('http://localhost:5000/api/reports/notes', { headers })
      ]);
      setRequests(reqRes.data?.data || []);
      setSites(siteRes.data?.data || []);
      setUsers(userRes.data?.data || []);
      setAlerts(alertRes.data?.data || []);
      setUnreadNotif(notifRes.data?.data?.count || 0);
      setStats(statsRes.data?.data || null);
      setMonitoring(monitorRes.data?.data || null);
      setExecutiveNotes(notesRes.data?.data || []);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        navigate('/login');
        return;
      }
      console.error('Failed to fetch programmer dashboard data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();

    // Listen for real-time executive notes
    socket.on('new_executive_note', (note) => {
      setExecutiveNotes(prev => [note, ...prev].slice(0, 10));
      toast.success(`Arahan Baru (GM): ${note.message.substring(0, 50)}...`, {
        icon: '📢',
        duration: 5000
      });
    });

    return () => {
      socket.off('new_executive_note');
    };
  }, []);

  const requestSummary = useMemo(() => {
    const summary = {
      total: requests.length,
      pending: 0,
      waitingGm: 0,
      waitingNocShip: 0,
      onDelivery: 0,
      done: 0
    };
    requests.forEach((r) => {
      if (r.status === 'PENDING') summary.pending += 1;
      if (r.status === 'REVIEWED_BY_NOC') summary.waitingGm += 1;
      if (r.status === 'APPROVED_BY_GM') summary.waitingNocShip += 1;
      if (r.status === 'ON_DELIVERY') summary.onDelivery += 1;
      if (r.status === 'FULFILLED') summary.done += 1;
    });
    return summary;
  }, [requests]);

  const statusChartData = useMemo(() => {
    const map = {};
    requests.forEach((r) => {
      map[r.status] = (map[r.status] || 0) + 1;
    });
    return Object.keys(map).map((status) => ({
      name: STATUS_LABELS[status] || status,
      value: map[status]
    }));
  }, [requests]);

  const roleChartData = useMemo(() => {
    const map = {};
    users.forEach((u) => {
      map[u.role] = (map[u.role] || 0) + 1;
    });
    return Object.keys(map).map((role) => ({ name: role, value: map[role] }));
  }, [users]);

  const latestRequests = useMemo(() => {
    return [...requests]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
      .slice(0, 6);
  }, [requests]);  //algoritma sorting

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 font-bold">
          <FiRefreshCw className="animate-spin" />
          Memuat kontrol dashboard programmer...
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Executive Notes Banner */}
      {executiveNotes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 px-1">
            <FiMessageSquare className="text-slate-900" />
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Arahan Eksekutif (GM)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {executiveNotes.map((note) => (
              <div key={note.id} className={clsx(
                "p-5 rounded-[2rem] border shadow-sm transition-all hover:shadow-md",
                note.priority === 'URGENT' 
                  ? "bg-red-50 border-red-100 text-red-900" 
                  : "bg-white border-slate-100 text-slate-800"
              )}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={clsx(
                      "w-2 h-2 rounded-full",
                      note.priority === 'URGENT' ? "bg-red-500 animate-pulse" : "bg-slate-900"
                    )}></div>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                      {note.priority}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold opacity-50">
                    {new Date(note.createdAt).toLocaleDateString('id-ID')}
                  </span>
                </div>
                <p className="text-sm font-medium leading-relaxed italic">"{note.message}"</p>
                <div className="mt-4 pt-3 border-t border-current opacity-10 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase">Dari: {note.sender?.name} ({note.sender?.role})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Programmer Control Center</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Monitoring menyeluruh untuk semua alur operasional dan modul sistem
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
        >
          <FiRefreshCw className={refreshing ? 'animate-spin' : ''} />
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <MetricCard title="Total Request" value={requestSummary.total} icon={FiActivity} tone="bg-slate-900" />
        <MetricCard title="Menunggu NOC" value={requestSummary.pending} icon={FiClock} tone="bg-blue-600" />
        <MetricCard title="Menunggu GM" value={requestSummary.waitingGm} icon={FiUsers} tone="bg-amber-500" />
        <MetricCard title="Menunggu NOC Kirim" value={requestSummary.waitingNocShip} icon={FiTruck} tone="bg-purple-600" />
        <MetricCard title="Dalam Pengiriman" value={requestSummary.onDelivery} icon={FiTruck} tone="bg-emerald-500" />
        <MetricCard title="Selesai" value={requestSummary.done} icon={FiCheckCircle} tone="bg-green-600" />
        <MetricCard title="Total Site" value={sites.length} icon={FiMapPin} tone="bg-cyan-600" />
        <MetricCard title="Notif Belum Dibaca" value={unreadNotif} icon={FiBell} tone="bg-rose-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-black text-slate-800">Distribusi Status Request</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Realtime request pipeline</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 700 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#0f172a" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
          <h3 className="text-lg font-black text-slate-800">Distribusi Role User</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Kontrol hak akses</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={roleChartData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={3}>
                  {roleChartData.map((entry, index) => {
                    const colors = ['#0f172a', '#2563eb', '#16a34a', '#d97706', '#7c3aed'];
                    return <Cell key={`cell-${entry.name}`} fill={colors[index % colors.length]} />;
                  })}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-2">
            {roleChartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>{item.name}</span>
                <span>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-[2rem] shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-lg font-black text-slate-800">Aktivitas Request Terbaru</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {latestRequests.map((req) => (
              <div key={req.id} className="px-6 py-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-800">{req.project || `REQ-${req.id}`}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    {req.Site?.name || '-'} • {STATUS_LABELS[req.status] || req.status}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/requests')}
                  className="px-3 py-2 rounded-xl bg-slate-50 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100"
                >
                  Detail
                </button>
              </div>
            ))}
            {latestRequests.length === 0 && (
              <div className="px-6 py-8 text-xs font-black text-slate-400 uppercase tracking-widest text-center">
                Belum ada aktivitas request
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
          <h3 className="text-lg font-black text-slate-800">Kontrol Cepat Modul</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Akses pusat kendali</p>
          <div className="space-y-3">
            {moduleCards.map((module) => {
              const Icon = module.icon;
              return (
                <button
                  key={module.name}
                  onClick={() => navigate(module.path)}
                  className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-slate-200 bg-white transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className={clsx("w-10 h-10 rounded-xl text-white flex items-center justify-center bg-gradient-to-br", module.color)}>
                      <Icon size={18} />
                    </div>
                    <span className="text-sm font-black text-slate-700 group-hover:text-slate-900">{module.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Critical Alerts</p>
          <p className="text-3xl font-black text-red-600 mt-2">{alerts.filter((a) => a.priority === 'CRITICAL').length}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total User Sistem</p>
          <p className="text-3xl font-black text-slate-800 mt-2">{users.length}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Low Stock Alerts</p>
          <p className="text-3xl font-black text-amber-600 mt-2">{stats?.lowStockAlerts || 0}</p>
        </div>
      </div>

      {/* Server Resource Monitoring Section */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-black text-slate-800">Server Resource Monitoring</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              Backend system health & infrastructure status
            </p>
          </div>
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all"
          >
            <FiRefreshCw className={refreshing ? 'animate-spin' : ''} />
            REFRESH
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* OS & Basic Info */}
          <div className="space-y-4">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase">Operating System</span>
              <span className="text-lg font-black text-slate-800">{monitoring?.os || 'Windows'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase">Node.js Environment</span>
              <span className="text-lg font-black text-slate-800 capitalize">{monitoring?.node?.env || 'local'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-400 uppercase">Node.js Version</span>
              <span className="text-lg font-black text-slate-800">{monitoring?.node?.version || 'v18.0.0'}</span>
            </div>
          </div>

          {/* RAM & Disk Usage */}
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-slate-400 uppercase">RAM Usage</span>
                <span className="text-sm font-black text-slate-800">
                  {monitoring?.ram?.percent || 0}% • {monitoring?.ram?.used || 0}MB / {monitoring?.ram?.total || 0}MB
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500" 
                  style={{ width: `${monitoring?.ram?.percent || 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-slate-400 uppercase">Disk Usage (C:)</span>
                <span className="text-sm font-black text-slate-800">
                  {monitoring?.disk?.percent || 0}% • {monitoring?.disk?.used || 0}GB / {monitoring?.disk?.total || 0}GB
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-500" 
                  style={{ width: `${monitoring?.disk?.percent || 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Application Metrics */}
          <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">
              Application Metrics
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Requests (1h)</p>
                <p className="text-xl font-black text-slate-800">{monitoring?.metrics?.requests1h || 0}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Queue Jobs</p>
                <p className="text-xl font-black text-slate-800">{monitoring?.metrics?.queueJobs || 0}</p>
              </div>
            </div>
            <div className="pt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Last Updated</p>
              <p className="text-xs font-bold text-slate-600">
                {monitoring?.updatedAt ? new Date(monitoring.updatedAt).toLocaleTimeString('id-ID') : '-'}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-100">
          <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-2">Notes</p>
          <ul className="text-[11px] font-medium text-amber-700 space-y-1 list-disc ml-4">
            <li><strong>Windows/Node:</strong> CPU load metrics are simulated for Windows environment.</li>
            <li><strong>Network:</strong> App-level request count is based on audit log activity.</li>
            <li><strong>Refresh:</strong> Data is fetched on dashboard load and manual refresh.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProgrammerDashboard;
