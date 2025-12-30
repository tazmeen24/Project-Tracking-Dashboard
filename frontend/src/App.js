// App.js - Updated routing configuration with proper auth checking
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import Layout from './components/layout/Layout';
import { ThemeProvider } from "./contexts/ThemeContext";

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
import ProjectFinancialsPage from './pages/ProjectFinancialsPage';
import ProjectReportPage from './pages/ProjectReportPage';
import UCManagementPage from './pages/UCManagementPage';
import UCCreatePage from './pages/UCCreatePage';
import ProjectUCsPage from './pages/ProjectUCsPage';
import InstallmentsList from './pages/InstallmentsList';
import InstallmentForm from './pages/InstallmentForm';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route Component (redirects to dashboard if already authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProjectProvider>
          <ThemeProvider>
            <Routes>
              {/* Public Routes */}
              <Route 
                path="/login" 
                element={
                  <PublicRoute>
                    <LoginPage />
                  </PublicRoute>
                } 
              />

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
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />

                {/* Projects Routes */}
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="projects/new" element={<AddEditProjectPage />} />
                <Route path="projects/:projectId" element={<ProjectDetailsFullPage />} />
                <Route path="projects/:projectId/edit" element={<AddEditProjectPage />} />

                {/* Financial Routes */}
                <Route path="financial-summary" element={<FinancialSummaryPage />} />
                <Route path="projects/:projectId/finances" element={<ProjectFinancialsPage />} />
                <Route path="projects/:projectId/installments" element={<InstallmentsList />} />
                <Route path="projects/:projectId/installments/new" element={<InstallmentForm />} />
                <Route path="projects/:projectId/installments/:installmentId/edit" element={<InstallmentForm />} />

                {/* Reports Routes */}
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="projects/:projectId/reports" element={<ProjectReportPage />} />

                {/* UC Management Routes */}
                <Route path="uc-management" element={<UCManagementPage />} />
                <Route path="uc/new" element={<UCCreatePage />} />
                <Route path="uc/project/:projectId" element={<ProjectUCsPage />} />
              </Route>

              {/* 404 Catch-all */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ThemeProvider>
        </ProjectProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;