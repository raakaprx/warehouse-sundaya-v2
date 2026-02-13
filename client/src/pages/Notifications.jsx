import React, { useEffect, useState } from 'react';
import { FiBell, FiClock, FiCheckCircle } from 'react-icons/fi';
import axios from 'axios';
import { clsx } from 'clsx';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/notifications', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setNotifications(res.data.data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markRead = async (id) => {
    try {
      await axios.patch(`http://localhost:5000/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchNotifications();
    } catch (err) {
      alert('Gagal menandai notifikasi');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Notifications</h1>
        <p className="text-slate-500 mt-1 font-medium italic">Riwayat notifikasi sistem dan perubahan status</p>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-50 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
              <FiBell />
            </div>
            <span className="text-sm font-black uppercase tracking-widest text-slate-700">Notification Feed</span>
          </div>
          <div className="text-xs font-bold text-slate-400">{notifications.length} items</div>
        </div>

        {loading ? (
          <div className="p-20 text-center">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-sundaya-red rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Memuat Notifikasi...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
            Belum ada notifikasi
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notifications.map((item) => (
              <div key={item.id} className="p-6 flex items-center justify-between hover:bg-slate-50/40 transition-colors">
                <div className="flex items-start gap-4">
                  <div className={clsx(
                    "w-10 h-10 rounded-2xl flex items-center justify-center",
                    item.readAt ? "bg-slate-100 text-slate-400" : "bg-emerald-100 text-emerald-600"
                  )}>
                    {item.readAt ? <FiCheckCircle /> : <FiBell />}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-700">{item.message}</p>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                      <FiClock />
                      {new Date(item.createdAt).toLocaleDateString('id-ID')} • {new Date(item.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                {!item.readAt && (
                  <button
                    onClick={() => markRead(item.id)}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
