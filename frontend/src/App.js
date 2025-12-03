// App.js - Updated routing configuration for full-page views
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import Layout from './components/layout/Layout';

// Auth Pages
import LoginPage from './pages/LoginPage';

// Main Pages
import Dashboard from './pages/Dashboard';
import ProjectsPage from './pages/ProjectsPage';
import AddEditProjectPage from './pages/AddEditProjectPage';
import ProjectDetailsFullPage from './pages/ProjectDetailsFullPage';
import FinancialSummaryPage from './pages/FinancialSummaryPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ReportsPage from './pages/ReportsPage';
import FundingAgenciesPage from './pages/FundingAgenciesPage';
import TechnicalGroupsPage from './pages/TechnicalGroupsPage';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('token');
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProjectProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* Dashboard */}
              <Route index element={<Navigate to="/dashboard" />} />
              <Route path="dashboard" element={<Dashboard />} />

              {/* Projects Routes */}
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/new" element={<AddEditProjectPage />} />
              <Route path="projects/:projectId" element={<ProjectDetailsFullPage />} />
              <Route path="projects/:projectId/edit" element={<AddEditProjectPage />} />

              {/* Other Routes */}
              <Route path="financial-summary" element={<FinancialSummaryPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="funding-agencies" element={<FundingAgenciesPage />} />
              <Route path="technical-groups" element={<TechnicalGroupsPage />} />
            </Route>

            {/* 404 Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </ProjectProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;