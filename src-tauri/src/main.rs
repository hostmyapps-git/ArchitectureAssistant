#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::mpsc;

use encoding_rs::{Encoding, UTF_16BE, UTF_16LE, WINDOWS_1252};
use rfd::FileDialog;
use serde::Serialize;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{Emitter, Manager};

#[derive(Serialize, Clone)]
struct MenuActionPayload {
  action: String,
}

#[derive(Serialize, Clone)]
struct PickedTextFile {
  path: String,
  content: String,
}

fn candidate_meta_model_dirs(app: &tauri::AppHandle) -> Vec<PathBuf> {
  let mut dirs = Vec::new();
  if let Ok(current_dir) = std::env::current_dir() {
    dirs.push(current_dir.join("metaModels"));
    if current_dir
      .file_name()
      .and_then(|name| name.to_str())
      .map(|name| name == "src-tauri")
      .unwrap_or(false)
    {
      dirs.push(current_dir.join("..").join("metaModels"));
    }
  }
  if let Ok(exe_path) = std::env::current_exe() {
    if let Some(exe_dir) = exe_path.parent() {
      dirs.push(exe_dir.join("metaModels"));
      dirs.push(exe_dir.join("_up_").join("metaModels"));
    }
  }
  if let Ok(resource_dir) = app.path().resource_dir() {
    dirs.push(resource_dir.join("metaModels"));
    dirs.push(resource_dir.join("_up_").join("metaModels"));
  }
  let mut seen = std::collections::HashSet::new();
  dirs
    .into_iter()
    .filter(|dir| seen.insert(dir.clone()))
    .collect()
}

fn resolve_meta_model_file_path(app: &tauri::AppHandle, file_name: &str) -> Option<PathBuf> {
  let sanitized = Path::new(file_name)
    .file_name()
    .and_then(|name| name.to_str())
    .map(str::to_string)?;
  candidate_meta_model_dirs(app)
    .into_iter()
    .map(|dir| dir.join(&sanitized))
    .find(|path| path.is_file())
}

fn extract_declared_encoding(bytes: &[u8]) -> Option<String> {
  let head = String::from_utf8_lossy(&bytes[..bytes.len().min(2048)]).to_string();
  let lower = head.to_lowercase();
  let encoding_pos = lower.find("encoding")?;
  let after_key = &head[encoding_pos + "encoding".len()..];
  let equal_pos = after_key.find('=')?;
  let value_part = after_key[equal_pos + 1..].trim_start();
  let mut chars = value_part.chars();
  let quote = chars.next()?;
  if quote != '"' && quote != '\'' {
    return None;
  }
  let rest: String = chars.collect();
  let end_pos = rest.find(quote)?;
  let label = rest[..end_pos].trim();
  if label.is_empty() {
    return None;
  }
  Some(label.to_string())
}

fn decode_xml_text(bytes: &[u8]) -> Result<String, String> {
  if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
    return String::from_utf8(bytes[3..].to_vec())
      .map_err(|err| format!("Failed to decode UTF-8 XML: {err}"));
  }
  if bytes.starts_with(&[0xFF, 0xFE]) {
    let (text, _, _) = UTF_16LE.decode(&bytes[2..]);
    return Ok(text.into_owned());
  }
  if bytes.starts_with(&[0xFE, 0xFF]) {
    let (text, _, _) = UTF_16BE.decode(&bytes[2..]);
    return Ok(text.into_owned());
  }

  if let Ok(text) = String::from_utf8(bytes.to_vec()) {
    return Ok(text);
  }

  if let Some(label) = extract_declared_encoding(bytes) {
    if let Some(encoding) = Encoding::for_label(label.as_bytes()) {
      let (text, _, _) = encoding.decode(bytes);
      return Ok(text.into_owned());
    }
  }

  let zero_on_odd = bytes
    .iter()
    .enumerate()
    .take(128)
    .filter(|(index, byte)| index % 2 == 1 && **byte == 0)
    .count();
  let zero_on_even = bytes
    .iter()
    .enumerate()
    .take(128)
    .filter(|(index, byte)| index % 2 == 0 && **byte == 0)
    .count();
  if zero_on_odd >= 8 || zero_on_even >= 8 {
    let (text, _, _) = if zero_on_odd >= zero_on_even {
      UTF_16LE.decode(bytes)
    } else {
      UTF_16BE.decode(bytes)
    };
    return Ok(text.into_owned());
  }

  let (text, _, _) = WINDOWS_1252.decode(bytes);
  Ok(text.into_owned())
}

