const { app, BrowserWindow, shell } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const BACKEND_PORT = 8765;
const backendDir = path.join(__dirname, "..", "backend");
let backend = null;
let sourceWin = null;

// One reusable window that shows imported files (PDF copies served by the backend).
function openSourceWindow(url) {
  if (!sourceWin || sourceWin.isDestroyed()) {
    sourceWin = new BrowserWindow({
      width: 1100,
      height: 800,
      title: "Source",
      autoHideMenuBar: true,
      webPreferences: { plugins: true, contextIsolation: true, nodeIntegration: false },
    });
    sourceWin.on("closed", () => { sourceWin = null; });
  }
  sourceWin.loadURL(url);
  sourceWin.show();
  sourceWin.focus();
}

function pythonPath() {
  const venv = process.platform === "win32"
    ? path.join(backendDir, ".venv", "Scripts", "python.exe")
    : path.join(backendDir, ".venv", "bin", "python");
  return fs.existsSync(venv) ? venv : "python";
}

function startBackend() {
  backend = spawn(
    pythonPath(),
    ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", String(BACKEND_PORT)],
    { cwd: backendDir, stdio: "inherit", windowsHide: true }
  );
  backend.on("exit", (code) => {
    if (code) console.error(`[backend] exited with code ${code}`);
    backend = null;
  });
}

function stopBackend() {
  if (!backend) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(backend.pid), "/f", "/t"]);
  } else {
    backend.kill();
  }
  backend = null;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#f6f7fb",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(`http://127.0.0.1:${BACKEND_PORT}/api/docs/`)) {
      openSourceWindow(url);
      return { action: "deny" };
    }
    shell.openExternal(url);
    return { action: "deny" };
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) win.loadURL(devUrl);
  else win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

app.whenReady().then(() => {
  if (!process.env.SKIP_BACKEND) startBackend();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("will-quit", stopBackend);
