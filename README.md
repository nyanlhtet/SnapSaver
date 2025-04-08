# SnapSaver

SnapSaver is a lightweight macOS application designed to help you organize your screenshots and screen recordings. Once you designate a folder to be "watched," Chokidar automatically detects and manages any new files added. With SnapSaver, you can:

1. 🔍 Automatically detect new screenshots and screen recordings in your selected folder and choose whether to "keep" or "delete" them.
2. 🏷️ Rename files as needed.
3. 🗑️ Easily discard unwanted captures.
4. 📂 Optionally copy or move files directly to a designated folder, such as a shared Google Drive folder.

## Installation

1. Clone this repository:

```bash
git clone https://github.com/yourusername/SnapSaver.git
```

2. Install dependencies:

```bash
yarn install
```

3. Start the application:
```bash
yarn start
```

## 🛠️ Setup & Usage

### 1. **First Time Setup**:
   - Click the SnapSaver icon in your menu bar.
   - Set your **Screenshot Folder** (the location where your QuickTime screenshots are saved).
   - Optionally, set a **Copy Location** (the folder where copies will be saved). If you have Google Drive installed, you can directly copy or move screenshots to your Google Drive folder.

### 2. **Managing Screenshots**:
   - When a new screenshot is detected, SnapSaver will display a notification.
   - You can choose to either:
     - Keep the screenshot (optionally renaming it for better organization).
     - Delete the screenshot.
   - If a **Copy Location** is set, you can choose to copy the screenshot directly to that folder.
     - Optionally select **"Delete after copying"** to remove the original screenshot (e.g., move it directly to Google Drive and delete the original file).

#### 🔜 Coming Soon
Stay tuned for an easy macOS installer!