fn read_xml_file_with_encoding(path: &Path) -> Result<String, String> {
  let bytes = fs::read(path).map_err(|err| format!("Failed to read XML file: {err}"))?;
  decode_xml_text(&bytes)
}

#[tauri::command]
fn open_json_file(app: tauri::AppHandle) -> Result<Option<String>, String> {
  let (tx, rx) = mpsc::channel();
  app
    .run_on_main_thread(move || {
      let picked = FileDialog::new()
        .add_filter("JSON", &["json"])
        .pick_file();
      let _ = tx.send(picked);
    })
    .map_err(|err| format!("Failed to open JSON picker on main thread: {err}"))?;
  let picked = rx.recv().map_err(|err| format!("JSON picker channel failed: {err}"))?;
  let Some(path) = picked else {
    return Ok(None);
  };
  fs::read_to_string(path)
    .map(Some)
    .map_err(|err| format!("Failed to read JSON file: {err}"))
}

#[tauri::command]
fn open_json_file_with_path(app: tauri::AppHandle) -> Result<Option<PickedTextFile>, String> {
  let (tx, rx) = mpsc::channel();
  app
    .run_on_main_thread(move || {
      let picked = FileDialog::new()
        .add_filter("JSON", &["json"])
        .pick_file();
      let _ = tx.send(picked);
    })
    .map_err(|err| format!("Failed to open JSON picker on main thread: {err}"))?;
  let picked = rx.recv().map_err(|err| format!("JSON picker channel failed: {err}"))?;
  let Some(path) = picked else {
    return Ok(None);
  };
  let content = fs::read_to_string(&path)
    .map_err(|err| format!("Failed to read JSON file: {err}"))?;
  Ok(Some(PickedTextFile {
    path: path.to_string_lossy().to_string(),
    content,
  }))
}

#[tauri::command]
fn open_mdg_xml_file(app: tauri::AppHandle) -> Result<Option<String>, String> {
  let (tx, rx) = mpsc::channel();
  app
    .run_on_main_thread(move || {
      let picked = FileDialog::new()
        .add_filter("XML", &["xml"])
        .pick_file();
      let _ = tx.send(picked);
    })
    .map_err(|err| format!("Failed to open XML picker on main thread: {err}"))?;
  let picked = rx.recv().map_err(|err| format!("XML picker channel failed: {err}"))?;
  let Some(path) = picked else {
    return Ok(None);
  };
  read_xml_file_with_encoding(&path)
    .map(Some)
    .map_err(|err| format!("Failed to read MDG XML file '{}' : {err}", path.to_string_lossy()))
}

#[tauri::command]
fn save_json_file(
  app: tauri::AppHandle,
  suggested_name: String,
  json_content: String,
) -> Result<Option<String>, String> {
  let (tx, rx) = mpsc::channel();
  app
    .run_on_main_thread(move || {
      let picked = FileDialog::new()
        .set_file_name(&suggested_name)
        .add_filter("JSON", &["json"])
        .save_file();
      let _ = tx.send(picked);
    })
    .map_err(|err| format!("Failed to open save dialog on main thread: {err}"))?;
  let picked = rx.recv().map_err(|err| format!("Save dialog channel failed: {err}"))?;
  let Some(path) = picked else {
    return Ok(None);
  };
  fs::write(&path, json_content).map_err(|err| format!("Failed to write JSON file: {err}"))?;
  Ok(Some(path.to_string_lossy().to_string()))
}

