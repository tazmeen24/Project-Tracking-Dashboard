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
  const triggerRef = useRef(null);

  const totalAllocation =
    (project.manpower_allocation || 0) +
    (project.equipment_allocation || 0) +
    (project.consumables_allocation || 0) +
    (project.contingency_allocation || 0) +
    (project.travel_training_allocation || 0) +
    (project.overhead_allocation || 0);

  const openMenu = (e) => {
    e.stopPropagation();                    // Critical: prevent card click
    setIsOpen(true);
  };

  const closeMenu = () => setIsOpen(false);

  // Close menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target)) {
        closeMenu();
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') closeMenu();
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const status = getProjectStatus(project);
  const statusColors = {
    Active: 'bg-emerald-100 text-emerald-800',
    Completed: 'bg-slate-100 text-slate-800',
    Upcoming: 'bg-blue-100 text-blue-800',
  };

  // Get exact button position
  const rect = triggerRef.current?.getBoundingClientRect();

  return (
    <>
      <Card
        hover
        onClick={() => navigate(`/projects/${project.project_id}`)}
        className="cursor-pointer group relative transition-all duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-xl font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                {project.title}
              </h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[status]}`}>
                {status}
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date(project.start_date).toLocaleDateString('en-IN')}
              </span>
              <span className="font-medium">{project.project_no}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-lg">
                {getProjectCategoryLabel(project.project_category)}
              </span>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-lg">
                {getProjectTypeLabel(project.project_type)}
              </span>
              {project.PFMS_id && (
                <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-lg">
                  PFMS
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-sm text-slate-500 mb-1">Total Allocation</div>
              <div className="text-2xl font-bold text-slate-900">
                {formatCurrency(totalAllocation)}
              </div>
            </div>

            <button
              ref={triggerRef}
              onClick={openMenu}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors z-10"
            >
              <MoreVertical className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </Card>

      {/* Perfectly Positioned Portal Dropdown */}
      {isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999]" onClick={closeMenu}>
            <div
              className="absolute bg-white rounded-xl shadow-2xl border border-slate-200 py-2 w-56"
              style={{
                top: rect ? rect.bottom + 8 : 0,
                left: rect ? rect.right - 224 : 0, // 224 = width 56rem ≈ 224px
                transform: 'translateX(-100%)',    // align to right of button
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => { navigate(`/projects/${project.project_id}`); closeMenu(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                <Eye className="w-4 h-4" /> View Details
              </button>
              <button onClick={() => { onEdit(project); closeMenu(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                <Edit className="w-4 h-4" /> Edit Project
              </button>
              <button onClick={() => { navigate(`/projects/${project.project_id}?tab=analytics`); closeMenu(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                <BarChart3 className="w-4 h-4" /> View Analytics
              </button>
              <div className="border-t border-slate-200 my-1" />
              <button onClick={() => { onDelete(project); closeMenu(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4" /> Delete Project
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default ProjectCard;