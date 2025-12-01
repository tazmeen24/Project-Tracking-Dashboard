// components/projects/ProjectCard.js
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Calendar, Eye, Edit, Trash2, BarChart3, MoreVertical } from 'lucide-react';
import Card from '../common/Card';
import { formatCurrency, getProjectStatus, getProjectCategoryLabel, getProjectTypeLabel } from '../../utils/helpers';

const ProjectCard = ({ project, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  const totalAllocation = project.total_budget || 0;

  const openMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPosition({
        top: rect.bottom + 8,
        left: rect.right - 224, // 224px = menu width
      });
    }
    setIsOpen(true);
  };

  const closeMenu = () => setIsOpen(false);

  // Close menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target)) {
        closeMenu();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') closeMenu();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleViewDetails = (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeMenu();
    navigate(`/projects/${project.project_id}`);
  };

  const handleEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeMenu();
    onEdit(project);
  };

  const handleAnalytics = (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeMenu();
    navigate(`/projects/${project.project_id}?tab=analytics`);
  };

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeMenu();
    onDelete(project);
  };

  const handleCardClick = (e) => {
    // Don't navigate if clicking the menu button or if menu is open
    if (triggerRef.current?.contains(e.target) || isOpen) {
      return;
    }
    navigate(`/projects/${project.project_id}`);
  };

  const status = getProjectStatus(project);
  const statusColors = {
    Active: 'bg-emerald-100 text-emerald-800',
    Completed: 'bg-slate-100 text-slate-800',
    Upcoming: 'bg-blue-100 text-blue-800',
  };

  return (
    <>
      <Card
        hover
        onClick={handleCardClick}
        className="cursor-pointer group relative transition-all duration-300"
      >
        {/* Gradient background on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          {/* Left Section - Project Info */}
          <div className="flex-1 min-w-0 pr-4">
            {/* Title and Status */}
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-xl font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                {project.title}
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusColors[status]}`}>
                {status}
              </span>
            </div>

            {/* Meta Information */}
            <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date(project.start_date).toLocaleDateString('en-IN')}
              </span>
              <span className="font-medium">{project.project_no}</span>
            </div>

            {/* Category and Type Badges */}
            <div className="flex flex-wrap gap-2">
              {project.project_category && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-lg">
                  {getProjectCategoryLabel(project.project_category)}
                </span>
              )}
              {project.project_type && (
                <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-lg">
                  {getProjectTypeLabel(project.project_type)}
                </span>
              )}
              {project.PFMS_id && (
                <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-lg">
                  PFMS: {project.PFMS_id}
                </span>
              )}
            </div>
          </div>

          {/* Right Section - Budget and Actions */}
          <div className="flex items-center gap-6">
            {/* Budget */}
            <div className="text-right">
              <div className="text-sm text-slate-500 mb-1">Total Allocation</div>
              <div className="text-2xl font-bold text-slate-900">
                {formatCurrency(totalAllocation)}
              </div>
            </div>

            {/* Menu Button */}
            <button
              ref={triggerRef}
              type="button"
              onClick={openMenu}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors z-20"
              aria-label="Project actions"
            >
              <MoreVertical className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </Card>

      {/* Portal-based Dropdown Menu */}
      {isOpen &&
        createPortal(
          <div 
            className="fixed inset-0 z-[9999]"
            onClick={(e) => {
              e.stopPropagation();
              closeMenu();
            }}
          >
            <div
              className="absolute bg-white rounded-xl shadow-2xl border border-slate-200 py-2 w-56 animate-scaleIn"
              style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={handleViewDetails}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
              >
                <Eye className="w-4 h-4" />
                <span>View Details</span>
              </button>
              
              <button
                type="button"
                onClick={handleEdit}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Project</span>
              </button>
              
              <button
                type="button"
                onClick={handleAnalytics}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors text-left"
              >
                <BarChart3 className="w-4 h-4" />
                <span>View Analytics</span>
              </button>
              
              <div className="border-t border-slate-200 my-1" />
              
              <button
                type="button"
                onClick={handleDelete}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Project</span>
              </button>
            </div>

            <style>{`
              @keyframes scaleIn {
                from {
                  opacity: 0;
                  transform: scale(0.95) translateY(-10px);
                }
                to {
                  opacity: 1;
                  transform: scale(1) translateY(0);
                }
              }

              .animate-scaleIn {
                animation: scaleIn 0.15s ease-out;
              }
            `}</style>
          </div>,
          document.body
        )}
    </>
  );
};

export default ProjectCard;