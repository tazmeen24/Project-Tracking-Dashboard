/**
 * Preload Script
 * 
 * This script runs in the renderer process before the web page loads.
 * It provides a secure bridge between the Electron main process and the React app.
 * 
 * Security: Uses contextBridge to expose only specific functions to the renderer.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Get app version
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Check for updates manually
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  // Platform info
  platform: process.platform,
  
  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
});

console.log('Preload script loaded');