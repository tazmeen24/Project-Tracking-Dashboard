// src/pages/ProjectsPage.js
import React, { useState } from "react";
import { Plus } from "lucide-react";
import Button from "../components/common/Button";
import ProjectForm from "../components/projects/ProjectForm";
import { useProject } from "../contexts/ProjectContext";

const ProjectsPage = () => {
  const [showForm, setShowForm] = useState(false);
  const { refreshProjects } = useProject();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Projects</h1>
        <Button variant="primary" icon={Plus} onClick={() => setShowForm(true)}>
          Create New Project
        </Button>
      </div>

      {/* Your projects list will go here */}

      <ProjectForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={() => {
          refreshProjects();
          setShowForm(false);
        }}
      />
    </div>
  );
};

export default ProjectsPage;
