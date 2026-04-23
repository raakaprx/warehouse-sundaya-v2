import React, { useState, useEffect } from 'react';
import { 
  FiSearch, FiPlus, FiFilter, FiAlertTriangle, FiEdit3, 
  FiTrash2, FiInfo, FiBox, FiMapPin, FiPackage, FiImage, FiXCircle 
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { clsx } from 'clsx';

const Inventory = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSite, setSelectedSite] = useState('All');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [formData, setFormData] = useState({
    sku: '', itemCode: '', name: '', specs: '', category: '', stock: 0, siteId: '', minThreshold: 5, image: ''
  });
  const [sites, setSites] = useState([]);
  const fallbackSites = [
    { id: 'name:Pusat', name: 'Pusat' },
    { id: 'name:Papua', name: 'Papua' },
    { id: 'name:Maluku', name: 'Maluku' }
  ];

  useEffect(() => {
    fetchInventory();
    fetchSites();
  }, [selectedSite]);

  useEffect(() => {
    const handleUpdate = () => fetchInventory();
    window.addEventListener('inventory_updated', handleUpdate);
    return () => window.removeEventListener('inventory_updated', handleUpdate);
  }, [selectedSite]);

  useEffect(() => {
    if (!sites.length) return;
    if (selectedSite.startsWith('name:')) {
      const name = selectedSite.replace('name:', '');
      const matched = sites.find((site) => site.name === name);
      if (matched) {
        setSelectedSite(String(matched.id));
      }
    }
  }, [sites]);

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

  const fetchInventory = async () => {
    setLoading(true);
    try {
      let siteQuery = '';
      if (selectedSite !== 'All') {
        if (selectedSite.startsWith('name:')) {
          siteQuery = `?site=${encodeURIComponent(selectedSite.replace('name:', ''))}`;
        } else {
          siteQuery = `?siteId=${selectedSite}`;
        }
      }
      const res = await axios.get(`http://localhost:5000/api/inventory${siteQuery}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // untuk debug
      // console.table(res.data.data); 

      setItems(res.data.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch inventory', err);
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({ 
        sku: item.Material?.sku || '', 
        itemCode: item.Material?.itemCode || '',
        name: item.Material?.name || '', 
        specs: item.Material?.specs || '', 
        category: item.Material?.category || '', 
        stock: item.stock || 0, 
        siteId: item.siteId || '', 
        minThreshold: item.minThreshold || 5,
        image: item.Material?.image || '' 
      });
    } else {
      setEditingItem(null);
      setFormData({ sku: '', itemCode: '', name: '', specs: '', category: '', stock: 0, siteId: '', minThreshold: 5, image: '' });
    }
    setShowModal(true);
  };

  const handleOpenDetail = (item) => {
    setDetailItem(item);
    setShowDetailModal(true);
  };

  useEffect(() => {
    const fetchMovements = async () => {
      if (!detailItem?.Material?.id) return;
      setMovementsLoading(true);
      try {
        const res = await axios.get('http://localhost:5000/api/inventory/movements', {
          params: { materialId: detailItem.Material.id, siteId: detailItem.Site?.id },
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setMovements(res.data.data);
      } catch (err) {
        setMovements([]);
      } finally {
        setMovementsLoading(false);
      }
    };
    if (showDetailModal) {
      fetchMovements();
    }
  }, [showDetailModal, detailItem]);
 
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
     
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'image' && formData[key] instanceof File) {
          data.append('image', formData[key]);
        } else if (key !== 'image' || typeof formData[key] === 'string') {
          data.append(key, formData[key]);
        }
      });
      if (editingItem) {
        data.append('id', editingItem.Material?.id || editingItem.id);
      }

      await axios.post('http://localhost:5000/api/inventory/upsert', data, {
        headers: { 
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setShowModal(false);
      fetchInventory();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save material');
    }
  };

  const handleDelete = async (id) => {
    if (!id) return alert('Material ID not found');
    if (window.confirm('Are you sure you want to delete this material?')) {
      try {
        await axios.delete(`http://localhost:5000/api/inventory/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        fetchInventory();
      } catch (err) {
        alert('Failed to delete material');
      }
    }
  };

  const filteredItems = items.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = (item.Material?.name || item.name || '').toLowerCase().includes(searchLower);
    const skuMatch = (item.Material?.sku || item.sku || '').toLowerCase().includes(searchLower);
    const specsMatch = (item.Material?.specs || item.specs || '').toLowerCase().includes(searchLower);
    return nameMatch || skuMatch || specsMatch;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Stock & Catalog</h1>
          <p className="text-slate-500 mt-1 font-medium italic">Multisite inventory management PT Sundaya Indonesia</p>
        </div>
        {(user?.role === 'NOC' || user?.role === 'PROGRAMMER') && (
          <button 
            onClick={() => handleOpenModal()}
            className="bg-[#E73E3E] hover:bg-red-700 text-white px-6 py-3 rounded-2xl shadow-lg shadow-red-100 transition-all flex items-center gap-2 font-bold active:scale-95"
          >
            <FiPlus size={20} />
            Add New Material
          </button>
        )}
      </div>

      {/* Control Bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center bg-white p-4 rounded-[2rem] border border-slate-50 shadow-sm">
        <div className="relative flex-1 w-full">
          <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search SKU, Item Name, or Specs..." 
            className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-sundaya-red transition-all font-medium text-slate-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-4 w-full lg:w-auto">
          <div className="flex items-center gap-3 px-6 py-4 bg-slate-50 rounded-2xl border border-transparent">
            <FiFilter className="text-slate-400" size={18} />
            <select 
              className="bg-transparent text-sm font-black text-slate-600 focus:outline-none uppercase tracking-widest cursor-pointer"
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
            >
              <option value="All">All Locations</option>
              {(sites.length ? sites : fallbackSites).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Grid Layout */}
      {loading ? (
        <div className="p-20 text-center bg-white rounded-[2.5rem] border border-slate-50 shadow-sm">
          <div className="w-12 h-12 border-4 border-slate-100 border-t-sundaya-red rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Syncing Inventory Database...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-20 text-center bg-white rounded-[2.5rem] border border-slate-50 shadow-sm">
          <FiBox size={48} className="mx-auto text-slate-100 mb-4" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No material data found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white rounded-[2.5rem] border border-slate-50 shadow-sm overflow-hidden hover:shadow-xl hover:shadow-slate-100 transition-all group">
              <div className="relative h-48 bg-slate-50 flex items-center justify-center overflow-hidden">
                {item.Material?.image ? (
                  <img 
                    src={item.Material.image.startsWith('http') ? item.Material.image : `http://localhost:5000${item.Material.image}`} 
                    alt={item.Material?.name || item.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                  />
                ) : (
                  <FiPackage size={48} className="text-slate-200" />
                )}
                <div className="absolute top-4 left-4">
                  <span className={clsx(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm",
                    item.Site?.name === 'Pusat' ? "bg-red-50 text-red-600 border-red-100" :
                    item.Site?.name === 'Papua' ? "bg-blue-50 text-blue-600 border-blue-100" :
                    "bg-amber-50 text-amber-600 border-amber-100"
                  )}>
                    {item.Site?.name || 'Local'}
                  </span>
                </div>
                {(user?.role === 'NOC' || user?.role === 'PROGRAMMER') && (
                  <div className="absolute top-4 right-4 flex gap-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                    <button onClick={() => handleOpenModal(item)} className="p-2.5 bg-white text-slate-600 hover:text-sundaya-red rounded-xl shadow-lg transition-all">
                      <FiEdit3 size={16} />
                    </button>
                    <button onClick={() => handleDelete(item.Material?.id)} className="p-2.5 bg-white text-slate-600 hover:text-red-600 rounded-xl shadow-lg transition-all">
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <p className="text-[10px] font-black text-sundaya-red uppercase tracking-widest mb-1">{item.Material?.sku || item.sku}</p>
                  <h3 className="text-lg font-bold text-slate-800 leading-tight line-clamp-2">{item.Material?.name || item.name}</h3>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Category</p>
                    <p className="text-xs font-bold text-slate-600 truncate">{item.Material?.category || item.category}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Current Stock</p>
                    <p className={clsx(
                      "text-sm font-black",
                      item.stock < item.minThreshold ? "text-red-600" : "text-emerald-600"
                    )}>
                      {item.stock} <span className="text-[10px] uppercase font-bold text-slate-400">Units</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  <FiInfo size={14} />
                  <p className="text-[10px] font-medium italic truncate">{item.Material?.specs || item.specs}</p>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <FiMapPin size={14} />
                  <p className="text-[10px] font-medium">{item.Site?.name} • {item.Site?.location || '-'}</p>
                </div>
                <button
                  onClick={() => handleOpenDetail(item)}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                >
                  Lihat Detail
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDetailModal && detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Detail Barang</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Stock Master</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all">
                <FiXCircle className="text-slate-300 hover:text-red-500" size={28} />
              </button>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-100">
                {detailItem.Material?.image ? (
                  <img 
                    src={detailItem.Material.image.startsWith('http') ? detailItem.Material.image : `http://localhost:5000${detailItem.Material.image}`} 
                    alt={detailItem.Material?.name || detailItem.name} 
                    className="w-full h-64 object-cover" 
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-slate-200">
                    <FiPackage size={64} />
                  </div>
                )}
              </div>
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black text-sundaya-red uppercase tracking-widest mb-1">{detailItem.Material?.sku || detailItem.sku}</p>
                  <h3 className="text-2xl font-black text-slate-800">{detailItem.Material?.name || detailItem.name}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Code</p>
                    <p className="text-sm font-bold text-slate-700">{detailItem.Material?.itemCode || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</p>
                    <p className="text-sm font-bold text-slate-700">{detailItem.Material?.category || detailItem.category || '-'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Specs</p>
                  <p className="text-sm font-medium text-slate-700">{detailItem.Material?.specs || detailItem.specs || '-'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Site</p>
                    <p className="text-sm font-bold text-slate-700">{detailItem.Site?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</p>
                    <p className="text-sm font-bold text-slate-700">{detailItem.Site?.location || '-'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock</p>
                    <p className="text-sm font-black text-slate-800">{detailItem.stock} Units</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Min Threshold</p>
                    <p className="text-sm font-black text-slate-800">{detailItem.minThreshold}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">History Mutasi</p>
                  <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-100">
                    {movementsLoading ? (
                      <div className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Memuat mutasi...</div>
                    ) : movements.length === 0 ? (
                      <div className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Belum ada mutasi</div>
                    ) : (
                      movements.map((mv) => (
                        <div key={mv.id} className="p-4 flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-700">{mv.type} • {mv.quantity} Unit</p>
                            <p className="text-[10px] font-bold text-slate-400">{new Date(mv.createdAt).toLocaleDateString('id-ID')} • {new Date(mv.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <div className="text-[10px] font-bold text-slate-400">{mv.Site?.name || '-'}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-full py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal CRUD */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">{editingItem ? 'Edit Material' : 'Add New Material'}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Central Inventory Catalog System</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all">
                <FiXCircle className="text-slate-300 hover:text-red-500" size={28} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">SKU / SN</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                    placeholder="e.g. SDY-BAT-12V"
                    value={formData.sku}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Item Code</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                    placeholder="e.g. 1002394"
                    value={formData.itemCode}
                    onChange={(e) => setFormData({...formData, itemCode: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Material Name</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Initial Stock</label>
                    <input 
                      type="number" 
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                      value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value)})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Threshold Alert</label>
                    <input 
                      type="number" 
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                      value={formData.minThreshold}
                      onChange={(e) => setFormData({...formData, minThreshold: parseInt(e.target.value)})}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Warehouse Location</label>
                  <select 
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                    value={formData.siteId}
                    onChange={(e) => setFormData({...formData, siteId: e.target.value})}
                    required
                  >
                    <option value="">Select Location</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Category</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Solar Panel, Inverter, Battery"
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Technical Specs</label>
                  <textarea 
                    rows="2"
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700 resize-none"
                    value={formData.specs}
                    onChange={(e) => setFormData({...formData, specs: e.target.value})}
                  ></textarea>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Material Photo (JPG/PNG, Max 2MB)</label>
                  <div className="relative">
                    <FiImage className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg, image/jpg"
                      className="w-full pl-14 pr-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700 file:hidden cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) {
                            alert('File too large (max 2MB)');
                            e.target.value = null;
                            return;
                          }
                          setFormData({...formData, image: file});
                        }
                      }}
                    />
                    {formData.image && typeof formData.image === 'string' && (
                      <p className="mt-2 text-[10px] text-emerald-600 font-bold uppercase tracking-widest ml-1 italic">
                        ✓ Current photo exists
                      </p>
                    )}
                    {formData.image instanceof File && (
                      <p className="mt-2 text-[10px] text-blue-600 font-bold uppercase tracking-widest ml-1 italic">
                        ✓ File selected: {formData.image.name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="pt-4">
                  <button type="submit" className="w-full bg-sundaya-red hover:bg-red-700 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-100 transition-all active:scale-95 flex items-center justify-center gap-3">
                    <FiPlus size={20} />
                    Save Material
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
