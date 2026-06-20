import React, { useState, useEffect } from 'react';
import { 
  FiAlertTriangle, FiBell, FiCheckCircle, FiInfo, FiEye, FiClock, FiCheck,
  FiX
} from 'react-icons/fi';
import axios from 'axios';
import { clsx } from 'clsx';

const SystemAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({
    activeAlerts: 0,
    criticalAlerts: 0,
    warningAlerts: 0,
    resolvedToday: 0,
    escalatedAlerts: 0
  });
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveForm, setResolveForm] = useState({ reason: '', notes: '' });

  useEffect(() => {
    fetchAlerts();
    fetchAlertStats();
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      fetchAlerts();
      fetchAlertStats();
    };
    window.addEventListener('alerts_updated', handleUpdate);
    return () => window.removeEventListener('alerts_updated', handleUpdate);
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/inventory/alerts', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAlerts(res.data.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch alerts', err);
      setLoading(false);
    }
  };

  const fetchAlertStats = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/inventory/alerts/stats', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStats(res.data.data);
    } catch (err) {
      console.error('Failed to fetch alert stats', err);
    }
  };

  const fetchAlertDetail = async (alertId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/inventory/alerts/${alertId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const timelineRes = await axios.get(`http://localhost:5000/api/inventory/alerts/${alertId}/timeline`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSelectedAlert({ ...res.data.data, timeline: timelineRes.data.data });
    } catch (err) {
      console.error('Failed to fetch alert detail', err);
    }
  };

  const handleViewAlert = async (alert) => {
    await fetchAlertDetail(alert.id);
    setShowDetailModal(true);
  };

  const handleResolveAlert = (alert) => {
    setSelectedAlert(alert);
    setResolveForm({ reason: '', notes: '' });
    setShowResolveModal(true);
  };

  const submitResolve = async (e) => {
    e.preventDefault();
    if (!resolveForm.reason) {
      alert('Pilih alasan terlebih dahulu');
      return;
    }
    if (!resolveForm.notes.trim()) {
      alert('Catatan wajib diisi');
      return;
    }
    try {
      await axios.patch(
        `http://localhost:5000/api/inventory/alerts/${selectedAlert.id}/resolve-with-reason`,
        resolveForm,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      alert('Alert berhasil diresolusi');
      setShowResolveModal(false);
      fetchAlerts();
      fetchAlertStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal meresolusi alert');
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterPriority === 'ALL') return true;
    if (filterPriority === 'RESOLVED') return alert.status === 'RESOLVED';
    if (filterPriority === 'ACTIVE') return alert.status !== 'RESOLVED';
    return alert.priority === filterPriority && alert.status !== 'RESOLVED';
  });

  const healthy = stats.activeAlerts === 0;

  const formatDate = (date) => {
    return new Date(date).toLocaleString('id-ID');
  };

  const getSeverityBadge = (priority) => {
    if (priority === 'CRITICAL') {
      return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500 text-white">CRITICAL</span>;
    }
    return <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-500 text-white">WARNING</span>;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Alerts</h1>
          <p className="text-slate-500 mt-1 font-medium italic">Pemantauan otomatis stok kritis dan anomali sistem</p>
        </div>
        <div className={clsx(
          "px-6 py-3 rounded-2xl border flex items-center gap-2 text-xs font-black uppercase tracking-widest",
          healthy ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
        )}>
          <FiCheckCircle /> {healthy ? 'System Healthy' : 'Need Attention'}
        </div>
      </div>

      {/* Dashboard Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Alerts</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{stats.activeAlerts}</p>
        </div>
        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 shadow-sm">
          <p className="text-xs font-bold text-red-600 uppercase tracking-widest">Critical</p>
          <p className="text-3xl font-extrabold text-red-700 mt-2">{stats.criticalAlerts}</p>
        </div>
        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 shadow-sm">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-widest">Warning</p>
          <p className="text-3xl font-extrabold text-amber-700 mt-2">{stats.warningAlerts}</p>
        </div>
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Resolved Today</p>
          <p className="text-3xl font-extrabold text-emerald-700 mt-2">{stats.resolvedToday}</p>
        </div>
        <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 shadow-sm">
          <p className="text-xs font-bold text-purple-600 uppercase tracking-widest">Escalated</p>
          <p className="text-3xl font-extrabold text-purple-700 mt-2">{stats.escalatedAlerts}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {loading ? (
            <div className="p-20 text-center bg-white rounded-[2.5rem] border border-slate-50 shadow-sm">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-sundaya-red rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Menganalisis Parameter Sistem...</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div key={alert.id} className={clsx(
                "p-8 rounded-[2.5rem] border shadow-sm transition-all hover:shadow-xl group",
                alert.priority === 'CRITICAL' ? "bg-red-50/30 border-red-100" : "bg-amber-50/30 border-amber-100"
              )}>
                <div className="flex gap-6">
                  <div className={clsx(
                    "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:scale-110",
                    alert.priority === 'CRITICAL' ? "bg-sundaya-red text-white" : "bg-amber-500 text-white"
                  )}>
                    <FiAlertTriangle size={24} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(alert.priority)}
                        <span className={clsx(
                          "text-[10px] font-black uppercase tracking-widest",
                          alert.status === 'RESOLVED' ? "text-emerald-600" : (alert.status === 'READ' ? "text-slate-600" : "text-slate-400")
                        )}>
                          {alert.status}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-400">
                        {new Date(alert.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 leading-tight">{alert.message}</h3>
                    <p className="text-sm font-medium text-slate-500">
                      Lokasi: <span className="text-slate-700 font-bold">{alert.Site?.name || 'Unknown Site'}</span>
                    </p>
                    <p className="text-xs font-bold text-slate-400">
                      Last Trigger: {formatDate(alert.lastTriggeredAt || alert.updatedAt || alert.createdAt)}
                    </p>
                    <div className="pt-4 flex gap-3">
                      <button
                        onClick={() => handleViewAlert(alert)}
                        className="flex items-center gap-2 bg-white border border-slate-100 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                      >
                        <FiEye size={12} /> Detail
                      </button>
                      {alert.status !== 'RESOLVED' && (
                        <button
                          onClick={() => handleResolveAlert(alert)}
                          className={clsx(
                            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-md",
                            alert.priority === 'CRITICAL' ? "bg-sundaya-red hover:bg-red-700 shadow-red-100" : "bg-amber-500 hover:bg-amber-600 shadow-amber-100"
                          )}
                        >
                          <FiCheck size={12} /> Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <FiBell className="text-sundaya-red" />
              </div>
              <h4 className="text-sm font-black uppercase tracking-widest">Notification Stats</h4>
            </div>
            <div className="space-y-4">
              <button 
                onClick={() => setFilterPriority('CRITICAL')}
                className={clsx(
                  "w-full flex justify-between items-center p-4 rounded-2xl border transition-all",
                  filterPriority === 'CRITICAL' ? "bg-red-900/50 border-red-500 ring-1 ring-red-500" : "bg-white/5 border-white/5 hover:bg-white/10"
                )}
              >
                <span className="text-xs font-bold text-slate-400">Critical Alerts</span>
                <span className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-black">{stats.criticalAlerts}</span>
              </button>
              <button 
                onClick={() => setFilterPriority('WARNING')}
                className={clsx(
                  "w-full flex justify-between items-center p-4 rounded-2xl border transition-all",
                  filterPriority === 'WARNING' ? "bg-amber-900/50 border-amber-500 ring-1 ring-amber-500" : "bg-white/5 border-white/5 hover:bg-white/10"
                )}
              >
                <span className="text-xs font-bold text-slate-400">Warnings</span>
                <span className="bg-amber-500 text-white px-3 py-1 rounded-lg text-xs font-black">{stats.warningAlerts}</span>
              </button>
              <button 
                onClick={() => setFilterPriority('ACTIVE')}
                className={clsx(
                  "w-full flex justify-between items-center p-4 rounded-2xl border transition-all",
                  filterPriority === 'ACTIVE' ? "bg-slate-700 border-slate-500" : "bg-white/5 border-white/5 hover:bg-white/10"
                )}
              >
                <span className="text-xs font-bold text-slate-400">Active Alerts</span>
                <span className="bg-indigo-500 text-white px-3 py-1 rounded-lg text-xs font-black">{stats.activeAlerts}</span>
              </button>
              <button 
                onClick={() => setFilterPriority('ALL')}
                className={clsx(
                  "w-full flex justify-between items-center p-4 rounded-2xl border transition-all",
                  filterPriority === 'ALL' ? "bg-slate-700 border-slate-500" : "bg-white/5 border-white/5 hover:bg-white/10"
                )}
              >
                <span className="text-xs font-bold text-slate-400">Show All</span>
                <span className="bg-slate-500 text-white px-3 py-1 rounded-lg text-xs font-black">{alerts.length}</span>
              </button>
            </div>
          </div>


        </div>
      </div>

      {/* Alert Detail Modal */}
      {showDetailModal && selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
            <div className="p-8 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Alert Detail</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">ID: {selectedAlert.id}</p>
              </div>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="px-8 pb-8">
              {/* Alert Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Material Information</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-bold text-slate-500">Item Name</p>
                      <p className="font-bold text-slate-900">{selectedAlert.Material?.name || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500">Category</p>
                      <p className="font-bold text-slate-700">{selectedAlert.Material?.category || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500">Site</p>
                      <p className="font-bold text-slate-700">{selectedAlert.Site?.name || 'Unknown'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Stock Information</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-bold text-slate-500">Current Stock</p>
                      <p className="font-bold text-slate-900">{selectedAlert.stock}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">Warning Threshold</p>
                      <p className="font-bold text-slate-700">{selectedAlert.warningThreshold || selectedAlert.minThreshold || 20}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-red-500 uppercase tracking-widest">Critical Threshold</p>
                      <p className="font-bold text-slate-700">{selectedAlert.criticalThreshold || selectedAlert.minThreshold || 10}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500">Stock Deficit</p>
                      <p className="font-bold text-red-600">{selectedAlert.shortage}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500">Severity</p>
                      <div className="mt-1">{getSeverityBadge(selectedAlert.priority)}</div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500">Status</p>
                      <p className="font-bold text-slate-700">{selectedAlert.status}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="mb-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Alert Timeline</h4>
                <div className="space-y-4">
                  {(selectedAlert.timeline || []).map((entry, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-4 h-4 rounded-full bg-slate-300" />
                        {idx < (selectedAlert.timeline || []).length - 1 && (
                          <div className="w-0.5 flex-1 bg-slate-200" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-slate-900">{entry.action}</p>
                          <span className="text-xs text-slate-500"><FiClock size={10} /> {formatDate(entry.timestamp)}</span>
                        </div>
                        {entry.user && <p className="text-xs text-slate-600 mb-1">By: {entry.user.username}</p>}
                        {entry.notes && <p className="text-sm text-slate-700">{entry.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={() => setShowDetailModal(false)}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-8 pb-0">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Resolve Alert</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">ID: {selectedAlert.id}</p>
            </div>
            <form onSubmit={submitResolve} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Alasan</label>
                <select 
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                  value={resolveForm.reason}
                  onChange={(e) => setResolveForm({...resolveForm, reason: e.target.value})}
                  required
                >
                  <option value="">- Pilih Alasan -</option>
                  <option value="STOCK_AVAILABLE">Stok sudah tersedia</option>
                  <option value="THRESHOLD_UPDATED">Threshold diperbarui</option>
                  <option value="FALSE_ALERT">False Alert</option>
                  <option value="OTHER">Lainnya</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Catatan (wajib)</label>
                <textarea
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700 resize-none"
                  rows={3}
                  value={resolveForm.notes}
                  onChange={(e) => setResolveForm({...resolveForm, notes: e.target.value})}
                  placeholder="Masukkan catatan..."
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowResolveModal(false)}
                  className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs bg-sundaya-red hover:bg-red-700 text-white shadow-lg shadow-red-100 transition-all"
                >
                  Resolve
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemAlerts;
