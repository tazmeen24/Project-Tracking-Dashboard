// components/layout/Layout.js
import React from 'react';
import { Outlet } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../common/Sidebar';

const Layout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="ml-64">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
          <div className="px-8 py-4">
            <div className="flex justify-end items-center">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-full">
                    <User className="w-5 h-5 text-slate-700" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">
                      {user?.full_name || 'User'}
                    </div>
                    <div className="text-xs text-slate-500 capitalize">
                      {user?.role || 'Member'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;