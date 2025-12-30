// contexts/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to check if token is expired
  const isTokenExpired = (token) => {
    if (!token) return true;
    
    try {
      // Decode JWT token (assuming JWT format)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      
      return currentTime > expirationTime;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true; // If we can't decode, consider it expired
    }
  };

  // Helper to clear all auth data
  const clearAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpiry');
    setToken(null);
    setUser(null);
  };

  // Validate token on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUserStr = localStorage.getItem('user');
        const storedExpiry = localStorage.getItem('tokenExpiry');

        // Check if we have auth data
        if (storedToken && storedUserStr) {
          // Check if token is expired
          if (storedExpiry) {
            const expiryTime = parseInt(storedExpiry, 10);
            const currentTime = Date.now();
            
            if (currentTime > expiryTime) {
              console.log(' Token expired, clearing auth');
              clearAuth();
              setLoading(false);
              return;
            }
          } else if (isTokenExpired(storedToken)) {
            console.log(' Token expired (JWT check), clearing auth');
            clearAuth();
            setLoading(false);
            return;
          }

          // Token is valid, restore auth
          try {
            const storedUser = JSON.parse(storedUserStr);
            setToken(storedToken);
            setUser(storedUser);
            console.log(' Auth restored from storage');
          } catch (parseError) {
            console.error(' Failed to parse stored user, clearing auth');
            clearAuth();
          }
        } else {
          console.log(' No valid auth found');
          clearAuth();
        }
      } catch (error) {
        console.error(' Auth initialization error:', error);
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Check token expiration periodically (every minute)
  useEffect(() => {
    if (!token) return;

    const intervalId = setInterval(() => {
      const storedExpiry = localStorage.getItem('tokenExpiry');
      
      if (storedExpiry) {
        const expiryTime = parseInt(storedExpiry, 10);
        const currentTime = Date.now();
        
        if (currentTime > expiryTime) {
          console.log(' Token expired during session, logging out');
          logout();
        }
      } else if (isTokenExpired(token)) {
        console.log(' Token expired during session, logging out');
        logout();
      }
    }, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, [token]);

  const login = async (username, password) => {
    try {
      const result = await authService.login(username, password);
      
      if (result.success) {
        const { access_token, user: userData } = result.data;
        
        console.log(' Login successful');
        
        // Calculate token expiry (default: 24 hours if not specified in token)
        let expiryTime;
        try {
          const payload = JSON.parse(atob(access_token.split('.')[1]));
          expiryTime = payload.exp * 1000; // Convert to milliseconds
        } catch {
          // If we can't decode JWT, set expiry to 24 hours from now
          expiryTime = Date.now() + (24 * 60 * 60 * 1000);
        }
        
        // Store in localStorage
        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('tokenExpiry', expiryTime.toString());
        
        // Update state
        setToken(access_token);
        setUser(userData);
        
        return { success: true };
      }
      
      return result;
    } catch (error) {
      console.error(' Login error:', error);
      return { 
        success: false, 
        error: error.message || 'Login failed. Please try again.' 
      };
    }
  };

  const logout = () => {
    clearAuth();
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