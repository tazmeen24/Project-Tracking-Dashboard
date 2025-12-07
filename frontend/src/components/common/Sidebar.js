// components/common/Sidebar.js
import React, { useContext } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FolderOpen,
  BarChart2,
  BarChart3,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ThemeContext } from "../../contexts/ThemeContext";

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const { theme } = useContext(ThemeContext);

  const navItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/projects", icon: FolderOpen, label: "Projects" },
    { path: "/financial-summary", icon: BarChart2, label: "Financial Summary" },
    { path: "/analytics", icon: BarChart3, label: "Analytics" },
    { path: "/reports", icon: FileText, label: "Reports" },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 h-screen 
      bg-white dark:bg-slate-900 
      border-r border-slate-200 dark:border-slate-700 
      flex flex-col z-40 transition-all duration-300
      ${isCollapsed ? "w-20" : "w-64"}`}
    >
      {/* Logo Section */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-slate-900 dark:bg-slate-700 rounded-xl flex items-center justify-center flex-shrink-0">
              <FolderOpen className="w-5 h-5 text-white" />
            </div>

            {!isCollapsed && (
              <div className="overflow-hidden">
                <h1 className="font-bold text-slate-900 dark:text-white text-lg whitespace-nowrap">
                  ProjectHub
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  Manage projects
                </p>
              </div>
            )}
          </div>

          {/* Collapse Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex-shrink-0 p-2 rounded-lg 
              text-slate-600 dark:text-slate-300 
              hover:bg-slate-100 dark:hover:bg-slate-800 
              transition-all duration-200"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
              ${
                isActive
                  ? "bg-slate-900 dark:bg-slate-700 text-white shadow-lg"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }
              ${isCollapsed ? "justify-center" : ""}
            `
            }
            title={isCollapsed ? item.label : ""}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && (
              <span className="font-medium whitespace-nowrap">{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
