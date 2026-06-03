import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { clsx } from 'clsx';
import { toast } from 'react-hot-toast';
import socket from '../utils/socket';
import { 
  FiPackage, FiTruck, FiUsers, FiClock, FiActivity, FiArrowUpRight, FiArrowDownLeft,
  FiPlus, FiXCircle, FiMapPin, FiCheckCircle, FiShield, FiMessageSquare, FiAlertCircle, FiChevronRight
} from 'react-icons/fi';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const StatCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between group hover:border-sundaya-red/30 transition-all duration-300">
    <div className="flex items-center justify-between mb-4">
      <div className={clsx("p-3 rounded-2xl transition-transform group-hover:scale-110 duration-300", color)}>
        <Icon size={24} className="text-white" />
      </div>
      {trend && (
        <span className="text-[10px] font-black px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">
          {trend}
        </span>
      )}
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-3xl font-black text-slate-800">{value}</h3>
    </div>
  </div>
);

const SiteDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [requests, setRequests] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [sites, setSites] = useState([]);
  const [executiveNotes, setExecutiveNotes] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [newRequest, setNewRequest] = useState({
    siteId: '',
    items: [],
    documentNo: '',
    destination: '',
    project: '',
    description: '',
    urgency: 'HIGH',
    deadline: ''
  });
  const [currentItem, setCurrentItem] = useState({ materialId: '', quantity: 1 });
  const [itemsLocked, setItemsLocked] = useState(false);

  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingShipment: 0,
    completed: 0
  });
  const [alerts, setAlerts] = useState([]);
  const [distributionData, setDistributionData] = useState([]);

  useEffect(() => {
    fetchData();

    // Listen for real-time executive notes
    socket.on('new_executive_note', (note) => {
      // Check if note is targeted to this user's role or ALL
      if (note.targetRole === 'ALL' || note.targetRole === user?.role) {
        setExecutiveNotes(prev => [note, ...prev].slice(0, 10));
        toast.success(`Arahan Baru dari GM: ${note.message.substring(0, 50)}...`, {
          icon: '📢',
          duration: 5000
        });
      }
    });

    return () => {
      socket.off('new_executive_note');
    };
  }, [user?.role]);

  useEffect(() => {
    if (!showModal || user?.role !== 'OM' || newRequest.siteId) return;
    const omSites = sites.filter((site) => {
      const name = String(site?.name || '').toLowerCase();
      return name.includes('papua') || name.includes('maluku');
    });
    if (omSites.length > 0) {
      setNewRequest((prev) => ({ ...prev, siteId: String(omSites[0].id) }));
    }
  }, [showModal, user?.role, newRequest.siteId, sites]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [reqRes, matRes, siteRes, notesRes, statsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/requests', { headers }),
        axios.get('http://localhost:5000/api/inventory/materials', { headers }),
        axios.get('http://localhost:5000/api/inventory/sites', { headers }),
        axios.get('http://localhost:5000/api/reports/notes', { headers }),
        axios.get('http://localhost:5000/api/reports/stats', { headers })
      ]);

      const allRequests = reqRes.data.data;
      setRequests(allRequests.slice(0, 5));
      setMaterials(matRes.data.data);
      setSites(siteRes.data.data);
      setExecutiveNotes(notesRes.data.data || []);
      
      const globalStats = statsRes.data.data;
      setAlerts(globalStats.alerts || []);
      setDistributionData(globalStats.distribution || []);

      setStats({
        totalRequests: allRequests.length,
        pendingShipment: allRequests.filter(r => /* r.status === 'APPROVED_READY_TO_SHIP' || */ r.status === 'ON_DELIVERY').length,
        completed: allRequests.filter(r => r.status === 'FULFILLED').length
      });

      // Status Distribution Chart
      const dist = allRequests.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {});
      setChartData(Object.keys(dist).map(status => ({
        name: status.replace(/_/g, ' '),
        value: dist[status]
      })));

      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
      toast.error('Failed to load dashboard data');
      setLoading(false);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (newRequest.items.length === 0) {
      toast.error('Tambahkan minimal satu item material');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const date = new Date();
      const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const autoDocumentNo = newRequest.documentNo?.trim() || `MR-${datePart}-${randomPart}`;
      const payload = {
        ...newRequest,
        siteId: parseInt(newRequest.siteId),
        documentNo: autoDocumentNo,
        project: newRequest.project,
        destination: newRequest.destination,
        description: newRequest.description,
        deadline: newRequest.deadline || '',
        urgency: newRequest.urgency || 'HIGH',
        items: newRequest.items.map((item) => ({
          materialId: parseInt(item.materialId),
          quantity: parseInt(item.quantity),
          unit: item.unit || null
        }))
      };
      
      await axios.post('http://localhost:5000/api/requests', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Request created successfully');
      setShowModal(false);
      setNewRequest({ siteId: '', items: [], documentNo: '', destination: '', project: '', description: '', urgency: 'HIGH', deadline: '' });
      setCurrentItem({ materialId: '', quantity: 1 });
      setItemsLocked(false);
      fetchData();
    } catch (err) {
      console.error('Error creating request:', err.response?.data || err.message);
      const errorMessage = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Failed to create request';
      toast.error(errorMessage);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'FULFILLED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'REJECTED_BY_NOC':
      case 'REJECTED_BY_GM':
        return 'bg-red-50 text-red-600 border-red-100';
      case 'PENDING': return 'bg-blue-50 text-blue-600 border-blue-100';
      default: return 'bg-amber-50 text-amber-600 border-amber-100';
    }
  };

  const handleAddItem = () => {
    if (itemsLocked) return;
    const quantity = Number(currentItem.quantity);
    if (!currentItem.materialId || !Number.isFinite(quantity) || quantity <= 0) return;
    const selected = materials.find((m) => m.id.toString() === currentItem.materialId);
    setNewRequest((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          materialId: currentItem.materialId,
          quantity,
          unit: selected?.unit || null,
          name: selected?.name || ''
        }
      ]
    }));
    setCurrentItem({ materialId: '', quantity: 1 });
  };

  const handleRemoveItem = (index) => {
    setNewRequest((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadStatusReport = async (statusType) => {
    const toastId = toast.loading(`Generating ${statusType === 'RECEIVED' ? 'Received' : 'Pending'} items report...`);
    try {
      const token = localStorage.getItem('token');
      const response = await axios({
        url: 'http://localhost:5000/api/reports/request-status-pdf',
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`
        },
        data: { statusType },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${statusType}_Items_Report_${new Date().getTime()}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      toast.success('Download started!', { id: toastId });
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download report.', { id: toastId });
    }
  };

  const handleDownloadReport = async () => {
    const toastId = toast.loading('Generating report...');
    try {
      const token = localStorage.getItem('token');
      
      const response = await axios({
        url: 'http://localhost:5000/api/reports/recent-movements-pdf',
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob' // Memaksa axios menerima data mentah (PDF)
      });

      // Membuat URL blob dari data yang diterima
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Recent_Movements_${new Date().getTime()}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Bersihkan memori
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      toast.success('Download started!', { id: toastId });
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download report. Check server logs.', { id: toastId });
    }
  };

  const requestableSites = user?.role === 'OM'
    ? sites.filter((site) => {
      const name = String(site?.name || '').toLowerCase();
      return name.includes('papua') || name.includes('maluku');
    })
    : sites;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            {user?.role === 'NOC' ? 'NOC Operations Monitor' : `${user?.site || 'Global'} Dashboard`}
          </h1>
          <p className="text-slate-500 font-medium">Monitoring real-time request dan inventaris.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            className="p-3 rounded-2xl border border-slate-200 text-slate-600 hover:bg-white transition-all shadow-sm"
          >
            <FiActivity size={20} />
          </button>
          {user?.role === 'OM' && (
            <button 
              onClick={() => navigate('/requests?openNew=1')}
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
              <FiPlus size={18} />
              <span>Request Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Requests" 
          value={stats.totalRequests} 
          icon={FiActivity} 
          color="bg-blue-500"
        />
        <StatCard 
          title="Pending Shipment" 
          value={stats.pendingShipment} 
          icon={FiTruck} 
          color="bg-amber-500"
          trend={`${Math.round((stats.pendingShipment / (stats.totalRequests || 1)) * 100)}%`}
        />
        <StatCard 
          title="Completed" 
          value={stats.completed} 
          icon={FiCheckCircle} 
          color="bg-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Status Distribution Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-800">Distribusi Status</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Status request saat ini</p>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl">
              <FiShield className="text-slate-400" size={20} />
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#0f172a" radius={[10, 10, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions / Alerts */}
        <div className="space-y-6 lg:col-span-1">
          {/* Monitoring Distribusi Material */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800">Distribusi Lokasi</h3>
              <FiMapPin className="text-slate-400" size={20} />
            </div>
            <div className="space-y-6">
              {distributionData.length > 0 ? distributionData.map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-xs font-black uppercase tracking-wider">
                    <span className="text-slate-600">{item.site}</span>
                    <span className="text-slate-400">{item.totalSent} Terkirim</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-slate-900 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, (item.onDelivery / (item.totalSent || 1)) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                    <span>Progress Pengiriman</span>
                    <span>{item.onDelivery} On Delivery</span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-4 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  Data distribusi belum tersedia
                </div>
              )}
            </div>
          </div>

          {user?.role !== 'OM' && (
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-800">Peringatan Stok</h3>
                <FiAlertCircle className="text-sundaya-red" size={20} />
              </div>
              <div className="space-y-4">
                {alerts.length > 0 ? alerts.slice(0, 3).map((alert, idx) => (
                  <div key={idx} className="flex items-start space-x-3 p-3 rounded-2xl bg-red-50/50 border border-red-50">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    <div>
                      <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-tight">
                        {alert.message}
                      </p>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    Tidak ada peringatan stok
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
            <h3 className="text-xl font-black text-slate-800 mb-6">Laporan Cepat</h3>
            <div className="space-y-4">
              <button 
                onClick={handleDownloadReport}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <FiPackage className="text-blue-500" size={18} />
                  </div>
                  <span className="text-sm font-bold text-slate-700">Pergerakan Stok</span>
                </div>
                <FiChevronRight className="text-slate-300 group-hover:text-slate-500" size={18} />
              </button>
              <button 
                onClick={() => handleDownloadStatusReport('PENDING')}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <FiClock className="text-amber-500" size={18} />
                  </div>
                  <span className="text-sm font-bold text-slate-700">Pending Items</span>
                </div>
                <FiChevronRight className="text-slate-300 group-hover:text-slate-500" size={18} />
              </button>
              <button 
                onClick={() => handleDownloadStatusReport('RECEIVED')}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-all group"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    <FiCheckCircle className="text-emerald-500" size={18} />
                  </div>
                  <span className="text-sm font-bold text-slate-700">Received Items</span>
                </div>
                <FiChevronRight className="text-slate-300 group-hover:text-slate-500" size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-50 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-sundaya-red shadow-sm border border-slate-100">
              <FiActivity />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Recent Movements</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Request ID</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Material Item</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Project</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-8 py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                    Loading transactions...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-8 py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                    No recent transactions found
                  </td>
                </tr>
              ) : requests.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <span className="text-sm font-bold text-slate-400">#REQ-{req.id.toString().padStart(4, '0')}</span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-slate-700">{req.items?.[0]?.Material?.name || 'N/A'}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <FiMapPin className="text-sundaya-red" size={14} />
                      {req.project}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-bold text-slate-700">
                      {(req.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0)} Units
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <span className={clsx(
                      "px-3 py-1 border rounded-full text-[10px] font-black uppercase tracking-widest",
                      getStatusStyle(req.status)
                    )}>
                      {req.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                      <FiClock size={14} />
                      {new Date(req.createdAt).toLocaleDateString('id-ID')}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Executive Notes Section */}
      {executiveNotes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 px-1">
            <FiMessageSquare className="text-sundaya-red" />
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
                      note.priority === 'URGENT' ? "bg-red-500 animate-pulse" : "bg-sundaya-red"
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
                  <span className="text-[10px] font-black uppercase">Dari: {note.sender?.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Banner */}
      <div className="bg-slate-900 p-8 rounded-[2rem] shadow-lg shadow-slate-200 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-lg font-black mb-2">Butuh Bantuan?</h3>
          <p className="text-slate-400 text-xs font-medium mb-6 leading-relaxed">
            Hubungi tim IT jika Anda mengalami kendala pada sistem inventaris.
          </p>
          <button className="px-6 py-3 bg-white text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all">
            Buka Tiket
          </button>
        </div>
        <FiShield size={120} className="absolute -bottom-10 -right-10 text-white/5 rotate-12" />
      </div>

      {/* Modal Buat Request */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">New Request</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Material Request Form</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all">
                <FiXCircle className="text-slate-300 hover:text-red-500" size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateRequest} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Site Location</label>
                  <select 
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                    value={newRequest.siteId}
                    onChange={(e) => setNewRequest({...newRequest, siteId: e.target.value})}
                    required
                  >
                    {requestableSites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Project Name</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                    placeholder="e.g. Papua Solar Phase 1"
                    value={newRequest.project}
                    onChange={(e) => setNewRequest({...newRequest, project: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Tujuan Pengiriman</label>
                <input
                  type="text"
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                  placeholder="Contoh: Site Papua"
                  value={newRequest.destination}
                  onChange={(e) => setNewRequest({ ...newRequest, destination: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Deadline Kebutuhan</label>
                <input
                  type="date"
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                  value={newRequest.deadline}
                  onChange={(e) => setNewRequest({ ...newRequest, deadline: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Urgensi Kebutuhan</label>
                <div className="flex gap-3">
                  {['HIGH', 'CRITICAL'].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setNewRequest({ ...newRequest, urgency: level })}
                      className={clsx(
                        "flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border-2 transition-all",
                        newRequest.urgency === level
                          ? (level === 'CRITICAL'
                            ? "bg-red-50 border-red-500 text-red-600"
                            : level === 'HIGH'
                              ? "bg-orange-50 border-orange-500 text-orange-600"
                              : "bg-blue-50 border-blue-500 text-blue-600")
                          : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
                      )}
                    >
                      {level === 'HIGH' ? 'Penting' : 'Sangat Penting'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Material List</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400">{newRequest.items.length} Items Added</span>
                    <button
                      type="button"
                      onClick={() => setItemsLocked((prev) => !prev)}
                      className={clsx(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
                        itemsLocked ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                      )}
                    >
                      {itemsLocked ? 'Edit Items' : 'Done'}
                    </button>
                  </div>
                </div>

                {newRequest.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-700">
                        {item.name || materials.find((m) => m.id.toString() === item.materialId)?.name || '-'}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400">Qty: {item.quantity} {item.unit || 'Unit'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={itemsLocked}
                      className={clsx("p-2", itemsLocked ? "text-slate-300 cursor-not-allowed" : "text-red-400 hover:text-red-600")}
                    >
                      <FiXCircle />
                    </button>
                  </div>
                ))}

                <div className={clsx("grid grid-cols-3 gap-3 pt-2 border-t border-slate-200", itemsLocked && "opacity-50 pointer-events-none")}>
                  <div className="col-span-2">
                    <select
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:border-sundaya-red"
                      value={currentItem.materialId}
                      onChange={(e) => setCurrentItem({ ...currentItem, materialId: e.target.value })}
                    >
                      <option value="">Select Material</option>
                      {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:border-sundaya-red"
                      value={currentItem.quantity}
                      onChange={(e) => {
                        const parsed = parseInt(e.target.value, 10);
                        setCurrentItem({ ...currentItem, quantity: Number.isNaN(parsed) ? '' : parsed });
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddItem}
                      disabled={!currentItem.materialId}
                      className="bg-sundaya-red text-white p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiPlus />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Description / Notes</label>
                <textarea 
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700 min-h-[100px]"
                  placeholder="Additional information..."
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({...newRequest, description: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                disabled={newRequest.items.length === 0}
                className="w-full py-5 bg-sundaya-red text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-100 hover:bg-red-700 active:scale-[0.98] transition-all"
              >
                Submit Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteDashboard;
