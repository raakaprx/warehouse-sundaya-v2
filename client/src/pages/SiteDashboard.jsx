import React, { useState, useEffect } from 'react';
import { 
  FiPackage, FiTruck, FiUsers, FiClock, FiActivity, FiArrowUpRight, FiArrowDownLeft,
  FiPlus, FiXCircle, FiMapPin, FiCheckCircle, FiShield
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { clsx } from 'clsx';
import { toast } from 'react-hot-toast';

const SiteDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [requests, setRequests] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [sites, setSites] = useState([]);
  const [newRequest, setNewRequest] = useState({
    siteId: '',
    materialId: '',
    quantity: 1,
    project: '',
    description: ''
  });

  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingShipment: 0,
    completed: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

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
    try {
      const token = localStorage.getItem('token');
      const payload = {
        siteId: parseInt(newRequest.siteId),
        project: newRequest.project,
        description: newRequest.description,
        urgency: 'NORMAL',
        items: [
          {
            materialId: parseInt(newRequest.materialId),
            quantity: parseInt(newRequest.quantity)
          }
        ]
      };
      
      await axios.post('http://localhost:5000/api/requests', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Request created successfully');
      setShowModal(false);
      setNewRequest({ siteId: '', materialId: '', quantity: 1, project: '', description: '' });
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
          <button className="px-5 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-sundaya-red transition-all shadow-sm">
            Download Report
          </button>
          {user?.role === 'OM' && (
            <button 
              onClick={() => setShowModal(true)}
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
                    <p className="text-sm font-bold text-slate-700">{req.Material?.name || 'N/A'}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                      <FiMapPin className="text-sundaya-red" size={14} />
                      {req.project}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-bold text-slate-700">{req.quantity} Units</span>
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
                    <option value="">Select Site</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Material</label>
                  <select 
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                    value={newRequest.materialId}
                    onChange={(e) => setNewRequest({...newRequest, materialId: e.target.value})}
                    required
                  >
                    <option value="">Select Material</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Quantity</label>
                  <input 
                    type="number" 
                    min="1"
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                    value={newRequest.quantity}
                    onChange={(e) => setNewRequest({...newRequest, quantity: parseInt(e.target.value)})}
                    required
                  />
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
