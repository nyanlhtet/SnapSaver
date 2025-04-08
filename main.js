const {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  dialog,
  Menu,
  Notification,
  globalShortcut,
  nativeImage,
  screen,
} = require("electron");

const path = require("path");
const Store = require("electron-store");
const chokidar = require("chokidar");
const fs = require("fs").promises;

const process = require("process");
const isDebug = process.env.NODE_ENV === "true";

const store = new Store();
let tray = null;
let window = null;
let watcher = null;
let recentlyProcessedFiles = new Set();

if (process.env.IS_DEBUG === "true") {
  try {
    app.on("before-quit", () => {
      if (tray) {
        tray.destroy();
        tray = null;
      }
      if (window) {
        window.destroy();
        window = null;
      }
      if (watcher) {
        watcher.close();
        watcher = null;
      }
    });

    window.webContents.on("console-message", (event, level, message) => {
      if (message.includes("Autofill.setAddresses")) {
        event.preventDefault();
      }
    });

    require("electron-reloader")(module, {
      debug: true,
      watchRenderer: true,
      stopOnError: true,
    });
  } catch (err) {
    console.log("Error enabling hot reload:", err);
  }
}

function createWindow() {
  try {
    console.log("Creating window...");
    window = new BrowserWindow({
      width: 320,
      height: 650,
      show: false,
      frame: false,
      resizable: false,
      transparent: true,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        preload: path.join(__dirname, "preload.js"),
      },
    });

    window.loadFile("index.html");

    // if (isDebug) {
    //   window.webContents.openDevTools({ mode: "detach" });
    // }

    window.on("blur", () => {
      window.hide();
    });

    console.log("Window created successfully");
  } catch (error) {
    console.error("Error creating window:", error);
  }
}

function createTray() {
  try {
    console.log("Creating tray...");
    const icon = nativeImage.createFromPath(
      path.join(__dirname, "mov-file-format.png")
    );

    const trayIcon = icon.resize({ width: 16, height: 16 });

    tray = new Tray(trayIcon);
    tray.setToolTip("SnapSaver");

    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Settings",
        click: () => {
          if (window) {
            showWindow();
            window.webContents.send("show-settings");
          }
        },
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => app.quit(),
      },
    ]);

    tray.on("click", () => {
      showWindow();
    });

    tray.on("right-click", () => {
      tray.popUpContextMenu(contextMenu);
    });

    tray.setContextMenu(contextMenu);
  } catch (error) {
    console.error("Error creating tray:", error);
  }
}

function showWindow() {
  if (!window) return;

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const windowBounds = window.getBounds();
  
  const x = Math.round(width / 2 - windowBounds.width / 2);
  const y = Math.round(height / 2 - windowBounds.height / 2);
  
  window.setPosition(x, y, false);
  window.show();
  window.focus();
}

function restartWatcher() {
  const savePath = store.get("savePath");
  
  if (savePath) {
    console.log("Setting up watcher for save path:", savePath);
    setupWatcher(savePath);
  } else {
    console.log("No save path set, watcher not started...");
    if (watcher) {
      console.log("Closing existing watcher");
      watcher.close();
      watcher = null;
    }
  }
}

function setupWatcher(savePath) {
  console.log("Setting up watcher for save path:", savePath);

  if (watcher) {
    console.log("Closing existing watcher");
    watcher.close();
    watcher = null;
  }

  if (!savePath) {
    console.log("No save path provided");
    return;
  }

  try {
    watcher = chokidar.watch(savePath, {
      ignored: /(^|[\/\\])\../, // ignore hidden files
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100,
      },
    });

    watcher
      .on("ready", () => {
        console.log("Initial scan complete. Ready for changes in:", savePath);
      })
      .on("add", (filePath) => {
        console.log("File detected:", filePath);

        if (recentlyProcessedFiles.has(filePath)) {
          console.log("Ignoring recently processed file:", filePath);
          return;
        }

        if (filePath.match(/\.(jpg|jpeg|png|gif|mov)$/i)) {
          const filename = path.basename(filePath);
          console.log("New media file detected:", {
            filename: filename,
            path: filePath,
          });

          if (window) {
            window.webContents.send("show-file-prompt", {
              filename: filename,
              path: filePath,
            });
            showWindow();
          }
        }
      })
      .on("error", (error) => {
        console.error("Watcher error:", error);
        setTimeout(restartWatcher, 5000);
      });
  } catch (error) {
    console.error("Error setting up watcher:", error);
    setTimeout(restartWatcher, 5000);
  }
}

