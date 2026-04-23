import React, { useState, useEffect } from 'react';
import { 
  FiPackage, FiTruck, FiUsers, FiClock, FiActivity, FiArrowUpRight, FiArrowDownLeft,
  FiPlus, FiXCircle, FiMapPin, FiCheckCircle, FiShield
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { clsx } from 'clsx';
import { toast } from 'react-hot-toast';

const SiteDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [requests, setRequests] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [sites, setSites] = useState([]);
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

  useEffect(() => {
    fetchData();
  }, []);

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

      const [reqRes, matRes, siteRes] = await Promise.all([
        axios.get('http://localhost:5000/api/requests', { headers }),
        axios.get('http://localhost:5000/api/inventory/materials', { headers }),
        axios.get('http://localhost:5000/api/inventory/sites', { headers })
      ]);

      const allRequests = reqRes.data.data;
      setRequests(allRequests.slice(0, 5)); // Just recent 5
      setMaterials(matRes.data.data);
      setSites(siteRes.data.data);

      // Calculate stats
      setStats({
        totalRequests: allRequests.length,
        pendingShipment: allRequests.filter(r => r.status === 'APPROVED_READY_TO_SHIP' || r.status === 'ON_DELIVERY').length,
        completed: allRequests.filter(r => r.status === 'FULFILLED').length
      });

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
      case 'REJECTED': return 'bg-red-50 text-red-600 border-red-100';
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
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight capitalize">
            {user?.site || 'Global'} Dashboard
          </h1>
          <p className="text-slate-500 mt-1 font-medium italic">Logistics operations monitoring for {user?.site || 'Headquarters'}</p>
        </div>
        <div className="flex gap-3">
          <div className="flex flex-col gap-2">
            <button
                onClick={handleDownloadReport}
                className="px-5 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-sundaya-red transition-all shadow-sm flex items-center gap-2 w-full justify-center"
              >
                Download History
              </button>
            <div className="flex gap-2">
              <button
                onClick={() => handleDownloadStatusReport('RECEIVED')}
                className="px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-100 transition-all flex items-center gap-1"
              >
                <FiCheckCircle size={12} /> Diterima
              </button>
              <button
                onClick={() => handleDownloadStatusReport('PENDING')}
                className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-100 transition-all flex items-center gap-1"
              >
                <FiTruck size={12} /> Belum Diterima
              </button>
            </div>
          </div>
          {user?.role === 'OM' && (
            <button
              onClick={() => navigate('/requests?openNew=1')}
              className="px-6 py-4 bg-red-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-2xl shadow-red-200 flex items-center gap-3 border-2 border-red-500 active:scale-95"
            >
              <FiPlus size={20} className="stroke-[3]" />
              New Material Request
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Requests', value: stats.totalRequests, icon: <FiPackage />, color: 'text-sundaya-red', bg: 'bg-red-50' },
          { label: 'In Progress', value: stats.pendingShipment, icon: <FiTruck />, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Completed', value: stats.completed, icon: <FiCheckCircle />, color: 'text-emerald-600', bg: 'bg-emerald-50' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-3xl font-black text-slate-800">{stat.value}</h3>
            </div>
            <div className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110", stat.bg, stat.color)}>
              {stat.icon}
            </div>
          </div>
        ))}
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
