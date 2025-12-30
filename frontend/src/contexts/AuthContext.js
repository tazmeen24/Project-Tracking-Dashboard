// contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Validate token on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = authService.getToken();
        const storedUser = authService.getCurrentUser();

        if (storedToken && storedUser) {
          // Optional: Verify token is still valid by making a test API call
          // For now, we'll just check if it exists
          // You could add a validation API call here if your backend supports it
          
          setToken(storedToken);
          setUser(storedUser);
        } else {
          // Clear any partial auth data
          authService.logout();
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const result = await authService.login(username, password);
      
      if (result.success) {
        const { access_token, user: userData } = result.data;
        
        // Store in localStorage
        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Update state
        setToken(access_token);
        setUser(userData);
        
        return { success: true };
      }
      
      return result;
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.message || 'Login failed. Please try again.' 
      };
    }
  };

  const logout = () => {
    // Clear everything
    authService.logout();
    setToken(null);
    setUser(null);
    
    // Force redirect to login
    window.location.href = '/login';
  };

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token && !!user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;