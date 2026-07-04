const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

// We'll store data in the user's standard application data directory
const dataFile = path.join(app.getPath("userData"), "customers_data.json");
const backupFile = path.join(app.getPath("userData"), "customers_backup.json");
const configFile = path.join(app.getPath("userData"), "dilkash_config.json");

// Desktop backup folder
const desktopBackupDir = path.join(app.getPath("desktop"), "Dilkash Backups");

// Initialize data file if it doesn't exist
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify([]));
}

// Ensure Desktop backup folder exists
function ensureBackupDir() {
  if (!fs.existsSync(desktopBackupDir)) {
    fs.mkdirSync(desktopBackupDir, { recursive: true });
  }
}

// Read config (tracks lastAutoBackup timestamp)
function readConfig() {
  try {
    if (fs.existsSync(configFile)) {
      return JSON.parse(fs.readFileSync(configFile, "utf8"));
    }
  } catch (e) {
    console.error("Error reading config:", e);
  }
  return {};
}

// Write config
function writeConfig(config) {
  try {
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error("Error writing config:", e);
  }
}

// Get a formatted date string for file names: YYYY-MM-DD
function getDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Dilkash",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Depending on the environment, load the dev server or the production build
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// --- IPC Handlers for Data Storage & Backup ---
ipcMain.handle("read-data", () => {
  try {
    const data = fs.readFileSync(dataFile, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading data:", error);
    return [];
  }
});

ipcMain.handle("write-data", (event, data) => {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    // 1. Write the main data file
    fs.writeFileSync(dataFile, jsonString);
    // 2. Immediately copy it to the backup file to ensure zero data loss
    fs.copyFileSync(dataFile, backupFile);
    return { success: true };
  } catch (error) {
    console.error("Error writing data:", error);
    return { success: false, error: error.message };
  }
});

// --- Manual Export: Instant save to Desktop/Dilkash Backups/ ---
ipcMain.handle("export-data", async (event, data) => {
  try {
    ensureBackupDir();
    const fileName = `Dilkash_Manual_Backup_${getDateString()}.json`;
    const filePath = path.join(desktopBackupDir, fileName);

    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, jsonString);
    return { success: true, filePath };
  } catch (error) {
    console.error("Export error:", error);
    return { success: false, error: error.message };
  }
});

// --- Import (still uses dialog) ---
ipcMain.handle("import-data", async () => {
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: "Import Backup",
      properties: ["openFile"],
      filters: [{ name: "JSON Files", extensions: ["json"] }],
    });

    if (canceled || filePaths.length === 0)
      return { success: false, canceled: true };

    const importedData = fs.readFileSync(filePaths[0], "utf8");
    const parsedData = JSON.parse(importedData);

    // Automatically overwrite main and backup files with imported data
    fs.writeFileSync(dataFile, JSON.stringify(parsedData, null, 2));
    fs.copyFileSync(dataFile, backupFile);

    return { success: true, data: parsedData };
  } catch (error) {
    console.error("Import error:", error);
    return { success: false, error: error.message };
  }
});

// --- Auto Backup: Checks if 15 days have passed since last auto backup ---
ipcMain.handle("check-auto-backup", () => {
  try {
    const config = readConfig();
    const lastBackup = config.lastAutoBackup
      ? new Date(config.lastAutoBackup)
      : null;
    const now = new Date();

    // If never backed up, or 15+ days have passed
    // if (!lastBackup || now - lastBackup >= 15 * 24 * 60 * 60 * 1000) {
    if (!lastBackup || now - lastBackup >= 2 * 60 * 1000) { // 2 minutes for testing
      ensureBackupDir();
      const fileName = `Dilkash_Automatic_Backup_${getDateString()}.json`;
      const filePath = path.join(desktopBackupDir, fileName);

      // Read current data and write backup
      const data = fs.readFileSync(dataFile, "utf8");
      fs.writeFileSync(filePath, data);

      // Update config with new timestamp
      config.lastAutoBackup = now.toISOString();
      writeConfig(config);

      return { triggered: true, filePath };
    }

    return { triggered: false };
  } catch (error) {
    console.error("Auto backup error:", error);
    return { triggered: false, error: error.message };
  }
});

// --- Force Auto Backup: For testing purposes ---
ipcMain.handle("force-auto-backup", () => {
  try {
    ensureBackupDir();
    const fileName = `Dilkash_Automatic_Backup_${getDateString()}.json`;
    const filePath = path.join(desktopBackupDir, fileName);

    const data = fs.readFileSync(dataFile, "utf8");
    fs.writeFileSync(filePath, data);

    // Update config
    const config = readConfig();
    config.lastAutoBackup = new Date().toISOString();
    writeConfig(config);

    return { success: true, filePath };
  } catch (error) {
    console.error("Force auto backup error:", error);
    return { success: false, error: error.message };
  }
});
