// components/layout/Layout.js
import React, { useState, useContext } from "react";
import { ThemeContext } from "../../contexts/ThemeContext";
import { Moon, Sun, LogOut, User } from "lucide-react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import Sidebar from "../common/Sidebar";

const Layout = () => {
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* Main Content Area */}
      <div
        className={`transition-all duration-300 ${
          isCollapsed ? "ml-20" : "ml-64"
        }`}
      >
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="px-8 py-4">
            <div className="flex justify-end items-center">
              <div className="flex items-center gap-4">
                {/* User Info */}
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-full">
                    <User className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {user?.full_name || "User"}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                      {user?.role || "Member"}
                    </div>
                  </div>
                </div>

                {/* Dark Mode Toggle */}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-full bg-slate-200 dark:bg-slate-700 transition"
                >
                  {theme === "light" ? (
                    <Moon className="w-5 h-5 text-slate-800" />
                  ) : (
                    <Sun className="w-5 h-5 text-yellow-400" />
                  )}
                </button>

                {/* Logout */}
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
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
