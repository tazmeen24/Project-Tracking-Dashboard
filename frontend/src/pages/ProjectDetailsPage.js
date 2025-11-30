// pages/ProjectDetailsPage.js
// This page wraps the ProjectDetails modal component to work with React Router

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectDetails from '../components/projects/ProjectDetails';

const ProjectDetailsPage = () => {
  const { projectId } = useParams(); // Get project_id from URL
  const navigate = useNavigate();

  const handleClose = () => {
    // Navigate back to projects list when modal is closed
    navigate('/projects');
  };

  const handleEdit = (project) => {
    // Navigate to edit page
    navigate(`/projects/${project.project_id}/edit`);
  };

  return (
    <ProjectDetails
      isOpen={true} // Always open since this is a dedicated page
      onClose={handleClose}
      projectId={parseInt(projectId)} // Convert string to number
      onEdit={handleEdit}
    />
  );
};

export default ProjectDetailsPage;