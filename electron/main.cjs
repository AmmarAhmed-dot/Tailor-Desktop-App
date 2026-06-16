const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

// We'll store data in the user's standard application data directory
const dataFile = path.join(app.getPath("userData"), "customers_data.json");
const backupFile = path.join(app.getPath("userData"), "customers_backup.json");

// Initialize data file if it doesn't exist
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, JSON.stringify([]));
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Tailor Shop Manager",
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

// --- IPC Handlers for Manual Import/Export ---
ipcMain.handle("export-data", async (event, data) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: "Export Backup",
      defaultPath: path.join(app.getPath("documents"), "TailorApp_Backup.json"),
      filters: [{ name: "JSON Files", extensions: ["json"] }],
    });

    if (canceled || !filePath) return { success: false, canceled: true };

    const jsonString = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, jsonString);
    return { success: true, filePath };
  } catch (error) {
    console.error("Export error:", error);
    return { success: false, error: error.message };
  }
});

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