#[tauri::command]
fn save_html_file(
  app: tauri::AppHandle,
  suggested_name: String,
  html_content: String,
) -> Result<Option<String>, String> {
  let (tx, rx) = mpsc::channel();
  app
    .run_on_main_thread(move || {
      let picked = FileDialog::new()
        .set_file_name(&suggested_name)
        .add_filter("HTML", &["html", "htm"])
        .save_file();
      let _ = tx.send(picked);
    })
    .map_err(|err| format!("Failed to open save dialog on main thread: {err}"))?;
  let picked = rx.recv().map_err(|err| format!("Save dialog channel failed: {err}"))?;
  let Some(path) = picked else {
    return Ok(None);
  };
  fs::write(&path, html_content).map_err(|err| format!("Failed to write HTML file: {err}"))?;
  Ok(Some(path.to_string_lossy().to_string()))
}

#[tauri::command]
fn save_svg_file(
  app: tauri::AppHandle,
  suggested_name: String,
  svg_content: String,
) -> Result<Option<String>, String> {
  let (tx, rx) = mpsc::channel();
  app
    .run_on_main_thread(move || {
      let picked = FileDialog::new()
        .set_file_name(&suggested_name)
        .add_filter("SVG", &["svg"])
        .save_file();
      let _ = tx.send(picked);
    })
    .map_err(|err| format!("Failed to open save dialog on main thread: {err}"))?;
  let picked = rx.recv().map_err(|err| format!("Save dialog channel failed: {err}"))?;
  let Some(path) = picked else {
    return Ok(None);
  };
  fs::write(&path, svg_content).map_err(|err| format!("Failed to write SVG file: {err}"))?;
  Ok(Some(path.to_string_lossy().to_string()))
}

#[tauri::command]
fn save_png_file(
  app: tauri::AppHandle,
  suggested_name: String,
  png_bytes: Vec<u8>,
) -> Result<Option<String>, String> {
  let (tx, rx) = mpsc::channel();
  app
    .run_on_main_thread(move || {
      let picked = FileDialog::new()
        .set_file_name(&suggested_name)
        .add_filter("PNG", &["png"])
        .save_file();
      let _ = tx.send(picked);
    })
    .map_err(|err| format!("Failed to open save dialog on main thread: {err}"))?;
  let picked = rx.recv().map_err(|err| format!("Save dialog channel failed: {err}"))?;
  let Some(path) = picked else {
    return Ok(None);
  };
  fs::write(&path, png_bytes).map_err(|err| format!("Failed to write PNG file: {err}"))?;
  Ok(Some(path.to_string_lossy().to_string()))
}

#[tauri::command]
fn list_bundled_meta_model_files(app: tauri::AppHandle) -> Result<Vec<String>, String> {
  let mut names: Vec<String> = candidate_meta_model_dirs(&app)
    .into_iter()
    .filter_map(|dir| fs::read_dir(dir).ok())
    .flat_map(|entries| entries.flatten())
    .filter_map(|entry| {
      let path = entry.path();
      if !path.is_file() {
        return None;
      }
      let ext = path.extension().and_then(|value| value.to_str()).unwrap_or("");
      if !ext.eq_ignore_ascii_case("json") {
        return None;
      }
      let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .map(str::to_string)?;
      if !file_name.to_ascii_lowercase().ends_with(".meta.json") {
        return None;
      }
      Some(file_name)
    })
    .collect();
  names.sort();
  names.dedup();
  Ok(names)
}

#[tauri::command]
fn read_bundled_meta_model_file(app: tauri::AppHandle, file_name: String) -> Result<String, String> {
  let Some(path) = resolve_meta_model_file_path(&app, &file_name) else {
    let candidates = candidate_meta_model_dirs(&app)
      .into_iter()
      .map(|entry| entry.to_string_lossy().to_string())
      .collect::<Vec<_>>()
      .join(", ");
    return Err(format!(
      "Bundled metamodel JSON not found: '{}' (searched dirs: {})",
      file_name, candidates
    ));
  };
  fs::read_to_string(&path).map_err(|err| {
    format!(
      "Failed to read bundled metamodel JSON '{}' from '{}': {err}",
      file_name,
      path.to_string_lossy()
    )
  })
}

