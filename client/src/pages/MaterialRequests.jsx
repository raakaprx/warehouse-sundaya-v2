import React, { useState, useEffect } from 'react';
import { 
  FiFileText, FiClock, FiShield, FiTruck, FiCheckCircle, 
  FiSearch, FiPlus, FiMapPin, FiCalendar, FiInfo, FiAlertCircle, FiXCircle, FiFilter, FiImage
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { clsx } from 'clsx';

const MaterialRequests = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showShipModal, setShowShipModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewRequest, setReviewRequest] = useState(null);
  const [shipData, setShipData] = useState({
    trackingNumber: '',
    shippingPhotoFile: null,
    shippingPhotoPreview: '',
    eta: ''
  });
  const [receiveData, setReceiveData] = useState({
    file: null,
    preview: ''
  });
  const [newRequest, setNewRequest] = useState({
    siteId: '',
    items: [], // Array of { materialId, quantity }
    documentNo: '',
    destination: '',
    project: '',
    description: '',
    urgency: 'HIGH',
    deadline: ''
  });
  const [currentItem, setCurrentItem] = useState({ materialId: '', quantity: 1 });
  const [itemsLocked, setItemsLocked] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [sites, setSites] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [language, setLanguage] = useState('en');
  const [currentPage, setCurrentPage] = useState(1);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [reasonTitle, setReasonTitle] = useState('');
  const [reasonValue, setReasonValue] = useState('');
  const [reasonAction, setReasonAction] = useState(null);
  const itemsPerPage = 6;
  const modalLayers = {
    base: 'z-50',
    review: 'z-[60]',
    confirm: 'z-[80]',
    reason: 'z-[90]'
  };

  const labels = {
    id: {
      materialRequestsTitle: 'Permintaan Material',
      materialRequestsSubtitle: 'Manajemen birokrasi dan distribusi logistik multisite',
      reviewRequestsTitle: 'Review Request',
      reviewRequestsSubtitle: 'Validasi dan persetujuan permintaan material',
      searchPlaceholder: 'Cari No. Request, Proyek, atau Lokasi...',
      allStatus: 'Semua Status',
      statusPending: 'Menunggu NOC',
      statusReviewed: 'Menunggu Review GM',
      statusApproved: 'Menunggu NOC Mengirim',
      statusReadyToShip: 'Siap Dikirim',
      statusOnDelivery: 'Dalam Pengiriman',
      statusFulfilled: 'Selesai',
      statusRejected: 'Ditolak',
      statusRejectedByNoc: 'Ditolak oleh NOC',
      statusRejectedByGm: 'Ditolak oleh GM',
      statusCancelled: 'Dibatalkan',
      submittedOn: 'Dikirim Pada',
      deadline: 'Batas Waktu',
      siteLocation: 'Lokasi Site',
      material: 'Material',
      totalItems: 'Total Item',
      documentNoLabel: 'No. Dokumen',
      destinationLabel: 'Tujuan Pengiriman',
      unitLabel: 'Unit',
      serialNumbersLabel: 'Serial Number',
      project: 'Proyek',
      descriptionNotes: 'Deskripsi / Catatan',
      reviewLetter: 'Review Letter',
      types: 'Tipe',
      units: 'Unit',
      viewPhoto: 'Lihat Foto',
      viewReceipt: 'Lihat Bukti',
      page: 'Halaman',
      of: 'dari',
      prev: 'Sebelumnya',
      next: 'Berikutnya',
      slaDue: 'SLA',
      slaOverdue: 'Terlambat',
      slaAge: 'Usia',
      daysShort: 'hr',
      hoursShort: 'j',
      loadingRequests: 'Memuat permintaan...',
      noRequests: 'Belum ada permintaan material',
      newRequest: 'Permintaan Baru',
      reviewLetterButton: 'Review Letter',
      shippingTrackingNo: 'Nomor Resi Pengiriman',
      etaLabel: 'Estimasi Tiba',
      receiptConfirmation: 'Konfirmasi Penerimaan',
      receiptConfirmed: 'Barang diterima',
      shipMaterial: 'Kirim Material',
      confirmReceipt: 'Konfirmasi Penerimaan',
      cancelRequest: 'Batalkan Permintaan',
      urgencyCritical: 'Sangat Penting',
      urgencyHigh: 'Penting',
      urgencyNormal: 'Penting',
      confirmActionTitle: 'Konfirmasi Aksi',
      confirmActionSubtitle: 'Pastikan keputusan sudah benar',
      cancel: 'Batal',
      yesContinue: 'Ya, Lanjutkan',
      reviewLetterTitle: 'Review Letter Permintaan',
      reviewLetterSubtitle: 'Ringkasan Formal Review',
      requestId: 'Request ID',
      urgencyLabel: 'Urgensi',
      statusLabel: 'Status',
      requestedMaterials: 'Material Diminta',
      approvalNotes: 'Catatan Persetujuan',
      reviewHistoryTitle: 'Riwayat Approval / Review',
      rejectReasonLabel: 'Alasan Reject',
      reviewedByNoc: 'Direview oleh NOC',
      approvedByGm: 'Disetujui oleh GM',
      approveNoc: 'Accept',
      rejectNoc: 'Reject',
      approveGm: 'Accept',
      rejectGm: 'Reject',
      rejectReasonPrompt: 'Alasan penolakan:',
      cancelReasonPrompt: 'Alasan pembatalan:',
      reasonPlaceholder: 'Tulis alasan singkat...',
      submitReason: 'Simpan Alasan',
      confirmNocPrimary: 'Accept NOC review?',
      confirmNocSecondary: 'Confirm push to GM?',
      confirmGmPrimary: 'Accept GM approval?',
      shipModalTitle: 'Kirim Material',
      shipModalSubtitle: 'Konfirmasi Pengiriman Barang',
      trackingNumberLabel: 'Nomor Resi / AWB',
      trackingNumberPlaceholder: 'Contoh: JNE123456789',
      shippingPhotoLabel: 'Foto Bukti Pengiriman',
      shippingPhotoPlaceholder: '',
      shippingPhotoHelp: '* Wajib upload foto pengiriman',
      receiveModalTitle: 'Konfirmasi Penerimaan',
      receiveModalSubtitle: 'Unggah bukti penerimaan barang',
      receivePhotoLabel: 'Bukti Penerimaan Barang',
      uploadPhoto: 'Upload Foto',
      confirmShip: 'Konfirmasi Kirim',
      helpTitle: 'Butuh Bantuan Logistik?',
      helpDescription: 'Jika ada kendala dalam pengiriman atau stok kosong, silakan hubungi Admin NOC melalui Sistem Pesan.',
      helpCta: 'Hubungi Support'
    },
    en: {
      materialRequestsTitle: 'Material Requests',
      materialRequestsSubtitle: 'Bureaucracy management and multisite logistics distribution',
      reviewRequestsTitle: 'Review Request',
      reviewRequestsSubtitle: 'Material request validation and approval',
      searchPlaceholder: 'Search Request No., Project, or Location...',
      allStatus: 'All Status',
      statusPending: 'Waiting for NOC',
      statusReviewed: 'Waiting for GM Review',
      statusApproved: 'Waiting for NOC Shipping',
      statusReadyToShip: 'Ready to Ship',
      statusOnDelivery: 'On Delivery',
      statusFulfilled: 'Fulfilled',
      statusRejected: 'Rejected',
      statusRejectedByNoc: 'Rejected by NOC',
      statusRejectedByGm: 'Rejected by GM',
      statusCancelled: 'Cancelled',
      submittedOn: 'Submitted On',
      deadline: 'Deadline',
      siteLocation: 'Site Location',
      material: 'Material',
      totalItems: 'Total Items',
      documentNoLabel: 'Document No.',
      destinationLabel: 'Destination',
      unitLabel: 'Unit',
      serialNumbersLabel: 'Serial Numbers',
      project: 'Project',
      descriptionNotes: 'Description / Notes',
      reviewLetter: 'Review Letter',
      types: 'Types',
      units: 'Units',
      viewPhoto: 'View Photo',
      viewReceipt: 'View Receipt',
      page: 'Page',
      of: 'of',
      prev: 'Previous',
      next: 'Next',
      slaDue: 'SLA',
      slaOverdue: 'Overdue',
      slaAge: 'Age',
      daysShort: 'd',
      hoursShort: 'h',
      loadingRequests: 'Loading requests...',
      noRequests: 'No material requests yet',
      newRequest: 'New Request',
      reviewLetterButton: 'Review Letter',
      shippingTrackingNo: 'Shipping Tracking No.',
      etaLabel: 'ETA',
      receiptConfirmation: 'Receipt Confirmation',
      receiptConfirmed: 'Items received',
      shipMaterial: 'Ship Material',
      confirmReceipt: 'Confirm Receipt',
      cancelRequest: 'Cancel Request',
      urgencyCritical: 'Very Important',
      urgencyHigh: 'Important',
      urgencyNormal: 'Important',
      confirmActionTitle: 'Confirm Action',
      confirmActionSubtitle: 'Make sure the decision is correct',
      cancel: 'Cancel',
      yesContinue: 'Yes, Continue',
      reviewLetterTitle: 'Request Review Letter',
      reviewLetterSubtitle: 'Formal Review Summary',
      requestId: 'Request ID',
      urgencyLabel: 'Urgency',
      statusLabel: 'Status',
      requestedMaterials: 'Requested Materials',
      approvalNotes: 'Approval Notes',
      reviewHistoryTitle: 'Approval / Review History',
      rejectReasonLabel: 'Reject Reason',
      reviewedByNoc: 'Reviewed by NOC',
      approvedByGm: 'Approved by GM',
      approveNoc: 'Approve NOC',
      rejectNoc: 'Reject NOC',
      approveGm: 'Approve GM',
      rejectGm: 'Reject GM',
      rejectReasonPrompt: 'Rejection reason:',
      cancelReasonPrompt: 'Cancellation reason:',
      reasonPlaceholder: 'Write a short reason...',
      submitReason: 'Save Reason',
      confirmNocPrimary: 'Approve NOC review?',
      confirmNocSecondary: 'Confirm sending to GM?',
      confirmGmPrimary: 'Approve GM decision?',
      shipModalTitle: 'Ship Material',
      shipModalSubtitle: 'Confirm material shipment',
      trackingNumberLabel: 'Tracking Number / AWB',
      trackingNumberPlaceholder: 'Example: JNE123456789',
      shippingPhotoLabel: 'Shipping Proof Photo',
      shippingPhotoPlaceholder: '',
      shippingPhotoHelp: '* Upload shipping proof photo',
      receiveModalTitle: 'Confirm Receipt',
      receiveModalSubtitle: 'Upload receipt proof',
      receivePhotoLabel: 'Receipt Proof',
      uploadPhoto: 'Upload Photo',
      confirmShip: 'Confirm Shipment',
      helpTitle: 'Need Logistics Help?',
      helpDescription: 'If there are shipping issues or stockouts, contact NOC Admin via the Messaging System.',
      helpCta: 'Contact Support'
    }
  };

  const t = (key) => labels[language]?.[key] || labels.id[key] || key;
  const locale = language === 'en' ? 'en-US' : 'id-ID';
  const isReviewRole = user?.role === 'NOC' || user?.role === 'GM';
  const rejectedStatuses = ['REJECTED_BY_NOC', 'REJECTED_BY_GM'];

  const statusOptions = [
    { value: 'ALL', label: t('allStatus') },
    { value: 'PENDING', label: t('statusPending') },
    { value: 'REVIEWED_BY_NOC', label: t('statusReviewed') },
    { value: 'APPROVED_BY_GM', label: t('statusApproved') },
    // { value: 'APPROVED_READY_TO_SHIP', label: t('statusReadyToShip') },
    { value: 'ON_DELIVERY', label: t('statusOnDelivery') },
    { value: 'FULFILLED', label: t('statusFulfilled') },
    { value: 'REJECTED_BY_NOC', label: t('statusRejectedByNoc') },
    { value: 'REJECTED_BY_GM', label: t('statusRejectedByGm') },
    { value: 'CANCELLED', label: t('statusCancelled') }
  ];

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
      if (materials.length === 0 || sites.length === 0) {
        fetchMetadata();
      }
      if (user?.role === 'OM' && !newRequest.siteId) {
        const omSites = sites.filter((site) => {
          const name = String(site?.name || '').toLowerCase();
          return name.includes('papua') || name.includes('maluku');
        });
        if (omSites.length > 0) {
          setNewRequest((prev) => ({ ...prev, siteId: String(omSites[0].id) }));
        }
      }
    }
  }, [showModal, materials.length, sites.length, user?.role, newRequest.siteId, sites]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openNew') !== '1') return;
    if (user?.role !== 'OM') return;
    setShowModal(true);
  }, [location.search, user?.role]);

  useEffect(() => {
    if (!receiveData.preview) return;
    return () => URL.revokeObjectURL(receiveData.preview);
  }, [receiveData.preview]);

  useEffect(() => {
    if (!shipData.shippingPhotoPreview) return;
    return () => URL.revokeObjectURL(shipData.shippingPhotoPreview);
  }, [shipData.shippingPhotoPreview]);

  useEffect(() => {
    const handleNewRequest = () => {
      fetchRequests();
    };
    window.addEventListener('mr_new_request', handleNewRequest);
    return () => {
      window.removeEventListener('mr_new_request', handleNewRequest);
    };
  }, []);

  useEffect(() => {
    const handleFlowUpdate = () => {
      fetchRequests();
    };
    window.addEventListener('mr_flow_update', handleFlowUpdate);
    return () => {
      window.removeEventListener('mr_flow_update', handleFlowUpdate);
    };
  }, []);

  useEffect(() => {
    const storedLanguage = localStorage.getItem('app_language');
    setLanguage(storedLanguage || 'en');
    const handleLanguageChange = () => {
      setLanguage(localStorage.getItem('app_language') || 'en');
    };
    window.addEventListener('language_changed', handleLanguageChange);
    window.addEventListener('storage', handleLanguageChange);
    return () => {
      window.removeEventListener('language_changed', handleLanguageChange);
      window.removeEventListener('storage', handleLanguageChange);
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterStartDate, filterEndDate]);

  const fetchMetadata = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMaterials([]);
        setSites([]);
        return;
      }
      const [matRes, siteRes] = await Promise.all([
        axios.get('http://localhost:5000/api/inventory/materials', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/api/inventory/sites', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      const materialsData = matRes.data?.data || matRes.data?.materials || [];
      const sitesData = siteRes.data?.data || siteRes.data?.sites || [];
      setMaterials(Array.isArray(materialsData) ? materialsData : []);
      setSites(Array.isArray(sitesData) ? sitesData : []);
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
      const data = res.data?.data || [];
      setRequests(data);
      setLoading(false);
      return data;
    } catch (err) {
      console.error('Failed to fetch requests', err);
      setLoading(false);
      return [];
    }
  };

  const syncRequestState = (updatedRequest) => {
    if (!updatedRequest?.id) return;
    setRequests((prev) => prev.map((req) => (req.id === updatedRequest.id ? updatedRequest : req)));
    setReviewRequest((prev) => (prev?.id === updatedRequest.id ? updatedRequest : prev));
    setSelectedRequest((prev) => (prev?.id === updatedRequest.id ? updatedRequest : prev));
  };

  const handleAddItem = () => {
    if (itemsLocked) return;
    const quantity = Number(currentItem.quantity);
    if (!currentItem.materialId || !Number.isFinite(quantity) || quantity <= 0) return;
    const selected = materials.find((m) => m.id.toString() === currentItem.materialId);
    setNewRequest(prev => ({
      ...prev,
      items: [...prev.items, { materialId: currentItem.materialId, quantity, unit: selected?.unit || null, name: selected?.name || '' }]
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
    try {
      const date = new Date();
      const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const autoDocumentNo = newRequest.documentNo?.trim() || `MR-${datePart}-${randomPart}`;
      const payload = {
        ...newRequest,
        documentNo: autoDocumentNo,
        siteId: parseInt(newRequest.siteId),
        items: newRequest.items.map(i => ({
          materialId: parseInt(i.materialId),
          quantity: parseInt(i.quantity),
          unit: i.unit || null
        }))
      };

      await axios.post('http://localhost:5000/api/requests', payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShowModal(false);
      setNewRequest({ siteId: '', items: [], documentNo: '', destination: '', project: '', description: '', urgency: 'HIGH', deadline: '' });
      fetchRequests();
    } catch (err) {
      console.error('Error creating request:', err.response?.data || err.message);
      const errorMessage = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || 'Gagal membuat permintaan';
      alert(errorMessage);
    }
  };

  const handleAction = async (id, actionUrl, payload = {}) => {
    try {
      const res = await axios.patch(`http://localhost:5000/api/requests/${id}/${actionUrl}`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const updatedRequest = res.data?.data;
      if (updatedRequest) {
        syncRequestState(updatedRequest);
      }
      const refreshedRequests = await fetchRequests();
      const latestRequest = Array.isArray(refreshedRequests)
        ? refreshedRequests.find((req) => req.id === updatedRequest?.id)
        : null;
      if (latestRequest) {
        syncRequestState(latestRequest);
      }
      window.dispatchEvent(new Event('mr_flow_update'));
      setShowReasonModal(false);
      setReasonValue('');
      setShowConfirmModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal memproses permintaan');
    }
  };

  const openConfirmation = (message, action) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setShowConfirmModal(true);
  };

  const openDoubleConfirmation = (messagePrimary, messageSecondary, action) => {
    openConfirmation(messagePrimary, () => {
      openConfirmation(messageSecondary, action);
    });
  };

  const openReasonModal = (title, action) => {
    setReasonTitle(title);
    setReasonValue('');
    setReasonAction(() => action);
    setShowReasonModal(true);
  };

  const handleReasonSubmit = async (e) => {
    e.preventDefault();
    const trimmed = reasonValue.trim();
    if (!trimmed) return;
    if (reasonAction) {
      await reasonAction(trimmed);
    }
  };

  const handleShip = async (e) => {
    e.preventDefault();
    if (!shipData.shippingPhotoFile) {
      alert('Mohon unggah foto bukti pengiriman');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('trackingNumber', shipData.trackingNumber);
      formData.append('shippingPhoto', shipData.shippingPhotoFile);
      if (shipData.eta) {
        formData.append('eta', shipData.eta);
      }
      await axios.patch(`http://localhost:5000/api/requests/${selectedRequest.id}/ship-noc`, formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShowShipModal(false);
      setShipData({ trackingNumber: '', shippingPhotoFile: null, shippingPhotoPreview: '', eta: '' });
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
    const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    // Use window.location.hostname to support access from other devices in the same network
    const host = window.location.hostname || 'localhost';
    return `http://${host}:5000${cleanPath}`;
  };

  const getRejectReason = (request) => {
    if (request?.status === 'REJECTED_BY_NOC') return request.nocDecisionNote;
    if (request?.status === 'REJECTED_BY_GM') return request.gmDecisionNote;
    return '';
  };

  const getReviewHistory = (request) => {
    const entries = [];

    if (request?.status !== 'PENDING') {
      const nocStatus = request?.status === 'REJECTED_BY_NOC' ? t('statusRejectedByNoc') : t('reviewedByNoc');
      const nocNote = request?.nocDecisionNote || (request?.status !== 'REJECTED_BY_NOC' ? 'Request diteruskan ke GM untuk approval.' : '');
      entries.push({ actor: 'NOC', status: nocStatus, note: nocNote });
    }

    if (['APPROVED_BY_GM', 'ON_DELIVERY', 'FULFILLED', 'REJECTED_BY_GM'].includes(request?.status)) {
      const gmStatus = request?.status === 'REJECTED_BY_GM' ? t('statusRejectedByGm') : t('approvedByGm');
      const gmNote = request?.gmDecisionNote || (request?.status !== 'REJECTED_BY_GM' ? 'Request disetujui untuk proses pengiriman.' : '');
      entries.push({ actor: 'GM', status: gmStatus, note: gmNote });
    }

    return entries;
  };

  const getStatusBadge = (status) => {
    const configs = {
      'PENDING': { label: t('statusPending'), color: 'bg-blue-50 text-blue-600 border-blue-100', icon: FiShield },
      'REVIEWED_BY_NOC': { label: t('statusReviewed'), color: 'bg-amber-50 text-amber-600 border-amber-100', icon: FiClock },
      'APPROVED_BY_GM': { label: t('statusApproved'), color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: FiCheckCircle },
      // 'APPROVED_READY_TO_SHIP': { label: t('statusReadyToShip'), color: 'bg-indigo-50 text-indigo-600 border-indigo-100', icon: FiTruck },
      'ON_DELIVERY': { label: t('statusOnDelivery'), color: 'bg-purple-50 text-purple-600 border-purple-100', icon: FiTruck },
      'FULFILLED': { label: t('statusFulfilled'), color: 'bg-slate-50 text-slate-600 border-slate-100', icon: FiCheckCircle },
      'REJECTED_BY_NOC': { label: t('statusRejectedByNoc'), color: 'bg-red-50 text-red-600 border-red-100', icon: FiXCircle },
      'REJECTED_BY_GM': { label: t('statusRejectedByGm'), color: 'bg-rose-50 text-rose-600 border-rose-100', icon: FiXCircle },
      'CANCELLED': { label: t('statusCancelled'), color: 'bg-slate-200 text-slate-600 border-slate-300', icon: FiXCircle },
    };
    const config = configs[status] || configs['PENDING'];
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
      case 'CRITICAL': return <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">{t('urgencyCritical')}</span>;
      case 'HIGH': return <span className="bg-orange-500 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">{t('urgencyHigh')}</span>;
      default: return <span className="bg-blue-500 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">{t('urgencyNormal')}</span>;
    }
  };

  const getSlaBadge = (req) => {
    const closedStatuses = ['FULFILLED', ...rejectedStatuses, 'CANCELLED'];
    if (closedStatuses.includes(req.status)) return null;
    const now = Date.now();
    const createdAt = new Date(req.createdAt).getTime();
    const deadline = req.deadline ? new Date(req.deadline).getTime() : null;
    const diffMs = deadline ? deadline - now : now - createdAt;
    const abs = Math.abs(diffMs);
    const days = Math.floor(abs / 86400000);
    const hours = Math.floor((abs % 86400000) / 3600000);
    const timeText = `${days}${t('daysShort')} ${hours}${t('hoursShort')}`;
    const isOverdue = deadline && diffMs < 0;
    const label = deadline ? (isOverdue ? t('slaOverdue') : t('slaDue')) : t('slaAge');
    const color = isOverdue
      ? 'bg-red-50 text-red-600 border-red-100'
      : deadline
        ? 'bg-amber-50 text-amber-700 border-amber-100'
        : 'bg-slate-50 text-slate-500 border-slate-100';
    return { label: `${label} ${timeText}`, color };
  };

  const filteredRequests = requests.filter((req) => {
    const keyword = searchTerm.toLowerCase();
    const project = (req.project || '').toLowerCase();
    const siteName = (req.Site?.name || '').toLowerCase();
    const idText = String(req.id || '');
    const documentNo = (req.documentNo || '').toLowerCase();
    const destination = (req.destination || '').toLowerCase();
    return project.includes(keyword) || siteName.includes(keyword) || idText.includes(keyword) || documentNo.includes(keyword) || destination.includes(keyword);
  });
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRequests = filteredRequests.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);
  const requestableSites = user?.role === 'OM'
    ? sites.filter((site) => {
      const name = String(site?.name || '').toLowerCase();
      return name.includes('papua') || name.includes('maluku');
    })
    : sites;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {isReviewRole ? t('reviewRequestsTitle') : t('materialRequestsTitle')}
          </h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium italic">
            {isReviewRole ? t('reviewRequestsSubtitle') : t('materialRequestsSubtitle')}
          </p>
        </div>
        {user?.role === 'OM' && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-2xl shadow-2xl shadow-red-200 transition-all flex items-center gap-3 font-black uppercase tracking-widest text-xs sm:text-sm border-2 border-red-500 active:scale-95"
          >
            <FiPlus size={22} className="stroke-[3]" />
            {t('newRequest')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content: Request List */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch">
            <div className="relative flex-1 w-full">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder={t('searchPlaceholder')} 
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-sundaya-red focus:border-transparent outline-none shadow-sm transition-all text-slate-600 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm w-full sm:w-auto">
                <FiFilter className="text-slate-400" size={16} />
                <select
                  className="bg-transparent text-xs font-black text-slate-600 uppercase tracking-widest focus:outline-none"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm w-full sm:w-auto">
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
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t('loadingRequests')}</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-20 text-center bg-white rounded-[2rem] border border-slate-50 shadow-sm">
              <FiFileText size={48} className="mx-auto text-slate-100 mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t('noRequests')}</p>
            </div>
          ) : paginatedRequests.map((req) => {
            const totalQty = (req.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
            const slaBadge = getSlaBadge(req);
            const rejectReason = getRejectReason(req);
            return (
            <div key={req.id} className="bg-white rounded-[2rem] border border-slate-50 shadow-sm overflow-hidden hover:shadow-xl hover:shadow-slate-100 transition-all group">
              <div className="p-5 sm:p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-sundaya-red uppercase tracking-widest">REQ-ID: {req.id.toString().padStart(4, '0')}</span>
                      {getStatusBadge(req.status)}
                      {getUrgencyBadge(req.urgency)}
                      {slaBadge && (
                        <span className={clsx("flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border", slaBadge.color)}>
                          <FiClock size={12} />
                          {slaBadge.label}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-800">{req.project}</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>{t('documentNoLabel')}: {req.documentNo || '-'}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{t('destinationLabel')}: {req.destination || '-'}</span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t('submittedOn')}</p>
                    <p className="text-sm font-bold text-slate-600">
                      {new Date(req.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400/70 mt-1">
                      {new Date(req.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} WIB
                    </p>
                    {req.deadline && (
                      <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mt-2">
                        {t('deadline')}: {new Date(req.deadline).toLocaleDateString(locale)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-6 border-y border-slate-50">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('siteLocation')}</p>
                    <div className="flex items-center gap-2 text-slate-600 font-bold">
                      <FiMapPin className="text-sundaya-red" />
                      <span>{req.Site?.name || sites.find((s) => s.id === req.siteId)?.name || req.site || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('material')}</p>
                    <div className="flex flex-col gap-1">
                      {req.items && req.items.length > 0 ? (
                        req.items.map((item, idx) => (
                          <div key={idx} className="text-slate-600 font-bold text-[11px] sm:text-xs flex flex-col gap-1">
                            <div className="flex justify-between">
                              <span>• {item.Material?.name || 'Unknown'}</span>
                              <span className="bg-slate-100 px-1.5 rounded text-[10px]">x{item.quantity} {item.unit || t('units')}</span>
                            </div>
                            {item.serialNumbers && (
                              <span className="text-[10px] font-bold text-slate-400 line-clamp-1" title={item.serialNumbers}>{item.serialNumbers}</span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-600 font-bold">N/A</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('totalItems')}</p>
                    <p className="text-slate-600 font-bold">{req.items?.length || 0} {t('types')} • {totalQty} {t('units')}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('project')}</p>
                    <p className="text-slate-600 font-bold truncate">{req.project}</p>
                  </div>
                </div>

                {req.description && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('descriptionNotes')}</p>
                    <p className="text-sm text-slate-600 italic">"{req.description}"</p>
                  </div>
                )}
                {rejectReason && (
                  <div className="mt-4 p-4 bg-red-50 rounded-2xl border border-red-100">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">{t('rejectReasonLabel')}</p>
                    <p className="text-sm font-bold text-red-700">{rejectReason}</p>
                  </div>
                )}
                {(user?.role === 'NOC' || user?.role === 'GM') && (
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleOpenReview(req)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:text-sundaya-red hover:border-sundaya-red transition-all"
                    >
                      <FiFileText size={12} />
                      {t('reviewLetterButton')}
                    </button>
                  </div>
                )}

                {req.trackingNumber && (
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <div className="flex items-center gap-3">
                      <FiTruck className="text-blue-600" />
                      <div>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{t('shippingTrackingNo')}</p>
                        <p className="text-sm font-bold text-blue-700">{req.trackingNumber}</p>
                      </div>
                    </div>
                    {req.shippingPhoto && (
                      <a href={getFileUrl(req.shippingPhoto)} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 hover:underline">
                        {t('viewPhoto')}
                      </a>
                    )}
                  </div>
                )}
                {req.eta && (
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <div className="flex items-center gap-3">
                      <FiCalendar className="text-indigo-600" />
                      <div>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{t('etaLabel')}</p>
                        <p className="text-sm font-bold text-indigo-700">{new Date(req.eta).toLocaleDateString(locale)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {req.receiptPhoto && (
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div className="flex items-center gap-3">
                      <FiCheckCircle className="text-emerald-600" />
                      <div>
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{t('receiptConfirmation')}</p>
                        <p className="text-sm font-bold text-emerald-700">{t('receiptConfirmed')}</p>
                      </div>
                    </div>
                    <a href={getFileUrl(req.receiptPhoto)} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-600 hover:underline">
                      {t('viewReceipt')}
                    </a>
                  </div>
                )}

                <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3 border-t border-slate-50 pt-6">
                  {user?.role === 'NOC' && req.status === 'APPROVED_BY_GM' && (
                    <button 
                      onClick={() => {
                        setSelectedRequest(req);
                        setShowShipModal(true);
                      }}
                      className="w-full sm:w-auto bg-sundaya-red hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-100"
                    >
                      <FiTruck />
                      {t('shipMaterial')}
                    </button>
                  )}
                  {user?.role === 'OM' && req.status === 'ON_DELIVERY' && (
                    <button 
                      onClick={() => {
                        setSelectedRequest(req);
                        setShowReceiveModal(true);
                      }}
                      className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                    >
                      <FiCheckCircle />
                      {t('confirmReceipt')}
                    </button>
                  )}
                  {user?.role === 'OM' && req.status === 'PENDING' && (
                    <button
                      onClick={() => {
                        openReasonModal(t('cancelReasonPrompt'), (reason) => handleAction(req.id, 'cancel', { reason }));
                      }}
                      className="w-full sm:w-auto bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
                    >
                      {t('cancelRequest')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )})}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('page')} {safePage} {t('of')} {totalPages}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                  disabled={safePage === 1}
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:text-sundaya-red hover:border-sundaya-red transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('prev')}
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage === totalPages}
                  className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-600 hover:text-sundaya-red hover:border-sundaya-red transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('next')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-50 shadow-sm space-y-6">
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

          <div className="bg-slate-900 p-6 sm:p-8 rounded-[2rem] text-white space-y-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <FiInfo className="text-sundaya-red" size={24} />
            </div>
            <h4 className="text-lg font-bold leading-tight">{t('helpTitle')}</h4>
            <p className="text-slate-400 text-xs font-medium leading-relaxed">
              {t('helpDescription')}
            </p>
            <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
              {t('helpCta')}
            </button>
          </div>
        </div>
      </div>

      {/* Ship Modal */}
      {showShipModal && (
        <div className={clsx("fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm", modalLayers.base)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-enter">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t('shipModalTitle')}</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{t('shipModalSubtitle')}</p>
              </div>
              <button onClick={() => setShowShipModal(false)} className="p-3 hover:bg-white rounded-2xl text-slate-400 hover:text-sundaya-red transition-all shadow-sm">
                <FiXCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleShip} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t('trackingNumberLabel')}</label>
                  <div className="relative">
                    <FiTruck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      required
                      type="text"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-sundaya-red outline-none text-slate-700 font-bold placeholder:text-slate-300"
                      placeholder={t('trackingNumberPlaceholder')}
                      value={shipData.trackingNumber}
                      onChange={(e) => setShipData({ ...shipData, trackingNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t('shippingPhotoLabel')}</label>
                  <div className="flex items-center gap-4">
                    <label className="flex-1 px-5 py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-sundaya-red transition-all font-bold text-slate-500 text-xs uppercase tracking-widest text-center">
                      {t('uploadPhoto')}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          setShipData({
                            ...shipData,
                            shippingPhotoFile: file || null,
                            shippingPhotoPreview: file ? URL.createObjectURL(file) : ''
                          });
                        }}
                      />
                    </label>
                    {shipData.shippingPhotoPreview && (
                      <img src={shipData.shippingPhotoPreview} alt="" className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-sm" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium italic ml-1">{t('shippingPhotoHelp')}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t('etaLabel')}</label>
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
                  {t('cancel')}
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 px-6 bg-sundaya-red hover:bg-red-700 text-white rounded-2xl font-bold shadow-lg shadow-red-100 transition-all uppercase tracking-widest text-xs active:scale-95"
                >
                  {t('confirmShip')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReceiveModal && selectedRequest && (
        <div className={clsx("fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm", modalLayers.base)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-enter">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t('receiveModalTitle')}</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{t('receiveModalSubtitle')}</p>
              </div>
              <button onClick={() => setShowReceiveModal(false)} className="p-3 hover:bg-white rounded-2xl text-slate-400 hover:text-sundaya-red transition-all shadow-sm">
                <FiXCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleReceive} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{t('receivePhotoLabel')}</label>
                <div className="flex items-center gap-4">
                  <label className="flex-1 px-5 py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-sundaya-red transition-all font-bold text-slate-500 text-xs uppercase tracking-widest text-center">
                    {t('uploadPhoto')}
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
                  {t('confirmReceipt')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReasonModal && (
        <div className={clsx("fixed inset-0 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm", modalLayers.reason)}>
          <div className="relative z-[91] bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-enter">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">{reasonTitle}</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{t('confirmActionSubtitle')}</p>
              </div>
              <button onClick={() => setShowReasonModal(false)} className="p-3 hover:bg-white rounded-2xl text-slate-400 hover:text-sundaya-red transition-all shadow-sm">
                <FiXCircle size={22} />
              </button>
            </div>
            <form onSubmit={handleReasonSubmit} className="p-8 space-y-6">
              <textarea
                className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700 min-h-[120px]"
                placeholder={t('reasonPlaceholder')}
                value={reasonValue}
                onChange={(e) => setReasonValue(e.target.value)}
                required
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowReasonModal(false)}
                  className="flex-1 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-widest text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 transition-all uppercase tracking-widest text-xs"
                >
                  {t('submitReason')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className={clsx("fixed inset-0 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm", modalLayers.confirm)}>
          <div className="relative z-[81] bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-enter">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">{t('confirmActionTitle')}</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{t('confirmActionSubtitle')}</p>
              </div>
              <button onClick={() => setShowConfirmModal(false)} className="p-3 hover:bg-white rounded-2xl text-slate-400 hover:text-sundaya-red transition-all shadow-sm">
                <FiXCircle size={22} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-sm font-bold text-slate-700">{confirmMessage}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all uppercase tracking-widest text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => confirmAction && confirmAction()}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 transition-all uppercase tracking-widest text-xs"
                >
                  {t('yesContinue')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && reviewRequest && (
        <div className={clsx(
          "fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm",
          modalLayers.review,
          (showReasonModal || showConfirmModal) && "pointer-events-none"
        )}>
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-enter">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t('reviewLetterTitle')}</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{t('reviewLetterSubtitle')}</p>
              </div>
              <button onClick={() => setShowReviewModal(false)} className="p-3 hover:bg-white rounded-2xl text-slate-400 hover:text-sundaya-red transition-all shadow-sm">
                <FiXCircle size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('requestId')}</p>
                  <p className="text-xl font-black text-slate-800">REQ-{reviewRequest.id.toString().padStart(4, '0')}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('submittedOn')}</p>
                  <p className="text-sm font-bold text-slate-600">
                    {new Date(reviewRequest.createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400/70">
                    {new Date(reviewRequest.createdAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} WIB
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('siteLocation')}</p>
                  <p className="text-sm font-bold text-slate-700">{reviewRequest.Site?.name || reviewRequest.site || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('project')}</p>
                  <p className="text-sm font-bold text-slate-700">{reviewRequest.project}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('documentNoLabel')}</p>
                  <p className="text-sm font-bold text-slate-700">{reviewRequest.documentNo || '-'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('destinationLabel')}</p>
                  <p className="text-sm font-bold text-slate-700">{reviewRequest.destination || '-'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('urgencyLabel')}</p>
                  {getUrgencyBadge(reviewRequest.urgency)}
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('statusLabel')}</p>
                  {getStatusBadge(reviewRequest.status)}
                </div>
              </div>

              <div className="border border-slate-100 rounded-2xl p-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('requestedMaterials')}</p>
                <div className="space-y-2">
                  {(reviewRequest.items && reviewRequest.items.length > 0) ? (
                    reviewRequest.items.map((item, idx) => (
                      <div key={idx} className="flex flex-col gap-1 text-sm font-bold text-slate-700">
                        <div className="flex items-center justify-between">
                          <span>• {item.Material?.name || 'Unknown'}</span>
                          <span className="text-slate-500">x{item.quantity} {item.unit || t('units')}</span>
                        </div>
                        {item.serialNumbers && (
                          <span className="text-[10px] font-bold text-slate-400 line-clamp-1" title={item.serialNumbers}>{item.serialNumbers}</span>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-bold text-slate-500">N/A</p>
                  )}
                </div>
              </div>

              {reviewRequest.description && (
                <div className="bg-slate-50 rounded-2xl p-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('descriptionNotes')}</p>
                  <p className="text-sm text-slate-600 italic">"{reviewRequest.description}"</p>
                </div>
              )}

              {getRejectReason(reviewRequest) && (
                <div className="bg-red-50 rounded-2xl border border-red-100 p-6">
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">{t('rejectReasonLabel')}</p>
                  <p className="text-sm font-bold text-red-700">{getRejectReason(reviewRequest)}</p>
                </div>
              )}

              {(reviewRequest.shippingPhoto || reviewRequest.receiptPhoto) && (
                <div className="grid grid-cols-2 gap-4">
                  {reviewRequest.shippingPhoto && (
                    <div className="bg-slate-50 rounded-2xl p-6">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('shippingPhoto')}</p>
                      <a 
                        href={getFileUrl(reviewRequest.shippingPhoto)} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-2"
                      >
                        <FiImage /> {t('viewPhoto')}
                      </a>
                    </div>
                  )}
                  {reviewRequest.receiptPhoto && (
                    <div className="bg-slate-50 rounded-2xl p-6">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('receiptPhoto')}</p>
                      <a 
                        href={getFileUrl(reviewRequest.receiptPhoto)} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-2"
                      >
                        <FiImage /> {t('viewPhoto')}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {getReviewHistory(reviewRequest).length > 0 && (
                <div className="bg-white border border-slate-100 rounded-2xl p-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('reviewHistoryTitle')}</p>
                  <div className="space-y-3">
                    {getReviewHistory(reviewRequest).map((entry) => (
                      <div key={`${entry.actor}-${entry.status}`} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-black text-slate-700">{entry.actor}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{entry.status}</p>
                        </div>
                        {entry.note && (
                          <p className="mt-2 text-sm font-bold text-slate-600">{entry.note}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(user?.role === 'NOC' && reviewRequest.status === 'PENDING') && (
                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => openDoubleConfirmation(
                      t('confirmNocPrimary'),
                      t('confirmNocSecondary'),
                      () => handleAction(reviewRequest.id, 'review-noc', { approved: true })
                    )}
                    className="flex-1 py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 transition-all uppercase tracking-widest text-xs"
                  >
                    {t('approveNoc')}
                  </button>
                  <button 
                    onClick={() => {
                      openReasonModal(t('rejectReasonPrompt'), (reason) => handleAction(reviewRequest.id, 'review-noc', { approved: false, reason }));
                    }}
                    className="flex-1 py-4 px-6 rounded-2xl font-bold text-red-600 hover:bg-red-50 transition-all uppercase tracking-widest text-xs border border-red-100"
                  >
                    {t('rejectNoc')}
                  </button>
                </div>
              )}
              {(user?.role === 'GM' && reviewRequest.status === 'REVIEWED_BY_NOC') && (
                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => openConfirmation(
                      t('confirmGmPrimary'),
                      () => handleAction(reviewRequest.id, 'approve-gm', { approved: true })
                    )}
                    className="flex-1 py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 transition-all uppercase tracking-widest text-xs"
                  >
                    {t('approveGm')}
                  </button>
                  <button 
                    onClick={() => {
                      openReasonModal(t('rejectReasonPrompt'), (reason) => handleAction(reviewRequest.id, 'approve-gm', { approved: false, reason }));
                    }}
                    className="flex-1 py-4 px-6 rounded-2xl font-bold text-red-600 hover:bg-red-50 transition-all uppercase tracking-widest text-xs border border-red-100"
                  >
                    {t('rejectGm')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Buat Request */}
      {showModal && (
        <div className={clsx("fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm", modalLayers.base)}>
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[2.5rem] shadow-2xl animate-in fade-in zoom-in duration-300">
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
                    {requestableSites.length === 0 && (
                      <option value="" disabled>Site belum tersedia</option>
                    )}
                    {requestableSites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">{t('destinationLabel')}</label>
                <input
                  type="text"
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-sundaya-red focus:outline-none transition-all font-bold text-slate-700"
                  placeholder="Contoh: Site Papua"
                  value={newRequest.destination}
                  onChange={(e) => setNewRequest({...newRequest, destination: e.target.value})}
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

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">Urgensi Kebutuhan</label>
                  <div className="flex gap-3">
                    {['HIGH', 'CRITICAL'].map((level) => (
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
                        {level === 'HIGH' ? 'Penting' : 'Sangat Penting'}
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
                        {item.name || materials.find(m => m.id.toString() === item.materialId)?.name || '-'}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400">Qty: {item.quantity} {item.unit || t('units')}</p>
                      {item.serialNumbers && (
                        <p className="text-[10px] font-bold text-slate-400 line-clamp-1" title={item.serialNumbers}>{item.serialNumbers}</p>
                      )}
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
                      onChange={(e) => {
                        const value = e.target.value;
                        setCurrentItem({
                          ...currentItem,
                          materialId: value
                        });
                      }}
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
                      onChange={(e) => {
                        const value = e.target.value;
                        const parsed = parseInt(value, 10);
                        setCurrentItem({
                          ...currentItem,
                          quantity: Number.isNaN(parsed) ? '' : parsed
                        });
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
                disabled={newRequest.items.length === 0}
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
