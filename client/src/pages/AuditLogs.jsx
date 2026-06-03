import React, { useState, useEffect } from 'react';
import { 
  FiActivity, FiSearch, FiFilter, FiUser, 
  FiClock, FiDatabase, FiArrowRight 
} from 'react-icons/fi';
import axios from 'axios';
import { clsx } from 'clsx';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/inventory/audit-logs', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setLogs(res.data.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch logs', err);
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Audit Logs</h1>
        <p className="text-slate-500 mt-1 font-medium italic">Rekam jejak aktivitas transaksi dan perubahan database</p>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-50 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/30">
          <div className="relative flex-1 w-full max-w-md">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari User, Aktivitas, atau Entitas..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl focus:ring-2 focus:ring-sundaya-red transition-all font-medium text-slate-600 text-sm"
            />
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-sundaya-red transition-all shadow-sm">
              <FiFilter /> Filter Tanggal
            </button>
            <button className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg">
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu & Tanggal</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">User PIC</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aktivitas</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detail Modifikasi</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Modul</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-20 text-center">
                    <div className="w-10 h-10 border-4 border-slate-100 border-t-sundaya-red rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Membaca Log Server...</p>
                  </td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-100 rounded-xl text-slate-400 group-hover:bg-white group-hover:text-sundaya-red transition-all">
                        <FiClock />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">{new Date(log.createdAt).toLocaleDateString('id-ID')}</p>
                        <p className="text-[10px] font-bold text-slate-400">{new Date(log.createdAt).toLocaleTimeString('id-ID')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-sundaya-red/10 rounded-full flex items-center justify-center text-sundaya-red font-black text-[10px]">
                        {log.user ? log.user.charAt(0) : '?'}
                      </div>
                      <span className="text-sm font-bold text-slate-700">{log.user || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={clsx(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                      log.action.includes('CREATE') ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                      log.action.includes('DELETE') ? "bg-red-50 text-red-600 border-red-100" :
                      "bg-blue-50 text-blue-600 border-blue-100"
                    )}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-medium text-slate-600 max-w-xs truncate">{log.details}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                      <FiDatabase size={14} />
                      {log.module}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
