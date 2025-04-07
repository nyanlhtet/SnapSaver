let currentFile = null;

async function updateButtonTexts() {
  const savePath = await window.electronAPI.getSavePath();
  const copyPath = await window.electronAPI.getCopyPath();

  const saveFolderText = document.getElementById("save-folder-text");
  const saveFolderBtn = document.getElementById("select-save-folder");
  const copyFolderText = document.getElementById("copy-folder-text");
  const copyFolderBtn = document.getElementById("select-copy-folder");

  if (savePath) {
    saveFolderText.textContent = "Change Save Folder";
    saveFolderBtn.classList.add("configured");
  } else {
    saveFolderText.textContent = "Set Save Folder";
    saveFolderBtn.classList.remove("configured");
  }

  if (copyPath) {
    copyFolderText.textContent = "Change Copy Folder";
    copyFolderBtn.classList.add("configured");
  } else {
    copyFolderText.textContent = "Set Copy Folder";
    copyFolderBtn.classList.remove("configured");
  }
}

async function updatePaths() {
  const savePath = await window.electronAPI.getSavePath();
  const copyPath = await window.electronAPI.getCopyPath();

  document.querySelectorAll("#save-path, #settings-save-path").forEach((el) => {
    el.textContent = savePath || "No folder selected";
  });

  document.querySelectorAll("#copy-path, #settings-copy-path").forEach((el) => {
    el.textContent = copyPath || "No folder selected";
  });
}

function toggleViews(showFilePrompt) {
  const filePromptDiv = document.getElementById("file-prompt");
  const settingsDiv = document.getElementById("settings");

  if (showFilePrompt) {
    filePromptDiv?.classList.remove("hidden");
    settingsDiv?.classList.add("hidden");
  } else {
    filePromptDiv?.classList.add("hidden");
    settingsDiv?.classList.remove("hidden");
  }
}

window.electronAPI.onShowFilePrompt((_event, fileInfo) => {
  console.log("File detection triggered:", fileInfo);

  currentFile = fileInfo;

  document.getElementById("file-name").textContent = fileInfo.filename;

  const newNameInput = document.getElementById("new-name");

  toggleViews(true);

  console.log("UI updated:", {
    currentFile,
    fileNameElement: document.getElementById("file-name").textContent,
    newNameInput: document.getElementById("new-name").value,
    filePromptVisible: !document
      .getElementById("file-prompt")
      .classList.contains("hidden"),
    settingsVisible: !document
      .getElementById("settings")
      .classList.contains("hidden"),
  });
});