fn main() {
  tauri::Builder::default()
    .setup(|app| {
      if let Some(window) = app.get_webview_window("main") {
        if let Some(icon) = app.default_window_icon().cloned() {
          let _ = window.set_icon(icon);
        }
      }

      let new_architecture = MenuItem::with_id(app, "menu-new-architecture", "New Architecture", true, Some("CmdOrCtrl+N"))?;
      let import_json = MenuItem::with_id(app, "menu-import-json", "Load Architecture...", true, Some("CmdOrCtrl+O"))?;
      let export_json = MenuItem::with_id(app, "menu-export-json", "Save Architecture As...", true, Some("CmdOrCtrl+S"))?;
      let export_html = MenuItem::with_id(
        app,
        "menu-export-html",
        "Export HTML Report...",
        true,
        Some("CmdOrCtrl+Shift+S"),
      )?;
      let load_meta_model_json = MenuItem::with_id(
        app,
        "menu-load-meta-model-json",
        "Load MetaModel JSON...",
        true,
        Some("CmdOrCtrl+Shift+L"),
      )?;
      let load_mdg = MenuItem::with_id(app, "menu-load-mdg-xml", "Load MDG XML...", true, Some("CmdOrCtrl+L"))?;
      let reload_view = MenuItem::with_id(app, "menu-reload-view", "Reload", true, Some("CmdOrCtrl+R"))?;
      let toggle_devtools = MenuItem::with_id(
        app,
        "menu-toggle-devtools",
        "Toggle Developer Tools",
        true,
        Some("CmdOrCtrl+Alt+I"),
      )?;

      let file_menu = Submenu::with_items(
        app,
        "File",
        true,
        &[&new_architecture, &import_json, &export_json, &export_html, &load_meta_model_json, &load_mdg],
      )?;
      let edit_menu = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
          &PredefinedMenuItem::undo(app, None)?,
          &PredefinedMenuItem::redo(app, None)?,
          &PredefinedMenuItem::separator(app)?,
          &PredefinedMenuItem::cut(app, None)?,
          &PredefinedMenuItem::copy(app, None)?,
          &PredefinedMenuItem::paste(app, None)?,
          &PredefinedMenuItem::select_all(app, None)?,
        ],
      )?;
      let view_menu = Submenu::with_items(app, "View", true, &[&reload_view, &toggle_devtools])?;
      let menu = Menu::with_items(app, &[&file_menu, &edit_menu, &view_menu])?;
      app.set_menu(menu)?;
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      open_json_file,
      open_json_file_with_path,
      open_mdg_xml_file,
      save_json_file,
      save_html_file,
      save_svg_file,
      save_png_file,
      list_bundled_meta_model_files,
      read_bundled_meta_model_file
    ])
    .on_menu_event(|app, event| {
      match event.id().as_ref() {
        "menu-new-architecture" => {
          let _ = app.emit(
            "native-menu-action",
            MenuActionPayload {
              action: "new-architecture".to_string(),
            },
          );
        }
        "menu-import-json" => {
          let _ = app.emit(
            "native-menu-action",
            MenuActionPayload {
              action: "import-json".to_string(),
            },
          );
        }
        "menu-export-json" => {
          let _ = app.emit(
            "native-menu-action",
            MenuActionPayload {
              action: "export-json".to_string(),
            },
          );
        }
        "menu-export-html" => {
          let _ = app.emit(
            "native-menu-action",
            MenuActionPayload {
              action: "export-html".to_string(),
            },
          );
        }
        "menu-load-mdg-xml" => {
          let _ = app.emit(
            "native-menu-action",
            MenuActionPayload {
              action: "load-mdg-xml".to_string(),
            },
          );
        }
        "menu-load-meta-model-json" => {
          let _ = app.emit(
            "native-menu-action",
            MenuActionPayload {
              action: "load-meta-model-json".to_string(),
            },
          );
        }
        "menu-reload-view" => {
          if let Some(window) = app.get_webview_window("main") {
            let _ = window.eval("window.location.reload();");
          }
        }
        "menu-toggle-devtools" => {
          if let Some(window) = app.get_webview_window("main") {
            if window.is_devtools_open() {
              window.close_devtools();
            } else {
              window.open_devtools();
            }
          }
        }
        _ => {}
      }
    })
    .run(tauri::generate_context!())
    .expect("failed to run tauri application");
}
