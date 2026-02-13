import React, { useState, useEffect } from 'react';
import { 
  FiFileText, FiClock, FiShield, FiTruck, FiCheckCircle, 
  FiSearch, FiPlus, FiMapPin, FiCalendar, FiInfo, FiAlertCircle, FiXCircle, FiFilter 
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { clsx } from 'clsx';

const MaterialRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewRequest, setReviewRequest] = useState(null);
  const [shipData, setShipData] = useState({
    trackingNumber: '',
    shippingPhoto: '',
    eta: ''
  });
  const [receiveData, setReceiveData] = useState({
    file: null,
    preview: ''
  });
  const [newRequest, setNewRequest] = useState({
    siteId: '',
    items: [], // Array of { materialId, quantity }
    project: '',
    description: '',
    urgency: 'NORMAL',
    deadline: ''
  });
  const [currentItem, setCurrentItem] = useState({ materialId: '', quantity: 1 });
  const [itemsLocked, setItemsLocked] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [sites, setSites] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  useEffect(() => {
    fetchRequests();
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [filterStatus, filterStartDate, filterEndDate]);

  useEffect(() => {
    if (showModal) {
      setItemsLocked(false);
    }
  }, [showModal]);

  useEffect(() => {
    if (!receiveData.preview) return;
    return () => URL.revokeObjectURL(receiveData.preview);
  }, [receiveData.preview]);

  useEffect(() => {
    const handleNewRequest = () => {
      fetchRequests();
    };
    window.addEventListener('mr_new_request', handleNewRequest);
    return () => {
      window.removeEventListener('mr_new_request', handleNewRequest);
    };
  }, []);

  const fetchMetadata = async () => {
    try {
      const [matRes, siteRes] = await Promise.all([
        axios.get('http://localhost:5000/api/inventory/materials', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get('http://localhost:5000/api/inventory/sites', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);
      setMaterials(matRes.data.data);
      setSites(siteRes.data.data);
    } catch (err) {
      console.error('Failed to fetch metadata', err);
    }
  };

  const fetchRequests = async () => {
    try {
      const params = {};
      if (filterStatus && filterStatus !== 'ALL') params.status = filterStatus;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;
      const res = await axios.get('http://localhost:5000/api/requests', {
        params,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRequests(res.data.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch requests', err);
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    if (itemsLocked) return;
    if (!currentItem.materialId || currentItem.quantity <= 0) return;
    setNewRequest(prev => ({
      ...prev,
      items: [...prev.items, currentItem]
    }));
    setCurrentItem({ materialId: '', quantity: 1 });
  };

  const handleRemoveItem = (index) => {
    setNewRequest(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleOpenReview = (req) => {
    setReviewRequest(req);
    setShowReviewModal(true);
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (newRequest.items.length === 0) {
      alert('Mohon tambahkan minimal satu item material');
      return;
    }
    if (!itemsLocked) {
      alert('Klik Done setelah memilih material sebelum submit.');
      return;
    }
    try {
      const payload = {
        ...newRequest,
        siteId: parseInt(newRequest.siteId),
        items: newRequest.items.map(i => ({
          materialId: parseInt(i.materialId),
          quantity: parseInt(i.quantity)
        }))
      };

      await axios.post('http://localhost:5000/api/requests', payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShowModal(false);
      setNewRequest({ siteId: '', items: [], project: '', description: '', urgency: 'NORMAL', deadline: '' });
      fetchRequests();
    } catch (err) {
      console.error('Error creating request:', err.response?.data || err.message);
      const errorMessage = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Gagal membuat permintaan';
      alert(errorMessage);
    }
  };

  const handleAction = async (id, actionUrl, payload = {}) => {
    try {
      await axios.patch(`http://localhost:5000/api/requests/${id}/${actionUrl}`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memproses permintaan');
    }
  };

  const handleShip = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(`http://localhost:5000/api/requests/${selectedRequest.id}/ship-noc`, shipData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShowShipModal(false);
      setShipData({ trackingNumber: '', shippingPhoto: '', eta: '' });
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to ship material');
    }
  };

  const handleReceive = async (e) => {
    e.preventDefault();
    if (!receiveData.file) {
      alert('Mohon unggah foto bukti penerimaan');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('receiptPhoto', receiveData.file);
      await axios.patch(`http://localhost:5000/api/requests/${selectedRequest.id}/receive-om`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShowReceiveModal(false);
      setReceiveData({ file: null, preview: '' });
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal konfirmasi penerimaan');
    }
  };

  const getFileUrl = (filePath) => {
    if (!filePath) return '';
    if (filePath.startsWith('http')) return filePath;
    return `http://localhost:5000${filePath}`;
  };

  const getStatusBadge = (status) => {
    const configs = {
      'PENDING': { label: 'Waiting for NOC', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: FiShield },
      'REVIEWED_BY_NOC': { label: 'Waiting for GM', color: 'bg-amber-50 text-amber-600 border-amber-100', icon: FiClock },
      'APPROVED_BY_GM': { label: 'GM Approved', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: FiCheckCircle },
      'APPROVED_READY_TO_SHIP': { label: 'Ready to Ship', color: 'bg-indigo-50 text-indigo-600 border-indigo-100', icon: FiTruck },
      'ON_DELIVERY': { label: 'On Delivery', color: 'bg-purple-50 text-purple-600 border-purple-100', icon: FiTruck },
      'FULFILLED': { label: 'Fulfilled', color: 'bg-slate-50 text-slate-600 border-slate-100', icon: FiCheckCircle },
      'REJECTED': { label: 'Rejected', color: 'bg-red-50 text-red-600 border-red-100', icon: FiXCircle },
      'CANCELLED': { label: 'Cancelled', color: 'bg-slate-200 text-slate-600 border-slate-300', icon: FiXCircle },
    };
    const config = configs[status] || configs['PENDING_NOC_REVIEW'];
    const Icon = config.icon;
    return (
      <div className={clsx("flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border", config.color)}>
        <Icon size={12} />
        {config.label}
      </div>
    );
  };

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'CRITICAL': return <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Critical</span>;
      case 'HIGH': return <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">High</span>;
      default: return <span className="bg-blue-500 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">Normal</span>;
    }
  };

  const displayedRequests = requests.filter((req) => {
    const keyword = searchTerm.toLowerCase();
    const project = (req.project || '').toLowerCase();
    const siteName = (req.Site?.name || '').toLowerCase();
    const idText = String(req.id || '');
    return project.includes(keyword) || siteName.includes(keyword) || idText.includes(keyword);
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Material Requests</h1>
          <p className="text-slate-500 mt-1 font-medium italic">Bureaucracy management and multisite logistics distribution</p>
        </div>
        {user?.role === 'OM' && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl shadow-2xl shadow-red-200 transition-all flex items-center gap-3 font-black uppercase tracking-widest text-sm border-2 border-red-500 active:scale-95"
          >
            <FiPlus size={22} className="stroke-[3]" />
            New Request
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content: Request List */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search Request No., Project, or Location..." 
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-sundaya-red focus:border-transparent outline-none shadow-sm transition-all text-slate-600 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <FiFilter className="text-slate-400" size={16} />
                <select
                  className="bg-transparent text-xs font-black text-slate-600 uppercase tracking-widest focus:outline-none"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="ALL">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="REVIEWED_BY_NOC">Reviewed by NOC</option>
                  <option value="APPROVED_BY_GM">Approved by GM</option>
                  <option value="ON_DELIVERY">On Delivery</option>
                  <option value="FULFILLED">Fulfilled</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <FiCalendar className="text-slate-400" size={16} />
                <input
                  type="date"
                  className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                />
                <span className="text-xs font-bold text-slate-400">-</span>
                <input
                  type="date"
                  className="bg-transparent text-xs font-bold text-slate-600 focus:outline-none"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-20 text-center bg-white rounded-[2rem] border border-slate-50 shadow-sm">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-sundaya-red rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Requests...</p>
            </div>
          ) : displayedRequests.length === 0 ? (
            <div className="p-20 text-center bg-white rounded-[2rem] border border-slate-50 shadow-sm">
              <FiFileText size={48} className="mx-auto text-slate-100 mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No material requests yet</p>
            </div>
          ) : displayedRequests.map((req) => {
            const totalQty = (req.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
            return (
            <div key={req.id} className="bg-white rounded-[2rem] border border-slate-50 shadow-sm overflow-hidden hover:shadow-xl hover:shadow-slate-100 transition-all group">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-sundaya-red uppercase tracking-widest">REQ-ID: {req.id.toString().padStart(4, '0')}</span>
                      {getStatusBadge(req.status)}
                      {getUrgencyBadge(req.urgency)}
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">{req.project}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Submitted On</p>
                    <p className="text-sm font-bold text-slate-600">
                      {new Date(req.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400/70 mt-1">
                      {new Date(req.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                    </p>
                    {req.deadline && (
                      <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mt-2">
                        Deadline: {new Date(req.deadline).toLocaleDateString('id-ID')}
                      </p>
                    )}
                    {(user?.role === 'NOC' || user?.role === 'GM') && (
                      <button
                        type="button"
                        onClick={() => handleOpenReview(req)}
                        className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:text-sundaya-red hover:border-sundaya-red transition-all"
                      >
                        <FiFileText size={12} />
                        Review Letter
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-y border-slate-50">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Site Location</p>
                    <div className="flex items-center gap-2 text-slate-600 font-bold">
                      <FiMapPin className="text-sundaya-red" />
                      <span>{req.Site?.name || req.site || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Material</p>
                    <div className="flex flex-col gap-1">
                      {req.items && req.items.length > 0 ? (
                        req.items.map((item, idx) => (
                          <div key={idx} className="text-slate-600 font-bold text-xs flex justify-between">
                            <span>• {item.Material?.name || 'Unknown'}</span>
                            <span className="bg-slate-100 px-1.5 rounded text-[10px]">x{item.quantity}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-600 font-bold">N/A</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Items</p>
                    <p className="text-slate-600 font-bold">{req.items?.length || 0} Types • {totalQty} Units</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project</p>
                    <p className="text-slate-600 font-bold truncate">{req.project}</p>
                  </div>
                </div>

                {req.description && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Description / Notes</p>
                    <p className="text-sm text-slate-600 italic">"{req.description}"</p>
                  </div>
                )}

                {req.trackingNumber && (
                  <div className="mt-4 flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <div className="flex items-center gap-3">
                      <FiTruck className="text-blue-600" />
                      <div>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Shipping Tracking No.</p>
                        <p className="text-sm font-bold text-blue-700">{req.trackingNumber}</p>
                      </div>
                    </div>
                    {req.shippingPhoto && (
                      <a href={getFileUrl(req.shippingPhoto)} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline">
                        View Photo
                      </a>
                    )}
                  </div>
                )}
                {req.eta && (
                  <div className="mt-4 flex items-center justify-between p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <div className="flex items-center gap-3">
                      <FiCalendar className="text-indigo-600" />
                      <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Estimasi Tiba</p>
                        <p className="text-sm font-bold text-indigo-700">{new Date(req.eta).toLocaleDateString('id-ID')}</p>
                      </div>
                    </div>
                  </div>
                )}

                {req.receiptPhoto && (
                  <div className="mt-4 flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div className="flex items-center gap-3">
                      <FiCheckCircle className="text-emerald-600" />
                      <div>
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Receipt Confirmation</p>
                        <p className="text-sm font-bold text-emerald-700">Barang diterima</p>
                      </div>
                    </div>
                    <a href={getFileUrl(req.receiptPhoto)} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-600 hover:underline">
                      View Receipt
                    </a>
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3 border-t border-slate-50 pt-6">
                  {user?.role === 'NOC' && req.status === 'PENDING' && (
                    <>
                      <button 
                        onClick={() => handleAction(req.id, 'review-noc', { approved: true })}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-100"
                      >
                        Technical Review OK
                      </button>
                      <button 
                        onClick={() => {
                          const reason = window.prompt('Alasan penolakan:');
                          if (!reason) return;
                          handleAction(req.id, 'review-noc', { approved: false, reason });
                        }}
                        className="bg-white border border-red-100 text-red-500 hover:bg-red-50 px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
                      >
                        Reject Request
                      </button>
                    </>
                  )}
                  {user?.role === 'GM' && req.status === 'REVIEWED_BY_NOC' && (
                    <>
                      <button 
                        onClick={() => handleAction(req.id, 'approve-gm', { approved: true })}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-100"
                      >
                        Final Approve
                      </button>
                      <button 
                        onClick={() => {
                          const reason = window.prompt('Alasan penolakan:');
                          if (!reason) return;
                          handleAction(req.id, 'approve-gm', { approved: false, reason });
                        }}
                        className="bg-white border border-red-100 text-red-500 hover:bg-red-50 px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
                      >
                        Final Reject
                      </button>
                    </>
                  )}
                  {user?.role === 'NOC' && req.status === 'APPROVED_BY_GM' && (
                    <button 
                      onClick={() => {
                        setSelectedRequest(req);
                        setShowShipModal(true);
                      }}
                      className="bg-sundaya-red hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-red-100"
                    >
                      <FiTruck />
                      Ship Material
                    </button>
                  )}
                  {user?.role === 'OM' && req.status === 'ON_DELIVERY' && (
                    <button 
                      onClick={() => {
                        setSelectedRequest(req);
                        setShowReceiveModal(true);
                      }}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-100"
                    >
                      <FiCheckCircle />
                      Confirm Receipt
                    </button>
                  )}
                  {user?.role === 'OM' && req.status === 'PENDING' && (
                    <button
                      onClick={() => {
                        const reason = window.prompt('Alasan pembatalan:');
                        if (!reason) return;
                        handleAction(req.id, 'cancel', { reason });
                      }}
                      className="bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
              </div>
            </div>
          )})}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-50 shadow-sm space-y-6">
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-4">Alur Birokrasi</h4>
            <div className="space-y-8 relative">
              {/* Vertical Line Connector */}
              <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-100 z-0"></div>
              
              {[
                { step: '1', label: 'OM Request', icon: <FiFileText size={14} />, active: true },
                { step: '2', label: 'NOC Technical Review', icon: <FiShield size={14} />, active: true },
                { step: '3', label: 'GM Final Approval', icon: <FiCheckCircle size={14} />, active: true },
                { step: '4', label: 'NOC Shipping', icon: <FiTruck size={14} />, active: true },
                { step: '5', label: 'OM Receiving', icon: <FiMapPin size={14} />, active: true }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-5 group relative z-10">
                  <div className={clsx(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all border-2",
                    item.active 
                      ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-200" 
                      : "bg-white border-slate-200 text-slate-300"
                  )}>
                    {item.icon}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Step {item.step}</span>
                    <span className={clsx(
                      "text-xs font-black transition-all",
                      item.active ? "text-slate-800" : "text-slate-300"
                    )}>
                      {item.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-[2rem] text-white space-y-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <FiInfo className="text-sundaya-red" size={24} />
            </div>
            <h4 className="text-lg font-bold leading-tight">Butuh Bantuan Logistik?</h4>
            <p className="text-slate-400 text-xs font-medium leading-relaxed">
              Jika ada kendala dalam pengiriman atau stok kosong, silakan hubungi Admin NOC melalui Sistem Pesan.
            </p>
            <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
              Hubungi Support
            </button>
          </div>
        </div>
      </div>

      {/* Ship Modal */}
      {showShipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-enter">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Kirim Material</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Konfirmasi Pengiriman Barang</p>
              </div>
              <button onClick={() => setShowShipModal(false)} className="p-3 hover:bg-white rounded-2xl text-slate-400 hover:text-sundaya-red transition-all shadow-sm">
                <FiXCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleShip} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Nomor Resi / AWB</label>
                  <div className="relative">
                    <FiTruck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      required
                      type="text"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-sundaya-red outline-none text-slate-700 font-bold placeholder:text-slate-300"
                      placeholder="Contoh: JNE123456789"
                      value={shipData.trackingNumber}
                      onChange={(e) => setShipData({ ...shipData, trackingNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Foto Bukti Pengiriman (URL)</label>
                  <div className="relative">
                    <FiFileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      required
                      type="text"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-sundaya-red outline-none text-slate-700 font-bold placeholder:text-slate-300"
                      placeholder="https://image-url.com/photo.jpg"
                      value={shipData.shippingPhoto}
                      onChange={(e) => setShipData({ ...shipData, shippingPhoto: e.target.value })}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium italic ml-1">* Untuk demo, masukkan URL foto barang yang sudah dipacking</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Estimasi Tiba</label>
                  <div className="relative">
                    <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-sundaya-red outline-none text-slate-700 font-bold placeholder:text-slate-300"
                      value={shipData.eta}
                      onChange={(e) => setShipData({ ...shipData, eta: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowShipModal(false)}
                  className="flex-1 py-4 px-6 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-widest text-xs"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 px-6 bg-sundaya-red hover:bg-red-700 text-white rounded-2xl font-bold shadow-lg shadow-red-100 transition-all uppercase tracking-widest text-xs active:scale-95"
                >
                  Konfirmasi Kirim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReceiveModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-enter">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Konfirmasi Penerimaan</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Unggah Bukti Terima Barang</p>
              </div>
              <button onClick={() => setShowReceiveModal(false)} className="p-3 hover:bg-white rounded-2xl text-slate-400 hover:text-sundaya-red transition-all shadow-sm">
                <FiXCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleReceive} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Foto Bukti Terima</label>
                <div className="flex items-center gap-4">
                  <label className="flex-1 px-5 py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-sundaya-red transition-all font-bold text-slate-500 text-xs uppercase tracking-widest text-center">
                    Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setReceiveData({
                          file: file || null,
                          preview: file ? URL.createObjectURL(file) : ''
                        });
                      }}
                    />
                  </label>
                  {receiveData.preview && (
                    <img src={receiveData.preview} alt="" className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-sm" />
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="flex-1 py-4 px-6 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-widest text-xs"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 transition-all uppercase tracking-widest text-xs active:scale-95"
                >
                  Konfirmasi Terima
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReviewModal && reviewRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-enter">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Request Review Letter</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Formal Review Summary</p>
              </div>
              <button onClick={() => setShowReviewModal(false)} className="p-3 hover:bg-white rounded-2xl text-slate-400 hover:text-sundaya-red transition-all shadow-sm">
                <FiXCircle size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Request ID</p>
                  <p className="text-xl font-black text-slate-800">REQ-{reviewRequest.id.toString().padStart(4, '0')}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Submitted On</p>
                  <p className="text-sm font-bold text-slate-600">
                    {new Date(reviewRequest.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400/70">
                    {new Date(reviewRequest.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Site Location</p>
                  <p className="text-sm font-bold text-slate-700">{reviewRequest.Site?.name || reviewRequest.site || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project</p>
                  <p className="text-sm font-bold text-slate-700">{reviewRequest.project}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Urgency</p>
                  {getUrgencyBadge(reviewRequest.urgency)}
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                  {getStatusBadge(reviewRequest.status)}
                </div>
              </div>

              <div className="border border-slate-100 rounded-2xl p-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Requested Materials</p>
                <div className="space-y-2">
                  {(reviewRequest.items && reviewRequest.items.length > 0) ? (
                    reviewRequest.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm font-bold text-slate-700">
                        <span>• {item.Material?.name || 'Unknown'}</span>
                        <span className="text-slate-500">x{item.quantity}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-bold text-slate-500">N/A</p>
                  )}
                </div>
              </div>

              {reviewRequest.description && (
                <div className="bg-slate-50 rounded-2xl p-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description / Notes</p>
                  <p className="text-sm text-slate-600 italic">"{reviewRequest.description}"</p>
                </div>
              )}
              {(reviewRequest.nocDecisionNote || reviewRequest.gmDecisionNote) && (
                <div className="bg-white border border-slate-100 rounded-2xl p-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Approval Notes</p>
                  {reviewRequest.nocDecisionNote && (
                    <p className="text-sm font-bold text-slate-700">NOC: {reviewRequest.nocDecisionNote}</p>
                  )}
                  {reviewRequest.gmDecisionNote && (
                    <p className="text-sm font-bold text-slate-700">GM: {reviewRequest.gmDecisionNote}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Lokasi Site</label>
                  <select 
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                    value={newRequest.siteId}
                    onChange={(e) => setNewRequest({...newRequest, siteId: e.target.value})}
                    required
                  >
                    <option value="">Pilih Site</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Nama Proyek</label>
                  <input 
                    type="text" 
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                    placeholder="Contoh: Papua Solar Phase 1"
                    value={newRequest.project}
                    onChange={(e) => setNewRequest({...newRequest, project: e.target.value})}
                    required
                  />
                </div>
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

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Urgensi Kebutuhan</label>
                  <div className="flex gap-3">
                    {['NORMAL', 'HIGH', 'CRITICAL'].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setNewRequest({...newRequest, urgency: level})}
                        className={clsx(
                          "flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider border-2 transition-all",
                          newRequest.urgency === level 
                            ? (level === 'CRITICAL' ? "bg-red-50 border-red-500 text-red-600" : 
                               level === 'HIGH' ? "bg-orange-50 border-orange-500 text-orange-600" : 
                               "bg-blue-50 border-blue-500 text-blue-600")
                            : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
                        )}
                      >
                        {level === 'NORMAL' ? 'Butuh Saja' : level === 'HIGH' ? 'Penting' : 'Sangat Penting'}
                      </button>
                    ))}
                  </div>
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
                        {materials.find(m => m.id.toString() === item.materialId)?.name}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400">Qty: {item.quantity}</p>
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
                      onChange={(e) => setCurrentItem({...currentItem, materialId: e.target.value})}
                    >
                      <option value="">Select Material</option>
                      {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      min="1"
                      className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:border-sundaya-red"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({...currentItem, quantity: parseInt(e.target.value)})}
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
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Description / Reason</label>
                <textarea 
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700 min-h-[100px]"
                  placeholder="Explain why this material is needed..."
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({...newRequest, description: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                disabled={newRequest.items.length === 0 || !itemsLocked}
                className="w-full py-4 bg-[#E73E3E] hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-red-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default MaterialRequests;
