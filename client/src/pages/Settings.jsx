import React, { useState, useEffect } from 'react';
import { 
  FiUser, FiMoon, FiSun, FiShield, FiBell, 
  FiSmartphone, FiLogOut, FiCheckCircle, FiInfo,
  FiMapPin, FiDatabase, FiSave, FiLock, FiPlus, FiTrash2,
  FiSettings, FiUsers, FiEdit2
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import axios from 'axios';

const Settings = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  
  // Site Management State
  const [sites, setSites] = useState([]);
  const [newSite, setNewSite] = useState({ name: '', location: '', description: '' });

  // User Management State
  const [users, setUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ 
    username: '', password: '', role: 'OM', siteId: '', email: '', phone: '' 
  });

  const [profileData, setProfileData] = useState({
    name: user?.username || '',
    email: user?.email || 'faerlyroot@gmail.com',
    phone: user?.phone || '+62 812 3456 7890'
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (activeTab === 'admin') {
      fetchSites();
      fetchUsers();
    }
  }, [activeTab]);

  const fetchSites = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/inventory/sites', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSites(res.data.data);
    } catch (err) {
      toast.error('Gagal mengambil data site');
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data.data);
    } catch (err) {
      toast.error('Gagal mengambil data users');
    }
  };

  const handleAddSite = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/inventory/sites', newSite, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Site berhasil ditambahkan');
      setNewSite({ name: '', location: '', description: '' });
      fetchSites();
    } catch (err) {
      toast.error('Gagal menambahkan site');
    } finally {
      setSaving(false);
    }
  };

  const handleUpsertUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = { ...userForm };
      
      // If editing and password is empty, remove it to prevent hashing empty string
      if (editingUser && !payload.password) {
        delete payload.password;
      }

      if (editingUser) {
        await axios.put(`http://localhost:5000/api/auth/users/${editingUser.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('User berhasil diperbarui');
      } else {
        await axios.post('http://localhost:5000/api/auth/register', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('User berhasil ditambahkan');
      }
      
      setShowUserModal(false);
      setEditingUser(null);
      setUserForm({ username: '', password: '', role: 'OM', siteId: '', email: '', phone: '' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan user');
    } finally {
      setSaving(false);
    }
  };

  const openUserModal = (userToEdit = null) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setUserForm({
        username: userToEdit.username,
        password: '', // Leave blank unless changing
        role: userToEdit.role,
        siteId: userToEdit.siteId || '',
        email: userToEdit.email || '',
        phone: userToEdit.phone || ''
      });
    } else {
      setEditingUser(null);
      setUserForm({ username: '', password: '', role: 'OM', siteId: '', email: '', phone: '' });
    }
    setShowUserModal(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:5000/api/auth/profile', {
        email: profileData.email,
        phone: profileData.phone
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Profil berhasil diperbarui');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui profil');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return toast.error('Konfirmasi password tidak cocok');
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put('http://localhost:5000/api/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Password berhasil diperbarui');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">System Settings</h1>
        <p className="text-slate-500 mt-1 font-medium italic">Konfigurasi akun, preferensi sistem, dan manajemen operasional</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('profile')}
            className={clsx(
              "flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all",
              activeTab === 'profile' ? "bg-red-900 text-white shadow-lg shadow-red-100" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <FiUser /> Profile Akun
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={clsx(
              "flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all",
              activeTab === 'security' ? "bg-red-900 text-white shadow-lg shadow-red-100" : "text-slate-500 hover:bg-slate-50"
            )}
          >
            <FiShield /> Keamanan
          </button>
          {user?.role === 'PROGRAMMER' && (
            <button 
              onClick={() => setActiveTab('admin')}
              className={clsx(
                "flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all",
                activeTab === 'admin' ? "bg-red-900 text-white shadow-lg shadow-red-100" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <FiSettings /> Admin Control
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-50 shadow-sm min-h-[500px]">
            {activeTab === 'profile' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Informasi Profil</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Update detail personal Anda</p>
                  </div>
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-red-900 border border-slate-100">
                    <FiUser size={32} />
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username / Nama Lengkap</label>
                    <input 
                      type="text" 
                      value={profileData.name}
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-900 focus:outline-none transition-all font-bold text-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                    <input 
                      type="email" 
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-900 focus:outline-none transition-all font-bold text-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor Telepon</label>
                    <input 
                      type="text" 
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-900 focus:outline-none transition-all font-bold text-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role Akun</label>
                    <input 
                      type="text" 
                      value={user?.role}
                      disabled
                      className="w-full px-6 py-4 bg-slate-100 border-2 border-transparent rounded-2xl font-black text-red-900 uppercase tracking-widest"
                    />
                  </div>
                  <div className="md:col-span-2 pt-4">
                    <button 
                      type="submit"
                      disabled={saving}
                      className="bg-red-900 hover:bg-red-950 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-100 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
                    >
                      {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSave />}
                      Simpan Perubahan Profil
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Keamanan & Password</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Kelola kredensial dan enkripsi akun</p>
                  </div>
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-red-900 border border-slate-100">
                    <FiLock size={32} />
                  </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-6">
                  <div className="p-6 bg-red-50 rounded-[2rem] border border-red-100 flex items-start gap-4">
                    <FiShield className="text-red-900 mt-1" size={24} />
                    <div>
                      <p className="text-sm font-black text-red-900 uppercase tracking-tight">Enkripsi JWT Aktif</p>
                      <p className="text-xs text-red-700 font-bold mt-1">Sesi Anda dilindungi oleh token bearer yang dirotasi secara otomatis setiap 24 jam.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password Saat Ini</label>
                      <input 
                        type="password" 
                        placeholder="••••••••" 
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-900 focus:outline-none transition-all font-bold text-slate-700" 
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password Baru</label>
                        <input 
                          type="password" 
                          placeholder="Min. 8 Karakter" 
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                          className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-900 focus:outline-none transition-all font-bold text-slate-700" 
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Konfirmasi Password Baru</label>
                        <input 
                          type="password" 
                          placeholder="Ulangi Password" 
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                          className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-900 focus:outline-none transition-all font-bold text-slate-700" 
                          required
                        />
                      </div>
                    </div>
                    <div className="pt-4">
                      <button 
                        type="submit"
                        disabled={saving}
                        className="bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
                      >
                        {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiLock />}
                        Perbarui Password Keamanan
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'admin' && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Admin Control Center</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Manajemen User, Akses Role, dan Site Gudang</p>
                  </div>
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-red-900 border border-slate-100">
                    <FiSettings size={32} />
                  </div>
                </div>

                {/* User Management Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-black text-slate-700 flex items-center gap-2">
                      <FiUsers /> Manajemen User & Role
                    </h4>
                    <button 
                      onClick={() => openUserModal()}
                      className="px-4 py-2 bg-red-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-950 transition-all flex items-center gap-2"
                    >
                      <FiPlus /> Tambah User
                    </button>
                  </div>

                  <div className="overflow-hidden bg-slate-50 rounded-[2rem] border border-slate-100">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 border-b border-slate-200">
                        <tr>
                          <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">User Info</th>
                          <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Role</th>
                          <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Assigned Site</th>
                          <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {users.map(u => (
                          <tr key={u.id} className="hover:bg-white transition-colors">
                            <td className="p-4">
                              <p className="font-bold text-slate-800">{u.username}</p>
                              <p className="text-xs text-slate-500">{u.email}</p>
                            </td>
                            <td className="p-4">
                              <span className={clsx(
                                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                                u.role === 'PROGRAMMER' ? "bg-purple-100 text-purple-700" :
                                u.role === 'GM' ? "bg-amber-100 text-amber-700" :
                                u.role === 'NOC' ? "bg-blue-100 text-blue-700" :
                                "bg-green-100 text-green-700"
                              )}>
                                {u.role}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="text-sm font-bold text-slate-600">
                                {u.Site?.name || '-'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button 
                                onClick={() => openUserModal(u)}
                                className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-red-900 hover:border-red-900 transition-all"
                              >
                                <FiEdit2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="w-full h-px bg-slate-100"></div>

                {/* Site Management Section */}
                <div className="space-y-6">
                  <h4 className="text-lg font-black text-slate-700 flex items-center gap-2">
                    <FiMapPin /> Manajemen Site Gudang
                  </h4>

                  {/* Add Site Form */}
                  <form onSubmit={handleAddSite} className="bg-slate-50 p-6 rounded-[2rem] grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input 
                      type="text" 
                      placeholder="Nama Site (e.g. Papua)" 
                      value={newSite.name}
                      onChange={(e) => setNewSite({...newSite, name: e.target.value})}
                      className="px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-red-900 outline-none font-bold"
                      required
                    />
                    <input 
                      type="text" 
                      placeholder="Lokasi / Alamat" 
                      value={newSite.location}
                      onChange={(e) => setNewSite({...newSite, location: e.target.value})}
                      className="px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-red-900 outline-none font-bold"
                      required
                    />
                    <button 
                      type="submit"
                      disabled={saving}
                      className="bg-red-900 text-white px-4 py-3 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-950 transition-all"
                    >
                      <FiPlus /> Tambah Site
                    </button>
                  </form>

                  {/* Sites List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sites.map(site => (
                      <div key={site.id} className="p-6 border border-slate-100 rounded-[2rem] flex items-center justify-between hover:bg-slate-50 transition-all">
                        <div>
                          <p className="font-black text-slate-800 uppercase tracking-tight">{site.name}</p>
                          <p className="text-xs font-bold text-slate-400 mt-1 italic">{site.location}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-red-50 text-red-900 text-[10px] font-black rounded-lg uppercase">Aktif</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Edit Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800">{editingUser ? 'Edit User' : 'Tambah User Baru'}</h3>
              <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <FiPlus className="rotate-45 text-slate-500" size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUpsertUser} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                <input 
                  type="text"
                  value={userForm.username}
                  onChange={e => setUserForm({...userForm, username: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:border-red-900 outline-none"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password {editingUser && '(Kosongkan jika tidak berubah)'}</label>
                <input 
                  type="password"
                  value={userForm.password}
                  onChange={e => setUserForm({...userForm, password: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:border-red-900 outline-none"
                  required={!editingUser}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role</label>
                  <select 
                    value={userForm.role}
                    onChange={e => setUserForm({...userForm, role: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:border-red-900 outline-none"
                  >
                    <option value="OM">OM (Operational)</option>
                    <option value="NOC">NOC (Technical)</option>
                    <option value="GM">GM (Manager)</option>
                    <option value="PROGRAMMER">PROGRAMMER</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Site Assignment</label>
                  <select 
                    value={userForm.siteId}
                    onChange={e => setUserForm({...userForm, siteId: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:border-red-900 outline-none"
                  >
                    <option value="">- Tidak Ada -</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                <input 
                  type="email"
                  value={userForm.email}
                  onChange={e => setUserForm({...userForm, email: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:border-red-900 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                <input 
                  type="text"
                  value={userForm.phone}
                  onChange={e => setUserForm({...userForm, phone: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:border-red-900 outline-none"
                />
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={saving}
                  className="w-full bg-red-900 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-red-950 transition-all shadow-lg"
                >
                  {saving ? 'Menyimpan...' : 'Simpan User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;