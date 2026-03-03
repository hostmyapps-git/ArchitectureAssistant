const { app, BrowserWindow, Menu, dialog, ipcMain } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const APP_NAME = "DeltaModel Architecture Assistant";
const DEFAULT_WINDOW_WIDTH = 1500;
const DEFAULT_WINDOW_HEIGHT = 980;
const DEFAULT_META_MODEL_FILE_NAME = "NAFv4-ADMBw-2025.10.meta.json";

let mainWindow = null;

function resolveIconPath(iconFileName) {
  const candidateDirs = [
    path.join(process.resourcesPath || "", "icons"),
    path.join(app.getAppPath(), "src-tauri", "icons"),
    path.join(__dirname, "..", "src-tauri", "icons"),
    path.join(process.cwd(), "src-tauri", "icons")
  ];
  for (const iconDir of candidateDirs) {
    if (!iconDir) {
      continue;
    }
    const fullPath = path.join(iconDir, iconFileName);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return "";
}

function resolveWindowIconPath() {
  const iconFileName = process.platform === "darwin"
    ? "icon.icns"
    : (process.platform === "win32" ? "icon.ico" : "icon.png");
  return resolveIconPath(iconFileName);
}

function resolveDockIconPath() {
  return resolveIconPath("icon.png");
}

function candidateMetaModelDirs() {
  const dirs = [];
  const cwd = process.cwd();
  dirs.push(path.join(cwd, "metaModels"));
  if (path.basename(cwd) === "src-tauri") {
    dirs.push(path.join(cwd, "..", "metaModels"));
  }

  const appPath = app.getAppPath();
  dirs.push(path.join(appPath, "metaModels"));

  const exeDir = path.dirname(process.execPath);
  dirs.push(path.join(exeDir, "metaModels"));
  dirs.push(path.join(exeDir, "_up_", "metaModels"));

  const resourceDir = process.resourcesPath;
  if (resourceDir) {
    dirs.push(path.join(resourceDir, "metaModels"));
    dirs.push(path.join(resourceDir, "_up_", "metaModels"));
  }

  const seen = new Set();
  return dirs.filter((entry) => {
    const normalized = path.resolve(entry);
    if (seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

function resolveMetaModelFilePath(fileName) {
  const sanitized = path.basename(String(fileName || "").trim());
  if (!sanitized) {
    return null;
  }
  for (const dir of candidateMetaModelDirs()) {
    const fullPath = path.join(dir, sanitized);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      return fullPath;
    }
  }
  return null;
}

function extractDeclaredEncoding(buffer) {
  const head = buffer.subarray(0, Math.min(buffer.length, 2048)).toString("latin1");
  const lower = head.toLowerCase();
  const encodingPos = lower.indexOf("encoding");
  if (encodingPos < 0) {
    return null;
  }
  const after = head.slice(encodingPos + "encoding".length);
  const equalPos = after.indexOf("=");
  if (equalPos < 0) {
    return null;
  }
  const valuePart = after.slice(equalPos + 1).trimStart();
  const quote = valuePart[0];
  if (quote !== '"' && quote !== "'") {
    return null;
  }
  const endPos = valuePart.indexOf(quote, 1);
  if (endPos < 0) {
    return null;
  }
  const label = valuePart.slice(1, endPos).trim();
  return label || null;
}

function decodeXmlBuffer(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(buffer.subarray(3));
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(buffer.subarray(2));
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    const swapped = Buffer.allocUnsafe(buffer.length - 2);
    for (let index = 2; index < buffer.length; index += 2) {
      swapped[index - 2] = buffer[index + 1] || 0;
      swapped[index - 1] = buffer[index] || 0;
    }
    return new TextDecoder("utf-16le").decode(swapped);
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch (_error) {
    // continue with declared encoding and fallbacks
  }

  const declared = extractDeclaredEncoding(buffer);
  if (declared) {
    try {
      return new TextDecoder(declared).decode(buffer);
    } catch (_error) {
      // continue with fallback
    }
  }

  try {
    return new TextDecoder("windows-1252").decode(buffer);
  } catch (_error) {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

function emitNativeMenuAction(action) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.webContents.send("native-menu-action", { action });
}

function createAppMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "New Architecture",
          accelerator: "CmdOrCtrl+N",
          click: () => emitNativeMenuAction("new-architecture")
        },
        {
          label: "Load Architecture...",
          accelerator: "CmdOrCtrl+O",
          click: () => emitNativeMenuAction("import-json")
        },
        {
          label: "Save Architecture As...",
          accelerator: "CmdOrCtrl+S",
          click: () => emitNativeMenuAction("export-json")
        },
        {
          label: "Export HTML Report...",
          accelerator: "CmdOrCtrl+Shift+S",
          click: () => emitNativeMenuAction("export-html")
        },
        { type: "separator" },
        {
          label: "Load MetaModel JSON...",
          accelerator: "CmdOrCtrl+Shift+L",
          click: () => emitNativeMenuAction("load-meta-model-json")
        },
        {
          label: "Load MDG XML...",
          accelerator: "CmdOrCtrl+L",
          click: () => emitNativeMenuAction("load-mdg-xml")
        },
        { type: "separator" },
        { role: "quit" }
      ]
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
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: [
        {
          label: "Reload",
          accelerator: "CmdOrCtrl+R",
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.reload();
            }
          }
        },
        {
          label: "Toggle Developer Tools",
          accelerator: "CmdOrCtrl+Alt+I",
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.toggleDevTools();
            }
          }
        },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    }
  ];

  if (process.platform === "darwin") {
    template.unshift({
      label: app.name,
      submenu: [{ role: "about" }, { type: "separator" }, { role: "services" }, { type: "separator" }, { role: "hide" }, { role: "hideOthers" }, { role: "unhide" }, { type: "separator" }, { role: "quit" }]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function pickOpenFile(filters) {
  const targetWindow = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
  const result = await dialog.showOpenDialog(targetWindow, {
    properties: ["openFile"],
    filters: filters
  });
  if (result.canceled || !result.filePaths.length) {
    return null;
  }
  return result.filePaths[0];
}

async function pickSaveFile(suggestedName, filters) {
  const targetWindow = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
  const result = await dialog.showSaveDialog(targetWindow, {
    defaultPath: suggestedName || undefined,
    filters: filters
  });
  if (result.canceled || !result.filePath) {
    return null;
  }
  return result.filePath;
}

function registerIpcHandlers() {
  ipcMain.handle("tauri-invoke", async (_event, commandName, payload) => {
    const args = payload || {};

    if (commandName === "open_json_file") {
      const filePath = await pickOpenFile([{ name: "JSON", extensions: ["json"] }]);
      if (!filePath) {
        return null;
      }
      return fs.readFileSync(filePath, "utf-8");
    }

    if (commandName === "open_json_file_with_path") {
      const filePath = await pickOpenFile([{ name: "JSON", extensions: ["json"] }]);
      if (!filePath) {
        return null;
      }
      return {
        path: filePath,
        content: fs.readFileSync(filePath, "utf-8")
      };
    }

    if (commandName === "open_mdg_xml_file") {
      const filePath = await pickOpenFile([{ name: "XML", extensions: ["xml"] }]);
      if (!filePath) {
        return null;
      }
      const buffer = fs.readFileSync(filePath);
      return decodeXmlBuffer(buffer);
    }

    if (commandName === "save_json_file") {
      const suggestedName = args.suggestedName || args.suggested_name;
      const jsonContent = args.jsonContent != null ? args.jsonContent : args.json_content;
      const filePath = await pickSaveFile(suggestedName, [{ name: "JSON", extensions: ["json"] }]);
      if (!filePath) {
        return null;
      }
      if (jsonContent == null) {
        throw new Error("save_json_file missing json content");
      }
      fs.writeFileSync(filePath, String(jsonContent), "utf-8");
      return filePath;
    }

    if (commandName === "save_html_file") {
      const suggestedName = args.suggestedName || args.suggested_name;
      const htmlContent = args.htmlContent != null ? args.htmlContent : args.html_content;
      const filePath = await pickSaveFile(suggestedName, [{ name: "HTML", extensions: ["html", "htm"] }]);
      if (!filePath) {
        return null;
      }
      if (htmlContent == null) {
        throw new Error("save_html_file missing html content");
      }
      fs.writeFileSync(filePath, String(htmlContent), "utf-8");
      return filePath;
    }

    if (commandName === "save_svg_file") {
      const suggestedName = args.suggestedName || args.suggested_name;
      const svgContent = args.svgContent != null ? args.svgContent : args.svg_content;
      const filePath = await pickSaveFile(suggestedName, [{ name: "SVG", extensions: ["svg"] }]);
      if (!filePath) {
        return null;
      }
      if (svgContent == null) {
        throw new Error("save_svg_file missing svg content");
      }
      fs.writeFileSync(filePath, String(svgContent), "utf-8");
      return filePath;
    }

    if (commandName === "save_png_file") {
      const suggestedName = args.suggestedName || args.suggested_name;
      const pngBytes = Array.isArray(args.pngBytes) ? args.pngBytes : args.png_bytes;
      const filePath = await pickSaveFile(suggestedName, [{ name: "PNG", extensions: ["png"] }]);
      if (!filePath) {
        return null;
      }
      if (!Array.isArray(pngBytes)) {
        throw new Error("save_png_file missing png bytes");
      }
      const bytes = Buffer.from(pngBytes);
      fs.writeFileSync(filePath, bytes);
      return filePath;
    }

    if (commandName === "list_bundled_meta_model_files") {
      const names = [];
      for (const dir of candidateMetaModelDirs()) {
        if (!fs.existsSync(dir)) {
          continue;
        }
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isFile()) {
            continue;
          }
          const fileName = entry.name;
          if (!fileName.toLowerCase().endsWith(".meta.json")) {
            continue;
          }
          names.push(fileName);
        }
      }
      return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
    }

    if (commandName === "read_bundled_meta_model_file") {
      const fileName = String(args.fileName || "").trim();
      const filePath = resolveMetaModelFilePath(fileName);
      if (!filePath) {
        const searchedDirs = candidateMetaModelDirs().join(", ");
        throw new Error(
          `Bundled metamodel JSON not found: '${fileName}' (searched dirs: ${searchedDirs})`
        );
      }
      return fs.readFileSync(filePath, "utf-8");
    }

    throw new Error(`Unsupported command: ${commandName}`);
  });
}

function createMainWindow() {
  const appIconPath = resolveWindowIconPath();
  mainWindow = new BrowserWindow({
    title: APP_NAME,
    width: DEFAULT_WINDOW_WIDTH,
    height: DEFAULT_WINDOW_HEIGHT,
    icon: fs.existsSync(appIconPath) ? appIconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false
    }
  });

  const devUrl = process.env.APP_DEV_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    const candidateEntries = [
      path.join(app.getAppPath(), "frontend-dist", "index.html"),
      path.resolve(__dirname, "..", "frontend-dist", "index.html"),
      path.resolve(process.cwd(), "frontend-dist", "index.html"),
      path.join(app.getAppPath(), "index.html"),
      path.resolve(__dirname, "..", "index.html")
    ];
    const resolvedEntry = candidateEntries.find((entry) => fs.existsSync(entry));
    if (!resolvedEntry) {
      throw new Error(
        "No frontend entry found. Checked: " + candidateEntries.join(", ")
      );
    }
    mainWindow.loadFile(resolvedEntry);
  }

  mainWindow.webContents.once("did-finish-load", () => {
    // Mirror current Tauri behavior where a default metamodel is loaded from frontend bootstrap.
    mainWindow.webContents.send("native-menu-action", { action: "noop", defaultMetaModel: DEFAULT_META_MODEL_FILE_NAME });
  });
}

app.setName(APP_NAME);
app.whenReady().then(() => {
  const dockIconPath = resolveDockIconPath();
  if (process.platform === "darwin" && app.dock && fs.existsSync(dockIconPath)) {
    try {
      app.dock.setIcon(dockIconPath);
    } catch (error) {
      console.warn("[electron] failed to set dock icon", error);
    }
  }
  createAppMenu();
  registerIpcHandlers();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}).catch((error) => {
  console.error("[electron] startup failed", error);
  app.quit();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
