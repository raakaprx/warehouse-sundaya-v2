import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { 
  Activity, AlertTriangle, Clock, MapPin, 
  CheckCircle, Package, TrendingUp,
  Filter, RefreshCw, ChevronRight, BarChart3,
  AlertCircle, Truck, Info, MessageSquare
} from 'lucide-react';
import axios from 'axios';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import socket from '../utils/socket';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const StatCard = ({ title, value, subValue, icon: Icon, color, trend }) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between group hover:border-sundaya-light transition-all duration-300">
    <div className="flex items-center justify-between mb-4">
      <div className={clsx("p-3 rounded-2xl transition-transform group-hover:scale-110 duration-300", color)}>
        <Icon size={24} className="text-white" />
      </div>
      {trend && (
        <span className={clsx(
          "text-[10px] font-bold px-2 py-1 rounded-full",
          trend.startsWith('+') ? "text-green-500 bg-green-50" : "text-red-500 bg-red-50"
        )}>
          {trend}
        </span>
      )}
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
      <div className="flex items-baseline space-x-2">
        <h3 className="text-3xl font-black text-slate-800">{value}</h3>
        {subValue && <span className="text-sm font-bold text-slate-400">{subValue}</span>}
      </div>
    </div>
  </div>
);

const SuperDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [executiveNotes, setExecutiveNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      const [reportRes, notesRes] = await Promise.all([
        axios.get('http://localhost:5000/api/reports/executive', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5000/api/reports/notes', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      if (reportRes.data && reportRes.data.success) {
        setData(reportRes.data.data);
      }
      if (notesRes.data && notesRes.data.success) {
        setExecutiveNotes(notesRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch executive data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen for real-time executive notes
    socket.on('new_executive_note', (note) => {
      if (note.targetRole === 'ALL' || note.targetRole === user?.role) {
        setExecutiveNotes(prev => [note, ...prev].slice(0, 10));
        toast.success(`Arahan Baru dari GM: ${note.message.substring(0, 50)}...`, {
          icon: '📢',
          duration: 5000
        });
      }
    });

    return () => {
      socket.off('new_executive_note');
    };
  }, [user?.role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sundaya"></div>
          <p className="text-slate-500 font-medium">Memuat data dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="bg-red-50 text-red-500 p-4 rounded-full inline-block">
            <AlertCircle size={48} />
          </div>
          <h2 className="text-2xl font-black text-slate-800">Gagal Memuat Data</h2>
          <div className="bg-red-50 p-4 rounded-2xl text-red-600 text-sm font-mono break-all max-w-lg">
            Data laporan belum tersedia saat ini.
          </div>
          <button 
            onClick={fetchData}
            className="px-6 py-3 bg-sundaya text-white rounded-2xl font-bold hover:bg-blue-600 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard NOC</h1>
          <p className="text-slate-500 font-medium">Ringkasan operasional dan performa alur material.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={fetchData}
            className={clsx(
              "p-3 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all",
              refreshing && "animate-spin"
            )}
          >
            <RefreshCw size={20} />
          </button>
          <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
            <Filter size={16} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-600">Semua Waktu</span>
          </div>
        </div>
      </div>

      {/* 1. Ringkasan Request Material */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Requests" 
          value={data.summary.total} 
          icon={Activity} 
          color="bg-blue-500"
        />
        <StatCard 
          title="Request Pending" 
          value={data.summary.pending} 
          icon={Clock} 
          color="bg-amber-500"
          trend={`${Math.round((data.summary.pending / data.summary.total) * 100)}%`}
        />
        <StatCard 
          title="Request Approved" 
          value={data.summary.approved} 
          icon={CheckCircle} 
          color="bg-emerald-500"
        />
        <StatCard 
          title="Request Completed" 
          value={data.summary.completed} 
          icon={Package} 
          color="bg-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 2. Active Alerts */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800">Alert Aktif</h3>
              <AlertCircle className="text-red-500" size={24} />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-red-50 border border-red-100">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-sm font-bold text-red-700">Stok Kritis</span>
                </div>
                <span className="text-2xl font-black text-red-700">{data.alerts.critical}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 border border-amber-100">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <span className="text-sm font-bold text-amber-700">Stok Warning</span>
                </div>
                <span className="text-2xl font-black text-amber-700">{data.alerts.warning}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                  <span className="text-sm font-bold text-slate-700">Stok Habis</span>
                </div>
                <span className="text-2xl font-black text-slate-700">{data.alerts.out}</span>
              </div>
            </div>
            <button className="w-full mt-6 py-3 text-sm font-bold text-slate-500 hover:text-sundaya transition-colors flex items-center justify-center space-x-2">
              <span>Lihat Semua Alert</span>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* 3. Operational Bottlenecks */}
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800">Bottleneck</h3>
              <Clock className="text-amber-500" size={24} />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-bold">Pending di OM</span>
                <span className="text-slate-800 font-black">{data.bottlenecks.om}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${(data.bottlenecks.om / data.summary.total) * 100}%` }}></div>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-bold">Review NOC</span>
                <span className="text-slate-800 font-black">{data.bottlenecks.noc}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: `${(data.bottlenecks.noc / data.summary.total) * 100}%` }}></div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-bold">Approval GM</span>
                <span className="text-slate-800 font-black">{data.bottlenecks.gm}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${(data.bottlenecks.gm / data.summary.total) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Visual Summary Charts */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-800">Tren Permintaan Material</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-sundaya"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Requests</span>
                </div>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.charts.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="requests" 
                    stroke="#00A3FF" 
                    strokeWidth={4} 
                    dot={{ r: 6, fill: '#00A3FF', strokeWidth: 3, stroke: '#fff' }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
              <h3 className="text-xl font-black text-slate-800 mb-6">Status Distribusi</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.charts.statusDistribution}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {data.charts.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
              <h3 className="text-xl font-black text-slate-800 mb-6">Request Per Site</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.requestsBySite}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    />
                    <YAxis hide />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Monitoring Distribusi Material (Site Papua & Maluku) */}
      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Monitoring Distribusi Material</h3>
            <p className="text-slate-500 text-sm font-medium">Fokus area Site Papua dan Site Maluku.</p>
          </div>
          <MapPin className="text-sundaya" size={24} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {data.distribution.map((dist, idx) => (
            <div key={idx} className="p-6 rounded-3xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-2xl bg-white shadow-sm border border-slate-100">
                    <MapPin size={20} className="text-sundaya" />
                  </div>
                  <h4 className="font-black text-slate-800">{dist.site}</h4>
                </div>
                <span className="px-3 py-1 bg-white rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100">Aktif</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Terkirim</p>
                  <p className="text-2xl font-black text-slate-800">{dist.totalSent}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">On Delivery</p>
                  <div className="flex items-center space-x-2">
                    <Truck size={16} className="text-amber-500" />
                    <p className="text-2xl font-black text-slate-800">{dist.onDelivery}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Performance Monitoring / KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-lg shadow-indigo-100">
          <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mb-2">Average Approval Time</p>
          <div className="flex items-baseline space-x-2">
            <h4 className="text-4xl font-black">{data.performance.avgApprovalTime}</h4>
          </div>
          <p className="text-indigo-200 text-xs mt-4 flex items-center space-x-2">
            <Clock size={14} />
            <span>SLA: 3.0 Days</span>
          </p>
        </div>
        <div className="bg-emerald-600 p-8 rounded-[2rem] text-white shadow-lg shadow-emerald-100">
          <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest mb-2">SLA Fulfillment</p>
          <div className="flex items-baseline space-x-2">
            <h4 className="text-4xl font-black">{data.performance.slaFulfillment}</h4>
          </div>
          <p className="text-emerald-200 text-xs mt-4 flex items-center space-x-2">
            <TrendingUp size={14} />
            <span>Target: 95%</span>
          </p>
        </div>
        <div className="bg-slate-800 p-8 rounded-[2rem] text-white shadow-lg shadow-slate-200">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Monthly Completed</p>
          <div className="flex items-baseline space-x-2">
            <h4 className="text-4xl font-black">{data.performance.monthlyCompleted}</h4>
          </div>
          <p className="text-slate-400 text-xs mt-4 flex items-center space-x-2">
            <Package size={14} />
            <span>Total across all sites</span>
          </p>
        </div>
      </div>

      {/* Executive Notes Section (Receive Only) */}
      {executiveNotes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 px-1">
            <MessageSquare className="text-sundaya-red" />
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Arahan Eksekutif (GM)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {executiveNotes.map((note) => (
              <div key={note.id} className={clsx(
                "p-5 rounded-[2rem] border shadow-sm transition-all hover:shadow-md",
                note.priority === 'URGENT' 
                  ? "bg-red-50 border-red-100 text-red-900" 
                  : "bg-white border-slate-100 text-slate-800"
              )}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={clsx(
                      "w-2 h-2 rounded-full",
                      note.priority === 'URGENT' ? "bg-red-500 animate-pulse" : "bg-sundaya-red"
                    )}></div>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                      {note.priority}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold opacity-50">
                    {new Date(note.createdAt).toLocaleDateString('id-ID')}
                  </span>
                </div>
                <p className="text-sm font-medium leading-relaxed italic">"{note.message}"</p>
                <div className="mt-4 pt-3 border-t border-current opacity-10 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase">Dari: {note.sender?.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperDashboard;
