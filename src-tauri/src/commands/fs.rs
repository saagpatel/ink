use serde::Serialize;
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Clone)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileNode>>,
}

#[tauri::command]
pub async fn list_dir(path: String) -> Result<Vec<FileNode>, String> {
    let dir_path = Path::new(&path);
    if !dir_path.is_dir() {
        return Err(format!("Not a directory: {}", path));
    }
    build_tree(dir_path).map_err(|e| e.to_string())
}

fn build_tree(dir: &Path) -> Result<Vec<FileNode>, std::io::Error> {
    let mut entries: Vec<FileNode> = Vec::new();

    let mut dir_entries: Vec<fs::DirEntry> = fs::read_dir(dir)?
        .filter_map(|e| e.ok())
        .collect();

    dir_entries.sort_by_key(|e| e.file_name());

    for entry in dir_entries {
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files and common noise directories
        if name.starts_with('.') || name == "node_modules" || name == "target" {
            continue;
        }

        let path = entry.path();
        let is_dir = path.is_dir();

        let children = if is_dir {
            Some(build_tree(&path)?)
        } else {
            None
        };

        entries.push(FileNode {
            name,
            path: path.to_string_lossy().to_string(),
            is_dir,
            children,
        });
    }

    // Directories first, then files, both alphabetical
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read {}: {}", path, e))
}

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, &content).map_err(|e| format!("Failed to write {}: {}", path, e))
}
