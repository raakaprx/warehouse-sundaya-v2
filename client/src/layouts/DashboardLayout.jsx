import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { toast, Toaster } from 'react-hot-toast';

const DashboardLayout = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const socket = io('http://localhost:5000');
    
    socket.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    socket.on('new_material_request', (data) => {
      if (user.role === 'NOC' || user.role === 'GM' || user.role === 'PROGRAMMER') {
        window.dispatchEvent(new Event('mr_new_request'));
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-[2rem] pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-l-8 border-sundaya-red`}>
            <div className="flex-1 w-0 p-6">
              <div className="flex items-start">
                <div className="ml-3 flex-1">
                  <p className="text-sm font-black text-slate-900 uppercase tracking-widest">New Material Request</p>
                  <p className="mt-1 text-sm font-bold text-slate-500">{data.message}</p>
                  <p className="mt-2 text-[10px] font-black text-sundaya-red uppercase tracking-[0.2em]">Project: {data.project}</p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-slate-50">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-bold text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        ), { duration: 5000, position: 'top-right' });
      }
    });

    socket.on('request_shipped', (data) => {
      if (user.role === 'OM') {
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-[2rem] pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-l-8 border-emerald-500`}>
            <div className="flex-1 w-0 p-6">
              <div className="flex items-start">
                <div className="ml-3 flex-1">
                  <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Items Shipped</p>
                  <p className="mt-1 text-sm font-bold text-slate-500">{data.message}</p>
                  <p className="mt-2 text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Tracking: {data.trackingNumber}</p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-slate-50">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-bold text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                Close
              </button>
            </div>
          </div>
        ), { duration: 5000, position: 'top-right' });
      }
    });

    socket.on('request_reviewed', (data) => {
      if (user.role === 'GM' || user.role === 'PROGRAMMER') {
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-[2rem] pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-l-8 border-amber-500`}>
            <div className="flex-1 w-0 p-6">
              <div className="flex items-start">
                <div className="ml-3 flex-1">
                  <p className="text-sm font-black text-slate-900 uppercase tracking-widest">NOC Review Complete</p>
                  <p className="mt-1 text-sm font-bold text-slate-500">{data.message}</p>
                  <p className="mt-2 text-[10px] font-black text-amber-600 uppercase tracking-[0.2em]">Project: {data.project}</p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-slate-50">
              <button onClick={() => toast.dismiss(t.id)} className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-bold text-slate-400 hover:text-slate-600 focus:outline-none">Close</button>
            </div>
          </div>
        ), { duration: 5000, position: 'top-right' });
      }
    });

    socket.on('request_approved', (data) => {
      if (user.role === 'NOC' || user.role === 'OM' || user.role === 'PROGRAMMER') {
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-[2rem] pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-l-8 border-emerald-500`}>
            <div className="flex-1 w-0 p-6">
              <div className="flex items-start">
                <div className="ml-3 flex-1">
                  <p className="text-sm font-black text-slate-900 uppercase tracking-widest">GM Approved</p>
                  <p className="mt-1 text-sm font-bold text-slate-500">{data.message}</p>
                  <p className="mt-2 text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Project: {data.project}</p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-slate-50">
              <button onClick={() => toast.dismiss(t.id)} className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-bold text-slate-400 hover:text-slate-600 focus:outline-none">Close</button>
            </div>
          </div>
        ), { duration: 5000, position: 'top-right' });
      }
    });

    socket.on('request_rejected', (data) => {
      if (user.role === 'NOC' || user.role === 'OM') {
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-[2rem] pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-l-8 border-red-500`}>
            <div className="flex-1 w-0 p-6">
              <div className="flex items-start">
                <div className="ml-3 flex-1">
                  <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Request Rejected</p>
                  <p className="mt-1 text-sm font-bold text-slate-500">{data.message}</p>
                  <p className="mt-2 text-[10px] font-black text-red-600 uppercase tracking-[0.2em]">Project: {data.project}</p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-slate-50">
              <button onClick={() => toast.dismiss(t.id)} className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-bold text-slate-400 hover:text-slate-600 focus:outline-none">Close</button>
            </div>
          </div>
        ), { duration: 5000, position: 'top-right' });
      }
    });

    socket.on('inventory_updated', () => {
      window.dispatchEvent(new Event('inventory_updated'));
    });

    socket.on('new_alert', (data) => {
      window.dispatchEvent(new Event('alerts_updated'));
      if (user.role === 'NOC' || user.role === 'GM' || user.role === 'PROGRAMMER') {
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-[2rem] pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-l-8 border-red-500`}>
            <div className="flex-1 w-0 p-6">
              <div className="flex items-start">
                <div className="ml-3 flex-1">
                  <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Stock Alert</p>
                  <p className="mt-1 text-sm font-bold text-slate-500">{data.message}</p>
                  <p className="mt-2 text-[10px] font-black text-red-600 uppercase tracking-[0.2em]">Site: {data.site}</p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-slate-50">
              <button onClick={() => toast.dismiss(t.id)} className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-bold text-slate-400 hover:text-slate-600 focus:outline-none">Close</button>
            </div>
          </div>
        ), { duration: 5000, position: 'top-right' });
      }
    });

    return () => socket.disconnect();
  }, [user]);

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Toaster />
      <Sidebar />
      <div className="flex-1 ml-72 p-0 overflow-hidden">
        <div className="h-screen overflow-y-auto custom-scrollbar">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
