// components/modals/AddTechnicalGroupModal.js
import React, { useState } from "react";
import { X, Users } from "lucide-react";
import Input from "../common/Input";
import Button from "../common/Button";
import projectService from "../../services/projectService";

const AddTechnicalGroupModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: "", // Changed from group_name to name
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = "Group name is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // In AddTechnicalGroupModal.js - handleSubmit function

const handleSubmit = async (e) => {
  e.preventDefault();
  if (!validate()) return;

  setLoading(true);
  try {
    
    const result = await projectService.createTechnicalGroup({
      name: formData.name.trim(),
    });
    
    
    setFormData({ name: "" });
    setErrors({});
    
    if (onSuccess) {
      onSuccess(result);
    }
    
    onClose();
  } catch (error) {
    console.error("Full error object:", error); // ADD THIS LINE
    
    let errorMessage = "Failed to create technical group";
    
    if (error.message) {
      if (error.message.includes("already exists")) {
        errorMessage = "A technical group with this name already exists";
      } else {
        errorMessage = error.message;
      }
    }
    
    setErrors({ submit: errorMessage });
  } finally {
    setLoading(false);
  }
};

  // Reset form when modal closes
  const handleClose = () => {
    setFormData({ name: "" });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Add Technical Group
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Group Name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            error={errors.name}
            required
            disabled={loading}
            placeholder="e.g., Computer Science & Engineering"
            icon={Users}
            autoFocus
          />

          {errors.submit && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
              <p className="text-sm text-red-800 dark:text-red-300">
                {errors.submit}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              loading={loading} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTechnicalGroupModal;