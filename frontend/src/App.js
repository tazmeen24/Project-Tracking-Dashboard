import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import PrivateRoute from './components/common/PrivateRoute';
import Layout from './components/layout/Layout';

// Pages
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import BudgetBreakdownPage from './pages/BudgetBreakdownPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ReportsPage from './pages/ReportsPage';
import FundingAgenciesPage from './pages/FundingAgenciesPage';
import TechnicalGroupsPage from './pages/TechnicalGroupsPage';

function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes with Layout */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:projectId" element={<ProjectDetailsPage />} />
              <Route path="budget-breakdown" element={<BudgetBreakdownPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="funding-agencies" element={<FundingAgenciesPage />} />
              <Route path="technical-groups" element={<TechnicalGroupsPage />} />
            </Route>

            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </ProjectProvider>
    </AuthProvider>
  );
}

export default App;