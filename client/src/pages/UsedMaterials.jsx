import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  FiRefreshCw, FiPlus, FiFilter, FiCheckCircle, FiXCircle, FiAlertTriangle, FiInfo 
} from 'react-icons/fi';
import { clsx } from 'clsx';

const UsedMaterials = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  
  const [newReport, setNewReport] = useState({
    materialId: '',
    quantity: 1,
    unit: '',
    serialNumbers: '',
    documentNo: '',
    returnSite: '',
    siteId: '',
    condition: 'BROKEN',
    description: ''
  });
  const isOm = user?.role === 'OM';
  const pageTitle = 'Recycle Material';
  const pageSubtitle = 'Pelaporan barang rusak/terpakai untuk proses recycle dan tindak lanjut';
  const allowedSites = isOm
    ? sites.filter((site) => {
      if (user?.siteId) return String(site.id) === String(user.siteId);
      const name = String(site?.name || '').toLowerCase();
      return name.includes('papua') || name.includes('maluku');
    })
    : sites;

  useEffect(() => {
    fetchReports();
    fetchMaterials();
    fetchSites();
  }, []);

  useEffect(() => {
    if (showModal && user?.siteId && !newReport.siteId) {
      setNewReport((prev) => ({ ...prev, siteId: user.siteId }));
    }
  }, [showModal, user?.siteId, newReport.siteId]);

  useEffect(() => {
    if (!showModal) {
      setPhotoFile(null);
      setPhotoPreview('');
    }
  }, [showModal]);

  useEffect(() => {
    if (!photoPreview) return;
    return () => URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/used-materials', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(res.data.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch reports', err);
      toast.error('Failed to load reports');
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/inventory/materials', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMaterials(res.data.data);
    } catch (err) {
      console.error('Failed to fetch materials', err);
    }
  };

  const fetchSites = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/inventory/sites', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSites(res.data.data);
    } catch (err) {
      console.error('Failed to fetch sites', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('materialId', newReport.materialId);
      formData.append('quantity', newReport.quantity);
      formData.append('unit', newReport.unit);
      formData.append('serialNumbers', newReport.serialNumbers);
      formData.append('documentNo', newReport.documentNo);
      formData.append('returnSite', newReport.returnSite);
      formData.append('siteId', newReport.siteId || '');
      formData.append('condition', newReport.condition);
      formData.append('description', newReport.description);
      if (photoFile) {
        formData.append('photo', photoFile);
      }

      await axios.post('http://localhost:5000/api/used-materials', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Report submitted successfully');
      setShowModal(false);
      setNewReport({
        materialId: '',
        quantity: 1,
        unit: '',
        serialNumbers: '',
        documentNo: '',
        returnSite: '',
        siteId: user?.siteId || '',
        condition: 'BROKEN',
        description: ''
      });
      setPhotoFile(null);
      setPhotoPreview('');
      fetchReports();
    } catch (err) {
      console.error('Failed to submit report', err);
      toast.error(err.response?.data?.message || 'Failed to submit report');
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:5000/api/used-materials/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Report status updated to ${status}`);
      fetchReports();
    } catch (err) {
      console.error('Failed to update status', err);
      toast.error('Failed to update status');
    }
  };

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'GOOD': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'REPAIRABLE': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'BROKEN': return 'text-red-600 bg-red-50 border-red-100';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  const getPhotoUrl = (photo) => {
    if (!photo) return '';
    if (photo.startsWith('http')) return photo;
    return `http://localhost:5000${photo}`;
  };

  const tableColSpan = (user?.role === 'NOC' || user?.role === 'PROGRAMMER') ? 9 : 8;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{pageTitle}</h1>
          <p className="text-slate-500 mt-1 font-medium italic">{pageSubtitle}</p>
        </div>
        
        {isOm && (
          <button 
            onClick={() => setShowModal(true)}
            className="px-6 py-4 bg-red-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-200 flex items-center gap-3 active:scale-95"
          >
            <FiPlus size={20} className="stroke-[3]" />
            Input Recycle
          </button>
        )}
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-[2.5rem] border border-slate-50 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center gap-3 bg-slate-50/30">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-sundaya-red shadow-sm border border-slate-100">
            <FiRefreshCw />
          </div>
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
            Riwayat Recycle Material
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-slate-50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Site / Reporter</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Material</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detail</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Photo</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Condition</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                {(user?.role === 'NOC' || user?.role === 'PROGRAMMER') && (
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={tableColSpan} className="px-8 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                    Loading reports...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={tableColSpan} className="px-8 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                    No used materials reported yet
                  </td>
                </tr>
              ) : reports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <span className="text-sm font-bold text-slate-600">
                      {new Date(report.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-slate-800 uppercase">{report.Site?.name}</span>
                      <span className="text-[10px] font-bold text-slate-400">{report.User?.username}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      {report.Material?.image && (
                        <img src={report.Material.image} alt="" className="w-8 h-8 rounded-lg object-cover bg-slate-100" />
                      )}
                      <div>
                        <p className="text-sm font-bold text-slate-700">{report.Material?.name}</p>
                        <p className="text-[10px] font-bold text-slate-400">Qty: {report.quantity} {report.unit || report.Material?.unit || 'Unit'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-bold text-slate-700">{report.documentNo || '-'}</p>
                      <p className="text-[10px] font-bold text-slate-400">{report.returnSite || '-'}</p>
                      {report.serialNumbers && (
                        <p className="text-[10px] font-bold text-slate-400 line-clamp-2" title={report.serialNumbers}>{report.serialNumbers}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {report.photo ? (
                      <img src={getPhotoUrl(report.photo)} alt="" className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-sm" />
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">No Photo</span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <div className={clsx("inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider", getConditionColor(report.condition))}>
                      {report.condition} • {(report.conditionPercentage ?? 0)}%
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs text-slate-600 font-medium italic line-clamp-2" title={report.description}>
                      "{report.description || 'No description'}"
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <span className={clsx(
                      "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                      report.status === 'RECYCLED' ? "bg-emerald-100 text-emerald-700" :
                      report.status === 'ACKNOWLEDGED' ? "bg-blue-100 text-blue-700" :
                      "bg-slate-100 text-slate-500"
                    )}>
                      {report.status}
                    </span>
                  </td>
                  {(user?.role === 'NOC' || user?.role === 'PROGRAMMER') && (
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        {report.status === 'REPORTED' && (
                          <button 
                            onClick={() => handleUpdateStatus(report.id, 'ACKNOWLEDGED')}
                            className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                            title="Acknowledge"
                          >
                            <FiCheckCircle />
                          </button>
                        )}
                        {report.status !== 'RECYCLED' && (
                          <button 
                            onClick={() => handleUpdateStatus(report.id, 'RECYCLED')}
                            className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                            title="Mark as Recycled"
                          >
                            <FiRefreshCw />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800 tracking-tight">Form Recycle Material</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Input Barang Untuk Proses Recycle</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all">
                <FiXCircle className="text-slate-300 hover:text-red-500" size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Site Asal</label>
                <select
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                  value={newReport.siteId}
                  onChange={(e) => setNewReport({ ...newReport, siteId: e.target.value })}
                  disabled={isOm && allowedSites.length === 1}
                  required
                >
                  {!newReport.siteId && <option value="">Pilih Site</option>}
                  {allowedSites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Material Item</label>
                <select 
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                  value={newReport.materialId}
                  onChange={(e) => {
                    const value = e.target.value;
                    const selected = materials.find((m) => m.id.toString() === value);
                    setNewReport({
                      ...newReport,
                      materialId: value,
                      unit: selected?.unit || newReport.unit
                    });
                  }}
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
                  value={newReport.quantity}
                  onChange={(e) => setNewReport({...newReport, quantity: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Unit</label>
                  <input
                    type="text"
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                    value={newReport.unit}
                    onChange={(e) => setNewReport({...newReport, unit: e.target.value})}
                    placeholder="Unit"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Document No</label>
                  <input
                    type="text"
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                    value={newReport.documentNo}
                    onChange={(e) => setNewReport({...newReport, documentNo: e.target.value})}
                    placeholder="e.g. RM-2024-001"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Return Site</label>
                  <input
                    type="text"
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                    value={newReport.returnSite}
                    onChange={(e) => setNewReport({...newReport, returnSite: e.target.value})}
                    placeholder="e.g. Gudang Pusat"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Serial Numbers</label>
                  <input
                    type="text"
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                    value={newReport.serialNumbers}
                    onChange={(e) => setNewReport({...newReport, serialNumbers: e.target.value})}
                    placeholder="SN001, SN002"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Photo</label>
                <div className="flex items-center gap-4">
                  <label className="flex-1 px-5 py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-sundaya-red transition-all font-bold text-slate-500 text-xs uppercase tracking-widest text-center">
                    Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setPhotoFile(file || null);
                        setPhotoPreview(file ? URL.createObjectURL(file) : '');
                      }}
                    />
                  </label>
                  {photoPreview && (
                    <img src={photoPreview} alt="" className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-sm" />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Condition Status</label>
                <div className="flex gap-2">
                  {['GOOD', 'REPAIRABLE', 'BROKEN'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setNewReport({...newReport, condition: status})}
                      className={clsx(
                        "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all",
                        newReport.condition === status
                          ? (status === 'GOOD' ? "bg-emerald-50 border-emerald-500 text-emerald-600" :
                             status === 'REPAIRABLE' ? "bg-amber-50 border-amber-500 text-amber-600" :
                             "bg-red-50 border-red-500 text-red-600")
                          : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Deskripsi Recycle</label>
                <textarea 
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700 min-h-[100px]"
                  placeholder="Jelaskan kondisi dan alasan recycle..."
                  value={newReport.description}
                  onChange={(e) => setNewReport({...newReport, description: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-sundaya-red hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-red-100 transition-all active:scale-95"
              >
                Submit Report
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsedMaterials;
