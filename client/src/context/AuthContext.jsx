/**
 * ============================================================================
 * AUTH CONTEXT - Frontend Authentication State Management
 * ============================================================================
 * Fungsi: Centralized auth state, token storage, JWT refresh on 401
 * 
 * Pattern: React Context API (global state, SPA-friendly, no Redux overhead)
 * 
 * Flow:
 * 1. App mounts → check localStorage (recovery from page refresh)
 * 2. User login → axios POST /login → get JWT token + user data
 * 3. Store to localStorage (persist across refresh)
 * 4. Set axios default header Authorization: Bearer {token}
 * 5. Axios interceptor watch 401 → logout + redirect /login
 * 
 * Kenapa localStorage?
 * - Stateless SPA: tidak ada session di server
 * - Persistent: tetap login setelah page refresh
 * - Security: HttpOnly flag tidak bisa di frontend, localStorage cukup untuk JWT
 * - Trade-off: XSS bisa steal token, tapi mitigasi dengan httpOnly env
 * 
 * Kenapa Axios Interceptor?
 * - Token expire (24h) atau invalid → API return 401
 * - Interceptor catch 401 → force logout (prevent zombie session)
 * - Redirect ke /login agar user tahu perlu login ulang
 * - Better UX: automatic logout daripada manual error handling setiap API call
 * 
 * Components:
 * - AuthProvider: wrap around App, provide context
 * - useAuth() hook: components consume context
 * - clearAuth(): centralized logout logic
 * ============================================================================
 */
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

/**
 * AUTH PROVIDER COMPONENT
 * 
 * Props: children (React components yang di-wrap)
 * State:
 * - user: current logged-in user object { id, username, role, site, siteId }
 * - loading: bool (true saat init, false setelah localStorage check selesai)
 * - interceptorRef: store axios interceptor ID (cleanup on unmount)
 * 
 * Provide ke children: { user, login, logout, loading }
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const interceptorRef = useRef(null); // ⬅️ Store interceptor ID untuk cleanup

  /**
   * CLEAR AUTH - Centralized logout
   * 
   * Actions:
   * 1. Clear user state
   * 2. Remove localStorage (user + token)
   * 3. Delete axios Authorization header
   * 4. Optionally redirect to /login
   * 
   * Why centralized?
   * - Logout logic di satu tempat
   * - Consistent: selalu clear semua data
   * - Reusable: dipanggil from login component, interceptor, logout button
   */
  const clearAuth = useCallback((redirectToLogin) => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    delete axios.defaults.headers.common.Authorization;
    if (redirectToLogin) {
      window.location.assign('/login'); // ⬅️ Hard redirect, bukan navigate (full page refresh)
    }
  }, []);

  /**
   * EFFECT 1: INITIALIZE AUTH FROM LOCALSTORAGE
   * 
   * Run on mount:
   * 1. Check localStorage.token + localStorage.user
   * 2. Jika ada: restore to state + set axios header
   * 3. Jika data inconsistent (user ada tapi token tidak): clear (logout)
   * 4. Set loading=false (signal to App: auth init done)
   * 
   * Why separate effect?
   * - Needed on mount to recover from page refresh
   * - Before rendering protected routes (loading state prevent redirect)
   * 
   * Why not in root App.jsx?
   * - Cleaner: auth logic terisolasi di AuthContext
   * - Reusable: kalau ada multiple auth providers, ini pattern
   */
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
      // ⬇️ Both exist: restore auth
      setUser(JSON.parse(storedUser));
      axios.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
    } else if (storedUser || storedToken) {
      // ⬇️ Only one exist: data corrupt, clear (logout)
      clearAuth(false);
    }
    
    // ⬇️ Signal: auth initialization done
    setLoading(false);
  }, [clearAuth]);

  /**
   * EFFECT 2: SETUP AXIOS INTERCEPTOR
   * 
   * Purpose: Catch 401 Unauthorized → force logout
   * 
   * Flow:
   * 1. Axios response interceptor watch all responses
   * 2. If status 401: call clearAuth(true) → logout + redirect /login
   * 3. Else: pass response through
   * 
   * Error handling:
   * - Intercept 401 response
   * - Jangan re-throw, cukup logout
   * - Other errors (500, 404) pass through (controller handle)
   * 
   * Cleanup:
   * - On unmount: eject interceptor (prevent duplicate)
   * - Use ref to store interceptor ID (needed to eject)
   * 
   * Why not in login function?
   * - Interceptor harus setup once dan persist
   * - Might be called multiple times (multiple renders)
   * - Ref + useEffect prevent duplicate setup
   * 
   * Security: Why 401 → logout?
   * - Token expired atau invalid
   * - Server invalidated session (security breach detected)
   * - User password changed (token no longer valid)
   * - Force logout prevent using stale token
   */
  useEffect(() => {
    if (interceptorRef.current !== null) return; // ⬅️ Already setup, skip

    // ⬇️ Setup response interceptor
    interceptorRef.current = axios.interceptors.response.use(
      (response) => response, // ⬅️ Success: pass through
      (error) => {
        // ⬇️ Error: check if 401 Unauthorized
        if (error?.response?.status === 401) {
          clearAuth(true); // ⬅️ Logout + redirect /login
        }
        return Promise.reject(error); // ⬅️ Pass error to component
      }
    );

    // ⬇️ Cleanup: eject interceptor on unmount
    return () => {
      if (interceptorRef.current !== null) {
        axios.interceptors.response.eject(interceptorRef.current);
        interceptorRef.current = null;
      }
    };
  }, [clearAuth]);

  /**
   * LOGIN FUNCTION
   * 
   * Endpoint: POST /api/auth/login
   * Body: { username, password }
   * Response: { success, token, user }
   * 
   * Flow:
   * 1. POST credentials to backend
   * 2. Backend verify password (bcrypt), issue JWT token
   * 3. Frontend receive token + user data
   * 4. Store token to localStorage
   * 5. Set axios default header Authorization: Bearer {token}
   * 6. Set user state (trigger re-render, close loading)
   * 7. Return true (component navigate to dashboard)
   * 
   * Why fetch not axios?
   * - Axios interceptor haven't setup yet at login time
   * - Prevent interceptor catching 401 during login attempt
   * - After login success, subsequent calls use axios (interceptor active)
   * 
   * Error handling: catch-all, return false (Login component show error)
   * 
   * Token format: JWT (Header.Payload.Signature)
   * - Payload contains: { id, role, username, site, siteId, exp: 24h }
   * - Signature verify token not tampered
   * - No password in token (stateless, can't verify password from token)
   */
  const login = async (username, password) => {
    try {
      // ⬇️ POST login credentials
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        // ⬇️ 1) Store user data
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // ⬇️ 2) Store token
        localStorage.setItem('token', data.token);
        
        // ⬇️ 3) Set axios default header untuk subsequent requests
        axios.defaults.headers.common.Authorization = `Bearer ${data.token}`;
        
        return true; // ⬅️ Signal success to Login component
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  /**
   * LOGOUT FUNCTION
   * 
   * Simple wrapper around clearAuth
   * - Don't redirect (component handle navigation)
   * - Just clear state + storage
   */
  const logout = () => {
    clearAuth(false);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * USE AUTH HOOK
 * 
 * Usage in components:
 * ```
 * const { user, login, logout, loading } = useAuth();
 * ```
 * 
 * Can only use in components wrapped by AuthProvider
 * If used outside provider: throw error "useAuth must be used within AuthProvider"
 */
export const useAuth = () => useContext(AuthContext);
