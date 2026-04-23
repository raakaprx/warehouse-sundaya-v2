import React, { useState, useEffect } from 'react';
import { 
  FiTruck, FiPackage, FiMapPin, FiCalendar, FiSearch, 
  FiFilter, FiExternalLink, FiCamera, FiCheckCircle 
} from 'react-icons/fi';
import axios from 'axios';
import { clsx } from 'clsx';

const ShippingControl = () => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/inventory/shipments', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShipments(res.data.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch shipments', err);
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      'DELIVERED': { label: 'Sampai Tujuan', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
      'IN_TRANSIT': { label: 'Dalam Perjalanan', color: 'bg-blue-50 text-blue-600 border-blue-100' },
      'PENDING': { label: 'Menunggu Kurir', color: 'bg-slate-50 text-slate-500 border-slate-100' }
    };
    const config = configs[status] || configs['PENDING'];
    return (
      <span className={clsx("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", config.color)}>
        {config.label}
      </span>
    );
  };

  const filteredShipments = shipments.filter((ship) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      String(ship.resi || '').toLowerCase().includes(q) ||
      String(ship.project || '').toLowerCase().includes(q) ||
      String(ship.expedition || '').toLowerCase().includes(q) ||
      String(ship.to || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Shipping Control</h1>
        <p className="text-slate-500 mt-1 font-medium italic">Monitoring ekspedisi dan bukti serah terima barang</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-center bg-white p-4 rounded-[2rem] border border-slate-50 shadow-sm">
        <div className="relative flex-1 w-full">
          <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari Resi, Proyek, atau Ekspedisi..." 
            className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-sundaya-red transition-all font-medium text-slate-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-sundaya-red transition-all">
          <FiFilter size={20} />
        </button>
      </div>

      {loading ? (
        <div className="p-20 text-center bg-white rounded-[2.5rem] border border-slate-50 shadow-sm">
          <div className="w-12 h-12 border-4 border-slate-100 border-t-sundaya-red rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Melacak Posisi Armada...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredShipments.map((ship) => (
            <div key={ship.id} className="bg-white rounded-[2.5rem] border border-slate-50 shadow-sm overflow-hidden hover:shadow-xl hover:shadow-slate-100 transition-all">
              <div className="p-8 flex flex-col lg:flex-row gap-8">
                {/* Info Utama */}
                <div className="flex-1 space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-sundaya-red uppercase tracking-widest">{ship.resi}</span>
                        {getStatusBadge(ship.status)}
                      </div>
                      <h3 className="text-xl font-bold text-slate-800">{ship.project}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ekspedisi</p>
                      <p className="text-sm font-bold text-slate-600">{ship.expedition}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-y border-slate-50">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rute Pengiriman</p>
                      <div className="flex items-center gap-2 text-slate-600 font-bold">
                        <FiMapPin className="text-sundaya-red shrink-0" />
                        <span className="truncate">{ship.from} → {ship.to}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estimasi Tiba</p>
                      <div className="flex items-center gap-2 text-slate-600 font-bold">
                        <FiCalendar className="text-sundaya-red shrink-0" />
                        <span>{new Date(ship.estimatedArrival).toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Driver / PIC</p>
                      <div className="flex items-center gap-2 text-slate-600 font-bold">
                        <FiCheckCircle className="text-emerald-500 shrink-0" />
                        <span>{ship.driver}</span>
                      </div>
                    </div>
                  </div>

                  <button className="flex items-center gap-2 text-xs font-black text-sundaya-red uppercase tracking-widest hover:underline transition-all">
                    Lihat Detail Manifest <FiExternalLink />
                  </button>
                </div>

                {/* Bukti Foto Section */}
                <div className="lg:w-72 space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <FiCamera /> Bukti Dokumentasi
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="group relative aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100 flex items-center justify-center overflow-hidden hover:border-sundaya-red transition-all cursor-pointer">
                      {ship.proofResi ? (
                        <img src={ship.proofResi} alt="Resi" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      ) : (
                        <span className="text-[9px] font-black text-slate-300 uppercase">Resi</span>
                      )}
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <FiSearch className="text-white" size={24} />
                      </div>
                    </div>
                    <div className="group relative aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100 flex items-center justify-center overflow-hidden hover:border-sundaya-red transition-all cursor-pointer">
                      {ship.proofItems ? (
                        <img src={ship.proofItems} alt="Barang" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      ) : (
                        <span className="text-[9px] font-black text-slate-300 uppercase">Barang</span>
                      )}
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <FiSearch className="text-white" size={24} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShippingControl;
