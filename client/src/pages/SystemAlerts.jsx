import React, { useState, useEffect } from 'react';
import { 
  FiAlertTriangle, FiBell, FiSearch, FiFilter, 
  FiArrowRight, FiCheckCircle, FiInfo 
} from 'react-icons/fi';
import axios from 'axios';
import { clsx } from 'clsx';

const SystemAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showThresholdModal, setShowThresholdModal] = useState(false);
  const [thresholdForm, setThresholdForm] = useState({ minThreshold: 5, siteId: '' });
  const [sites, setSites] = useState([]);
  const [filterPriority, setFilterPriority] = useState('ALL');

  useEffect(() => {
    fetchAlerts();
    fetchSites();
  }, []);

  useEffect(() => {
    const handleUpdate = () => fetchAlerts();
    window.addEventListener('alerts_updated', handleUpdate);
    return () => window.removeEventListener('alerts_updated', handleUpdate);
  }, []);

  const fetchSites = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/inventory/sites', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSites(res.data.data);
    } catch (err) {
      console.error('Failed to fetch sites', err);
    }
  };

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

  const handleUpdateThreshold = async (e) => {
    e.preventDefault();
    try {
      // This endpoint needs to be handled by backend, assuming generic material update or specific threshold endpoint
      // For now, we might need to update all materials in a site? 
      // Or maybe the user wants to set a global threshold policy?
      // Based on UI "Ubah Threshold", it implies a general setting or per-site.
      // Let's assume it updates a global setting or we iterate. 
      // Actually, inventory has minThreshold per item. 
      // The user likely wants to mass-update or set a default.
      // Let's assume we update a policy setting.
      // Since backend might not have this specific "Update All Thresholds" endpoint, 
      // I'll simulate it or just show a success for the UI interaction if backend logic isn't there yet.
      // But better: Update the 'minThreshold' for all items in the selected site.
      
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/inventory/update-thresholds', thresholdForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Threshold berhasil diperbarui');
      setShowThresholdModal(false);
      fetchAlerts();
    } catch (err) {
      alert('Gagal memperbarui threshold (Endpoint mungkin belum tersedia)');
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterPriority === 'ALL') return true;
    if (filterPriority === 'RESOLVED') return alert.status === 'RESOLVED';
    return alert.priority === filterPriority;
  });

  const stats = {
    critical: alerts.filter(a => a.priority === 'CRITICAL').length,
    warning: alerts.filter(a => a.priority === 'WARNING').length,
    resolved: alerts.filter(a => a.status === 'RESOLVED').length
  };

  const handleRead = async (id) => {
    try {
      await axios.patch(`http://localhost:5000/api/inventory/alerts/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchAlerts();
    } catch (err) {
      alert('Gagal menandai alert');
    }
  };

  const handleResolve = async (id) => {
    try {
      await axios.patch(`http://localhost:5000/api/inventory/alerts/${id}/resolve`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchAlerts();
    } catch (err) {
      alert('Gagal resolve alert');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Alerts</h1>
          <p className="text-slate-500 mt-1 font-medium italic">Pemantauan otomatis stok kritis dan anomali sistem</p>
        </div>
        <div className="bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl border border-emerald-100 flex items-center gap-2 text-xs font-black uppercase tracking-widest">
          <FiCheckCircle /> System Healthy
        </div>
      </div>

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
                      <span className={clsx(
                        "text-[10px] font-black uppercase tracking-widest",
                        alert.priority === 'CRITICAL' ? "text-red-600" : "text-amber-600"
                      )}>
                        {alert.type} • {alert.priority}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        {new Date(alert.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 leading-tight">{alert.message}</h3>
                    <p className="text-sm font-medium text-slate-500">
                      Lokasi: <span className="text-slate-700 font-bold">{alert.Site?.name || alert.site}</span>
                    </p>
                    <p className="text-xs font-bold text-slate-400">
                      Status: {alert.status}
                    </p>
                    <div className="pt-4 flex gap-3">
                      <button
                        onClick={() => handleRead(alert.id)}
                        className="bg-white border border-slate-100 text-slate-600 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
                      >
                        Ignore
                      </button>
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className={clsx(
                        "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-md",
                        alert.priority === 'CRITICAL' ? "bg-sundaya-red hover:bg-red-700 shadow-red-100" : "bg-amber-500 hover:bg-amber-600 shadow-amber-100"
                      )}
                      >
                        Resolve Now
                      </button>
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
                <span className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-black">{stats.critical}</span>
              </button>
              <button 
                onClick={() => setFilterPriority('WARNING')}
                className={clsx(
                  "w-full flex justify-between items-center p-4 rounded-2xl border transition-all",
                  filterPriority === 'WARNING' ? "bg-amber-900/50 border-amber-500 ring-1 ring-amber-500" : "bg-white/5 border-white/5 hover:bg-white/10"
                )}
              >
                <span className="text-xs font-bold text-slate-400">Warnings</span>
                <span className="bg-amber-500 text-white px-3 py-1 rounded-lg text-xs font-black">{stats.warning}</span>
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

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm space-y-4">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
              <FiInfo className="text-sundaya-red" size={24} />
            </div>
            <h4 className="text-lg font-bold leading-tight">Threshold Konfigurasi</h4>
            <p className="text-slate-400 text-xs font-medium leading-relaxed">
              Peringatan stok akan muncul jika jumlah item di bawah batas minimum yang ditentukan di menu katalog.
            </p>
            <button 
              onClick={() => setShowThresholdModal(true)}
              className="w-full py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-black uppercase tracking-widest transition-all text-slate-600"
            >
              Ubah Threshold
            </button>
          </div>
        </div>
      </div>

      {/* Threshold Modal */}
      {showThresholdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-8 pb-0">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Set Threshold</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Konfigurasi Batas Minimum Stok</p>
            </div>
            <form onSubmit={handleUpdateThreshold} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Pilih Site Gudang</label>
                <select 
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                  value={thresholdForm.siteId}
                  onChange={(e) => setThresholdForm({...thresholdForm, siteId: e.target.value})}
                  required
                >
                  <option value="">- Pilih Site -</option>
                  <option value="ALL">Semua Site (Global)</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Batas Minimum (Unit)</label>
                <input 
                  type="number" 
                  min="1"
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                  value={thresholdForm.minThreshold}
                  onChange={(e) => setThresholdForm({...thresholdForm, minThreshold: parseInt(e.target.value)})}
                  required
                />
                <p className="text-[10px] text-slate-400 mt-2 ml-1 italic">*Akan mengupdate threshold default untuk semua item di site yang dipilih.</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowThresholdModal(false)}
                  className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs bg-sundaya-red hover:bg-red-700 text-white shadow-lg shadow-red-100 transition-all"
                >
                  Simpan
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
