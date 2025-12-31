const { app, BrowserWindow, Menu, Tray, dialog, ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  // App window settings
  window: {
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
  },
  // Backend settings
  backend: {
    port: 8000,
    startupDelay: 3000, // Wait 3 seconds for backend to start
  },
  // Auto-update settings
  autoUpdate: {
    checkOnStartup: true,
    checkInterval: 3600000, // Check every hour (in milliseconds)
  },
};

// =============================================================================
// GLOBAL VARIABLES
// =============================================================================

let mainWindow = null;
let backendProcess = null;
let tray = null;
let isQuitting = false;

// =============================================================================
// BACKEND MANAGEMENT
// =============================================================================

function getBackendPath() {
  // Determine backend executable path based on platform
  if (process.platform === "win32") {
    return path.join(process.resourcesPath, "backend", "finance-backend.exe");
  } else if (process.platform === "darwin") {
    return path.join(process.resourcesPath, "backend", "finance-backend");
  } else {
    return path.join(process.resourcesPath, "backend", "finance-backend");
  }
}

function startBackend() {
  //  DEV MODE: backend is started manually
  if (!app.isPackaged) {
    console.log("DEV MODE: backend should already be running on port 8000");
    return;
  }

  //  PROD MODE: use bundled backend executable
  const backendPath = getBackendPath();

  if (!fs.existsSync(backendPath)) {
    console.error("Backend not found at:", backendPath);
    dialog.showErrorBox(
      "Backend Error",
      "Backend server not found. Please reinstall the application."
    );
    app.quit();
    return;
  }

  console.log("Starting backend from:", backendPath);

  backendProcess = spawn(backendPath, [], {
    cwd: path.dirname(backendPath),
    env: {
      ...process.env,
      PORT: CONFIG.backend.port.toString(),
    },
  });

  backendProcess.stdout.on("data", (data) => {
    console.log(`Backend: ${data}`);
  });

  backendProcess.stderr.on("data", (data) => {
    console.error(`Backend Error: ${data}`);
  });

  backendProcess.on("close", (code) => {
    if (!isQuitting && code !== 0) {
      dialog.showErrorBox(
        "Backend Crashed",
        "The backend server has stopped unexpectedly."
      );
      app.quit();
    }
  });
}

function stopBackend() {
  if (backendProcess && !backendProcess.killed) {
    console.log("Stopping backend...");
    backendProcess.kill();
    backendProcess = null;
  }
}

// =============================================================================
// AUTO-UPDATE FUNCTIONALITY
// =============================================================================

function setupAutoUpdater() {
  // Configure auto-updater
  autoUpdater.autoDownload = false; // Don't auto-download, ask user first
  autoUpdater.autoInstallOnAppQuit = true;

  // Check for updates on startup
  if (CONFIG.autoUpdate.checkOnStartup) {
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 5000); // Check 5 seconds after startup
  }

  // Check for updates periodically
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, CONFIG.autoUpdate.checkInterval);

  // Update available
  autoUpdater.on("update-available", (info) => {
    console.log("Update available:", info.version);

    dialog
      .showMessageBox(mainWindow, {
        type: "info",
        title: "Update Available",
        message: `A new version (${info.version}) is available!`,
        detail:
          "Would you like to download it now? The update will be installed when you restart the app.",
        buttons: ["Download", "Later"],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();

          // Show downloading notification
          dialog.showMessageBox(mainWindow, {
            type: "info",
            title: "Downloading Update",
            message: "Update is downloading in the background...",
            buttons: ["OK"],
          });
        }
      });
  });

  // No update available
  autoUpdater.on("update-not-available", (info) => {
    console.log("No updates available");
  });

  // Update downloaded
  autoUpdater.on("update-downloaded", (info) => {
    console.log("Update downloaded:", info.version);

    dialog
      .showMessageBox(mainWindow, {
        type: "info",
        title: "Update Ready",
        message: `Version ${info.version} has been downloaded!`,
        detail:
          "The update will be installed when you restart the app. Would you like to restart now?",
        buttons: ["Restart Now", "Later"],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          isQuitting = true;
          autoUpdater.quitAndInstall();
        }
      });
  });

  // Download progress
  autoUpdater.on("download-progress", (progressObj) => {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message = log_message + " - Downloaded " + progressObj.percent + "%";
    log_message =
      log_message +
      " (" +
      progressObj.transferred +
      "/" +
      progressObj.total +
      ")";
    console.log(log_message);
  });

  // Error
  autoUpdater.on("error", (err) => {
    console.error("Auto-updater error:", err);
  });
}

// =============================================================================
// WINDOW MANAGEMENT
// =============================================================================

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: CONFIG.window.width,
    height: CONFIG.window.height,
    minWidth: CONFIG.window.minWidth,
    minHeight: CONFIG.window.minHeight,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "icon.png"),
    backgroundColor: "#1e293b", // Dark mode background
    show: false, // Don't show until ready
    title: "Finance Manager",
  });

  // Load the app after backend starts
  setTimeout(() => {
    const isDev = !app.isPackaged;

    const startUrl = isDev
      ? "http://localhost:3000"
      : `file://${path.join(__dirname, "../build/index.html")}`;

    mainWindow.loadURL(startUrl);

    // Show window when ready
    mainWindow.once("ready-to-show", () => {
      mainWindow.show();
      mainWindow.focus();
    });
  }, CONFIG.backend.startupDelay);

  // Handle window close
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }
}

// =============================================================================
// MENU SETUP
// =============================================================================

function createMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Check for Updates",
          click: () => {
            autoUpdater.checkForUpdates();
          },
        },
        { type: "separator" },
        {
          label: "Quit",
          accelerator: "CmdOrCtrl+Q",
          click: () => {
            isQuitting = true;
            app.quit();
          },
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        { type: "separator" },
        { role: "close" },
      ],
    },
  ];

  // Add DevTools menu in development
  if (process.env.NODE_ENV === "development") {
    template.push({
      label: "Developer",
      submenu: [{ role: "toggleDevTools" }],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// =============================================================================
// SYSTEM TRAY
// =============================================================================

function createTray() {
  const iconPath = path.join(__dirname, "icon.png");

  tray = new Tray(iconPath);
  tray.setToolTip("Finance Manager");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show App",
      click: () => {
        mainWindow.show();
      },
    },
    {
      label: "Check for Updates",
      click: () => {
        autoUpdater.checkForUpdates();
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Show window on tray icon click
  tray.on("click", () => {
    mainWindow.show();
  });
}

// =============================================================================
// APP LIFECYCLE
// =============================================================================

// App ready
app.whenReady().then(() => {
  console.log("App starting...");

  // Start backend server
  startBackend();

  // Create main window
  createWindow();

  // Create menu
  createMenu();

  // Create system tray
  createTray();

  // Setup auto-updater
  setupAutoUpdater();
});

// All windows closed
app.on("window-all-closed", () => {
  // On macOS, keep app running even when windows are closed
  if (process.platform !== "darwin") {
    isQuitting = true;
    app.quit();
  }
});

// Activate (macOS)
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

// Before quit
app.on("before-quit", () => {
  isQuitting = true;
  stopBackend();
});

// Will quit
app.on("will-quit", () => {
  stopBackend();
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  dialog.showErrorBox("Application Error", error.message);
});

// =============================================================================
// IPC HANDLERS (for communication with renderer)
// =============================================================================

ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

ipcMain.handle("check-for-updates", () => {
  autoUpdater.checkForUpdates();
});

console.log("Electron app initialized");
