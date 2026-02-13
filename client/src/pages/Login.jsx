import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiLock, FiLogIn, FiEye, FiEyeOff } from 'react-icons/fi';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const success = await login(username, password);
      if (success) {
        // Navigation will be handled by useEffect above
      } else {
        setError('Username atau password salah');
        setLoading(false);
      }
    } catch (err) {
      setError('Terjadi kesalahan pada server');
      setLoading(false);
    }
  };

  const [imgError, setImgError] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
          <div className="px-8 pt-10 pb-6 text-center">
            <div className="inline-flex items-center justify-center p-4">
              {imgError ? (
                <div className="text-sundaya-primary font-black text-4xl tracking-tighter italic">SUNDAYA</div>
              ) : (
                <img 
                  src="/Asset 1.png" 
                  alt="Sundaya Logo" 
                  className="h-20 object-contain"
                  onError={() => setImgError(true)}
                />
              )}
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-4">Warehouse System</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Secure Admin Access</p>
          </div>

          <div className="p-8 pt-4">
            <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-center animate-shake">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <FiUser className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sundaya-primary focus:border-transparent transition-all outline-none text-slate-600"
                  placeholder="admin"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <FiLock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sundaya-primary focus:border-transparent transition-all outline-none text-slate-600"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-all"
                >
                  {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sundaya-primary hover:bg-sundaya-dark text-white font-black py-4 px-4 rounded-2xl shadow-xl shadow-sundaya-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.98] uppercase tracking-widest text-xs"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <FiLogIn className="w-5 h-5" />
                  Masuk ke Sistem
                </>
              )}
            </button>
          </form>
        </div>
        <div className="px-8 pb-8">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">
            SUNDAYA INDONESIA &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  </div>
  );
};

export default Login;