document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM loaded, initializing...");

  const { savePath, copyPath } = await loadSavedPaths();
  console.log("Initial paths loaded:", { savePath, copyPath });

  const saveFolderBtn = document.getElementById("select-save-folder");
  const copyFolderBtn = document.getElementById("select-copy-folder");

  console.log("Found buttons:", {
    saveButton: !!saveFolderBtn,
    copyButton: !!copyFolderBtn,
  });

  if (saveFolderBtn) {
    saveFolderBtn.addEventListener("click", async () => {
      console.log("Save folder button clicked");
      try {
        const path = await window.electronAPI.selectSaveFolder();
        console.log("Selected save path:", path);
        if (path) {
          updatePaths();
          updateButtonTexts();
        }
      } catch (error) {
        console.error("Error selecting save folder:", error);
      }
    });
  }

  if (copyFolderBtn) {
    copyFolderBtn.addEventListener("click", async () => {
      console.log("Copy folder button clicked");
      try {
        const path = await window.electronAPI.selectCopyFolder();
        console.log("Selected copy path:", path);
        if (path) {
          updatePaths();
          updateButtonTexts();
        }
      } catch (error) {
        console.error("Error selecting copy folder:", error);
      }
    });
  }

  console.log("Initial state of elements:", {
    filePrompt: document.getElementById("file-prompt")?.className,
    settings: document.getElementById("settings")?.className,
  });

  let selectedSavePath = null;

  const saveBtn = document.getElementById("save-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      if (!currentFile) return;
      try {
        const newName = document.getElementById("new-name")?.value?.trim();

        if (!newName) {
          toggleViews(false);
          currentFile = null;
          return;
        }

        const savePath = await window.electronAPI.getSavePath();
        if (!savePath) {
          console.log("No default save path set");
          return;
        }

        await window.electronAPI.saveFile({
          sourcePath: currentFile.path,
          newName,
          customCopyPath: savePath,
          keepOriginal: false,
        });

        toggleViews(false);
        currentFile = null;
      } catch (error) {
        console.error("Error in keep/rename handler:", error);
      }
    });
  }

  const defaultCopyBtn = document.getElementById("default-copy-btn");
  if (defaultCopyBtn) {
    defaultCopyBtn.addEventListener("click", async () => {
      if (!currentFile) return;
      try {
        const copyPath = await window.electronAPI.getCopyPath();
        if (!copyPath) {
          console.log("No default copy path set");
          return;
        }

        const newName =
          document.getElementById("new-name")?.value || currentFile.filename;
        const deleteAfterCopy =
          document.getElementById("delete-after-copy")?.checked || false;

        await window.electronAPI.saveFile({
          sourcePath: currentFile.path,
          newName,
          keepOriginal: !deleteAfterCopy,
          customCopyPath: copyPath,
        });

        await handleCopySuccess(copyPath, newName);
      } catch (error) {
        console.error("Error in default copy handler:", error);
      }
    });
  }

  const copyBtn = document.getElementById("copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      if (!currentFile) return;
      try {
        const copyPath = await window.electronAPI.selectCopyFolder();
        if (!copyPath) return;

        const newName =
          document.getElementById("new-name")?.value || currentFile.filename;
        const updateDefault =
          document.getElementById("update-default")?.checked || false;
        const deleteAfterCopy =
          document.getElementById("delete-after-copy")?.checked || false;

        await window.electronAPI.saveFile({
          sourcePath: currentFile.path,
          newName,
          keepOriginal: !deleteAfterCopy,
          customCopyPath: copyPath,
        });

        if (updateDefault) {
          await window.electronAPI.setCopyPath(copyPath);
          await updatePaths();
        }

        await handleCopySuccess(copyPath, newName);
      } catch (error) {
        console.error("Error in copy handler:", error);
      }
    });
  }

  const deleteBtn = document.getElementById("delete-btn");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      console.log("Delete button clicked, currentFile:", currentFile);
      if (!currentFile) return;

      try {
        await window.electronAPI.deleteFile(currentFile.path);

        toggleViews(false);
        currentFile = null;
      } catch (error) {
        console.error("Error in delete handler:", error);
      }
    });
  }

  loadSavedPaths();
  toggleViews(false);
});

window.electronAPI.onUpdateWatchPath((_event, path) => {
  console.log("Updating watch path in UI:", path);
  const elements = document.querySelectorAll("#watch-path");
  elements.forEach((element) => {
    element.textContent = path || "Not set";
  });
});

window.electronAPI.onUpdateSavePath((_event, path) => {
  console.log("Updating save path in UI:", path);
  const elements = document.querySelectorAll("#save-path");
  elements.forEach((element) => {
    element.textContent = path.trim() || "Not set";
  });
});

window.electronAPI.onUpdateCopyPath((_event, path) => {
  console.log("Updating copy path in UI:", path);
  const elements = document.querySelectorAll("#copy-path");
  elements.forEach((element) => {
    element.textContent = path || "Not set";
  });
});

async function loadSavedPaths() {
  console.log("Loading saved paths...");
  try {
    const savePath = await window.electronAPI.getSavePath();
    const copyPath = await window.electronAPI.getCopyPath();
    console.log("Loaded paths:", { savePath, copyPath });
    updatePaths();
    updateButtonTexts();

    return { savePath, copyPath };
  } catch (error) {
    console.error("Error loading saved paths:", error);
    return { savePath: null, copyPath: null };
  }
}

console.log("Available electronAPI methods:", Object.keys(window.electronAPI));

document.addEventListener("DOMContentLoaded", updateButtonTexts);

function isGoogleDrivePath(path) {
  return path && path.includes("GoogleDrive");
}

async function handleCopySuccess(copyPath, newName) {
  console.log("handleCopySuccess called with:", { copyPath, newName });

  toggleViews(false);
  currentFile = null;
}