ipcMain.handle("dialog:selectWatchFolder", async () => {
  console.log("Selecting watch folder...");
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ["openDirectory"],
      title: "Select Watch Folder",
    });
    console.log("Watch folder dialog result:", { canceled, filePaths });
    if (!canceled && filePaths.length > 0) {
      const selectedPath = filePaths[0];
      store.set("watchPath", selectedPath);
      console.log("Saved new watch path:", selectedPath);
      setupWatcher(selectedPath);
      return selectedPath;
    }
    return null;
  } catch (error) {
    console.error("Error selecting watch folder:", error);
    return null;
  }
});

ipcMain.handle("dialog:selectSaveFolder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const savePath = result.filePaths[0];
    store.set("savePath", savePath);
    setupWatcher(savePath);
    return savePath;
  }
  return null;
});

ipcMain.handle("dialog:selectCopyFolder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const copyPath = result.filePaths[0];
    store.set("copyPath", copyPath);
    return copyPath;
  }
  return null;
});

ipcMain.handle("config:getSavePath", () => {
  return store.get("savePath", "");
});

ipcMain.handle("config:getCopyPath", () => {
  return store.get("copyPath", "");
});

ipcMain.handle("config:setCopyPath", async (_event, path) => {
  store.set("copyPath", path);
  return path;
});

ipcMain.handle("hide-window", () => {
  if (window) window.hide();
});

ipcMain.handle("file:save", async (_event, options) => {
  console.log("Received save request:", options);
  try {
    const { sourcePath, newName, keepOriginal, customCopyPath } = options;

    if (options.copyToPath && !customCopyPath) {
      throw new Error("Copy path not set");
    }

    const ext = path.extname(sourcePath);
    const sourceDir = path.dirname(sourcePath);
    
    const cleanName = newName.replace(/\.[^/.]+$/, "");
    
    const newSourcePath = path.join(sourceDir, `${cleanName}${ext}`);
    const newCopyPath = customCopyPath
      ? path.join(customCopyPath, `${cleanName}${ext}`)
      : null;

    console.log("Processing file:", {
      sourcePath,
      newSourcePath,
      newCopyPath,
      keepOriginal,
    });

    recentlyProcessedFiles.add(newSourcePath);
    if (newCopyPath) recentlyProcessedFiles.add(newCopyPath);

    await fs.rename(sourcePath, newSourcePath);

    if (newCopyPath) {
      await fs.copyFile(newSourcePath, newCopyPath);

      if (!keepOriginal) {
        await fs.unlink(newSourcePath);
      }
    }

    setTimeout(() => {
      recentlyProcessedFiles.delete(newSourcePath);
      if (newCopyPath) recentlyProcessedFiles.delete(newCopyPath);
    }, 3000);

    const notification = new Notification({
      title: "Success",
      body: newCopyPath
        ? `File ${keepOriginal ? "copied" : "moved"} to ${path.basename(
            newCopyPath
          )}`
        : `File renamed to ${path.basename(newSourcePath)}`,
    });

    notification.show();

    return true;
  } catch (error) {
    console.error("Error in file:save:", error);
    new Notification({
      title: "Error",
      body: `Failed to save file: ${error.message}`,
    }).show();
    throw error;
  }
});

ipcMain.handle("file:delete", async (_event, filePath) => {
  console.log("Received delete request for:", filePath);
  try {
    await fs.unlink(filePath);
    new Notification({
      title: "Success",
      body: "File deleted successfully",
    }).show();
    return true;
  } catch (error) {
    console.error("Error in file:delete:", error);
    new Notification({
      title: "Error",
      body: `Failed to delete file: ${error.message}`,
    }).show();
    throw error;
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    createTray();

    if (process.platform === "darwin") {
      app.dock.hide();
    }

    console.log("Initializing watcher on app start");
    restartWatcher();

    globalShortcut.register("CommandOrControl+Shift+I", () => {
      if (window) {
        window.webContents.openDevTools({ mode: "detach" });
      }
    });
  })
  .catch((error) => {
    console.error("Error during app initialization:", error);
  });

app.on("before-quit", () => {
  if (watcher) {
    console.log("Closing file watcher");
    watcher.close();
    watcher = null;
  }
  recentlyProcessedFiles.clear();
});
