import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { FiClipboard, FiPlus, FiMapPin, FiPackage } from 'react-icons/fi';
import { clsx } from 'clsx';
import { toast } from 'react-hot-toast';

const InventoryUsage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [sites, setSites] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    materialId: '',
    siteId: '',
    quantity: 1,
    project: '',
    reason: ''
  });

  const isOm = user?.role === 'OM';

  const getSiteBadge = (siteName) => {
    const lower = String(siteName || '').toLowerCase();
    if (lower.includes('papua')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (lower.includes('maluku')) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  const allowedSites = useMemo(() => {
    if (!isOm) return sites;
    return sites.filter((site) => {
      const lower = String(site?.name || '').toLowerCase();
      return lower.includes('papua') || lower.includes('maluku');
    });
  }, [isOm, sites]);

  const fetchMetadata = async () => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    const [matRes, siteRes] = await Promise.all([
      axios.get('http://localhost:5000/api/inventory/materials', { headers }),
      axios.get('http://localhost:5000/api/inventory/sites', { headers })
    ]);
    setMaterials(matRes.data?.data || []);
    setSites(siteRes.data?.data || []);
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/inventory-usage', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(res.data?.data || []);
    } catch (err) {
      toast.error('Gagal memuat history pemakaian');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchMetadata().catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openForm') !== '1') return;
    const materialId = params.get('materialId') || '';
    const siteId = params.get('siteId') || '';
    setShowModal(true);
    setForm((prev) => ({
      ...prev,
      materialId,
      siteId: siteId || prev.siteId
    }));
  }, [location.search]);

  useEffect(() => {
    if (!showModal || !isOm) return;
    if (!form.siteId) return;
    const stillAllowed = allowedSites.some((site) => String(site.id) === String(form.siteId));
    if (!stillAllowed) {
      setForm((prev) => ({
        ...prev,
        siteId: allowedSites.length > 0 ? String(allowedSites[0].id) : ''
      }));
    }
  }, [showModal, isOm, form.siteId, allowedSites]);

  useEffect(() => {
    if (!showModal) return;
    if (!form.siteId && allowedSites.length > 0) {
      setForm((prev) => ({ ...prev, siteId: String(allowedSites[0].id) }));
    }
  }, [showModal, allowedSites, form.siteId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isOm && allowedSites.length === 0) {
        toast.error('Site OM tidak ditemukan. Hubungi admin untuk konfigurasi akun.');
        return;
      }

      const selectedSiteId = isOm && allowedSites.length === 1
        ? Number(allowedSites[0].id)
        : Number(form.siteId);

      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/inventory-usage', {
        materialId: Number(form.materialId),
        siteId: selectedSiteId,
        quantity: Number(form.quantity),
        project: form.project,
        reason: form.reason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Pemakaian barang berhasil dicatat');
      setShowModal(false);
      setForm({ materialId: '', siteId: '', quantity: 1, project: '', reason: '' });
      fetchHistory();
      window.dispatchEvent(new Event('inventory_updated'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan pemakaian barang');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">History Inventory</h1>
          <p className="text-slate-500 mt-1 font-medium italic">Pemantauan barang yang dipakai OM beserta jumlah, project, dan alasan</p>
        </div>
        {isOm && (
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-4 bg-red-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-200 flex items-center gap-3 active:scale-95"
          >
            <FiPlus size={20} className="stroke-[3]" />
            Catat Pemakaian
          </button>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-50 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center gap-3 bg-slate-50/30">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-sundaya-red shadow-sm border border-slate-100">
            <FiClipboard />
          </div>
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Log Pemakaian Barang</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-slate-50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Site</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Material</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty (PCS)</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Project</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Alasan</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pelapor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="7" className="px-8 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Loading...</td></tr>
              ) : history.length === 0 ? (
                <tr><td colSpan="7" className="px-8 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Belum ada history pemakaian</td></tr>
              ) : history.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6 text-sm font-bold text-slate-600">{new Date(item.createdAt).toLocaleString('id-ID')}</td>
                  <td className="px-8 py-6">
                    <span className={clsx('inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider', getSiteBadge(item.Site?.name))}>
                      <FiMapPin size={12} />
                      {item.Site?.name || '-'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-sm font-bold text-slate-700">{item.Material?.name || '-'}</td>
                  <td className="px-8 py-6 text-sm font-black text-slate-800">{item.quantity} PCS</td>
                  <td className="px-8 py-6 text-xs font-bold text-slate-700">{item.project || '-'}</td>
                  <td className="px-8 py-6 text-xs text-slate-600 font-medium italic">"{item.reason || '-'}"</td>
                  <td className="px-8 py-6 text-xs font-bold text-slate-500">{item.User?.username || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-50">
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Form Pemakaian Barang</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Isi jumlah pcs, project, dan alasan</p>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Site</label>
                <select
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                  value={form.siteId}
                  onChange={(e) => setForm({ ...form, siteId: e.target.value })}
                  disabled={isOm && allowedSites.length === 1}
                  required
                >
                  <option value="">Pilih Site</option>
                  {allowedSites.map((site) => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Material</label>
                <select
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                  value={form.materialId}
                  onChange={(e) => setForm({ ...form, materialId: e.target.value })}
                  required
                >
                  <option value="">Pilih Material</option>
                  {materials.map((material) => (
                    <option key={material.id} value={material.id}>{material.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Jumlah (PCS)</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Project</label>
                  <input
                    type="text"
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                    value={form.project}
                    onChange={(e) => setForm({ ...form, project: e.target.value })}
                    placeholder="Contoh: Solar Papua Phase 2"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Alasan Pemakaian</label>
                <textarea
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700 min-h-[100px]"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Jelaskan alasan penggunaan barang..."
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="w-full py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest">Batal</button>
                <button type="submit" className="w-full py-4 bg-sundaya-red hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-100 transition-all active:scale-95 flex items-center justify-center gap-2">
                  <FiPackage size={16} />
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

export default InventoryUsage;
