import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell, PieChart, Pie } from 'recharts';
import { MapPin, TrendingUp, AlertTriangle, Package, FileText, Download, Filter, Calendar, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-sundaya-light transition-all duration-300">
    <div className="flex items-center space-x-4">
        <div className={clsx("p-3 rounded-xl transition-transform group-hover:scale-110 duration-300", color)}>
            <Icon size={24} className="text-white" />
        </div>
        <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{title}</p>
            <h3 className="text-2xl font-black text-gray-800">{value}</h3>
        </div>
    </div>
    {trend && (
        <div className="text-right">
            <span className="text-[10px] font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full">{trend}</span>
        </div>
    )}
  </div>
);

const SuperDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const fetchStats = async () => {
    setRefreshing(true);
    try {
      const res = await axios.get('http://localhost:5000/api/reports/stats', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStats(res.data.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        navigate('/login');
        return;
      }
      console.error('Failed to fetch stats', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleExport = async (type) => {
    try {
      const token = localStorage.getItem('token');
      window.open(`http://localhost:5000/api/reports/export?type=${type}&token=${token}`, '_blank');
    } catch (err) {
      alert('Gagal mengekspor laporan');
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="text-sundaya-primary animate-spin" size={48} />
        <p className="text-gray-500 font-bold animate-pulse uppercase tracking-widest text-xs">Preparing Executive Data...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Executive Dashboard</h1>
          <div className="flex items-center gap-2 text-gray-500">
            <Calendar size={16} className="text-sundaya-primary" />
            <p className="text-sm font-medium">Real-time Global Warehouse Analytics • {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            <button 
                onClick={fetchStats}
                disabled={refreshing}
                className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
                title="Refresh Data"
            >
                <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
            </button>
            <div className="h-10 w-[1px] bg-gray-200 mx-2 hidden md:block" />
            <button 
                onClick={() => handleExport('PDF')}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 font-bold text-sm hover:bg-gray-50 transition-all shadow-sm"
            >
                <FileText size={18} className="text-sundaya-primary" />
                Export PDF
            </button>
            <button 
                onClick={() => handleExport('EXCEL')}
                className="flex items-center gap-2 px-5 py-2.5 bg-sundaya-primary text-white rounded-xl font-bold text-sm hover:bg-sundaya-dark transition-all shadow-lg shadow-sundaya-primary/20"
            >
                <Download size={18} />
                Download Excel
            </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Total Sites" 
            value={stats?.totalSites || 0} 
            icon={MapPin} 
            color="bg-blue-500" 
        />
        <StatCard 
            title="Total Stock Items" 
            value={stats?.totalInventoryValue.toLocaleString() || 0} 
            icon={Package} 
            color="bg-sundaya-primary" 
            trend="+12% MoM"
        />
        <StatCard 
            title="Critical Needs" 
            value={stats?.lowStockAlerts || 0} 
            icon={AlertTriangle} 
            color="bg-orange-500" 
        />
        <StatCard 
            title="Weekly Turnover" 
            value={stats?.weeklyMovement || '0%'} 
            icon={TrendingUp} 
            color="bg-green-500" 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Stock by Site Chart */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div>
                <h3 className="text-lg font-black text-gray-800">Capacity vs Stock per Site</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Global Material Distribution</p>
            </div>
            <Filter size={20} className="text-gray-300 cursor-pointer hover:text-sundaya-primary transition-colors" />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.siteData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}} 
                    dy={10}
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}} 
                />
                <Tooltip 
                    cursor={{fill: '#F9FAFB'}}
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px'}}
                />
                <Bar dataKey="stock" fill="#E73E3E" name="Current Stock" radius={[6, 6, 0, 0]} barSize={40} />
                <Bar dataKey="capacity" fill="#FEE2E2" name="Max Capacity" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Global Flow Chart */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div>
                <h3 className="text-lg font-black text-gray-800">Global Inbound/Outbound Flow</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Activity Trend (Last 7 Days)</p>
            </div>
            <TrendingUp size={20} className="text-green-500" />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.flowData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}} 
                    dy={10}
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}} 
                />
                <Tooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px'}}
                />
                <Line 
                    type="monotone" 
                    dataKey="in" 
                    stroke="#E73E3E" 
                    strokeWidth={4} 
                    dot={{fill: '#E73E3E', strokeWidth: 2, r: 4}} 
                    activeDot={{r: 8}}
                    name="Barang Masuk"
                />
                <Line 
                    type="monotone" 
                    dataKey="out" 
                    stroke="#10B981" 
                    strokeWidth={4} 
                    dot={{fill: '#10B981', strokeWidth: 2, r: 4}} 
                    activeDot={{r: 8}}
                    name="Barang Keluar"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Bottom Section: Critical Alerts & Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="text-lg font-black text-gray-800">Alert Sistem Kritis</h3>
                  <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-widest">Membutuhkan Tindakan</span>
              </div>
              <div className="p-8">
                  <div className="space-y-4">
                      {[
                          { site: 'Papua', msg: 'Solar Home System 50W di bawah threshold (15 unit)', time: '2 jam yang lalu' },
                          { site: 'Maluku', msg: 'Battery 12V 100Ah stok kritis (2 unit)', time: '5 jam yang lalu' },
                          { site: 'Pusat', msg: 'Permintaan material #REQ-882 belum di-approve GM', time: '1 hari yang lalu' }
                      ].map((alert, i) => (
                          <div key={i} className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 group hover:bg-white hover:border-sundaya-light transition-all duration-300">
                              <div className="flex items-center space-x-4">
                                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                                      <AlertTriangle size={20} className="text-sundaya-primary" />
                                  </div>
                                  <div>
                                      <p className="text-sm font-black text-gray-800">{alert.msg}</p>
                                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Site: {alert.site}</p>
                                  </div>
                              </div>
                              <span className="text-[10px] font-bold text-gray-400 italic">{alert.time}</span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-900/30 ring-1 ring-white/10">
              <div className="relative z-10 h-full flex flex-col">
                  <TrendingUp size={40} className="text-white mb-6 opacity-80" />
                  <h3 className="text-xl font-black mb-2 tracking-tight text-white">Insight Efisiensi</h3>
                  <p className="text-indigo-100 text-sm leading-relaxed mb-8 font-medium">
                      Pengiriman ke Site Papua meningkat 15% bulan ini. Disarankan untuk menambah buffer stok di Gudang Pusat untuk SKU-SHS-50W.
                  </p>
                  <div className="mt-auto space-y-4">
                      <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/20">
                          <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-1">Lead Time Rata-rata</p>
                          <p className="text-xl font-black text-white">4.2 Hari</p>
                      </div>
                      <button className="w-full bg-white text-indigo-900 py-4 rounded-2xl font-black text-sm hover:bg-indigo-50 transition-colors shadow-xl">
                          Lihat Detail Analitik
                      </button>
                  </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/40 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-500/40 rounded-full blur-3xl"></div>
          </div>
      </div>
    </div>
  );
};

export default SuperDashboard;
