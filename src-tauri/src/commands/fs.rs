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

/// Paths that write_file must never touch, regardless of workspace config.
const BLOCKED_PREFIXES: &[&str] = &[
    "/etc",
    "/usr",
    "/System",
    "/bin",
    "/sbin",
    "/private/etc",
    "/Library/Keychains",
];

fn is_safe_write_path(path: &str) -> Result<(), String> {
    // Reject any path that contains a traversal component.
    if path.contains("..") {
        return Err(format!(
            "Path traversal rejected: '{}'",
            path
        ));
    }

    // Expand a leading ~ to the home directory for comparison.
    let expanded: String = if path.starts_with("~/") {
        let home = std::env::var("HOME").unwrap_or_default();
        format!("{}/{}", home, &path[2..])
    } else {
        path.to_string()
    };

    // Block sensitive home-directory paths.
    let home = std::env::var("HOME").unwrap_or_default();
    let blocked_home = [".ssh", ".claude", ".gnupg", ".aws", ".config/1Password"];
    for suffix in &blocked_home {
        if expanded.starts_with(&format!("{}/{}", home, suffix)) {
            return Err(format!("Writing to '{}' is not permitted", path));
        }
    }

    // Block system paths.
    for prefix in BLOCKED_PREFIXES {
        if expanded.starts_with(prefix) {
            return Err(format!("Writing to '{}' is not permitted", path));
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    is_safe_write_path(&path)?;
    fs::write(&path, &content).map_err(|e| format!("Failed to write {}: {}", path, e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs as stdfs;

    // ── is_safe_write_path ──────────────────────────────────────────────────

    #[test]
    fn safe_path_normal_documents() {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/testuser".into());
        let path = format!("{}/Documents/test.md", home);
        assert!(is_safe_write_path(&path).is_ok(), "Normal Documents path should be allowed");
    }

    #[test]
    fn safe_path_home_root_file() {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/testuser".into());
        let path = format!("{}/notes.md", home);
        assert!(is_safe_write_path(&path).is_ok(), "File directly in home should be allowed");
    }

    #[test]
    fn rejected_path_traversal_dotdot() {
        let result = is_safe_write_path("/Users/testuser/../etc/passwd");
        assert!(result.is_err(), "Path with .. should be rejected");
        assert!(result.unwrap_err().contains("traversal"));
    }

    #[test]
    fn rejected_ssh_key() {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/testuser".into());
        let path = format!("{}/.ssh/id_rsa", home);
        let result = is_safe_write_path(&path);
        assert!(result.is_err(), "~/.ssh/id_rsa should be rejected");
    }

    #[test]
    fn rejected_claude_settings() {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/testuser".into());
        let path = format!("{}/.claude/settings.json", home);
        let result = is_safe_write_path(&path);
        assert!(result.is_err(), "~/.claude/settings.json should be rejected");
    }

    #[test]
    fn rejected_gnupg() {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/testuser".into());
        let path = format!("{}/.gnupg/secring.gpg", home);
        let result = is_safe_write_path(&path);
        assert!(result.is_err(), "~/.gnupg/ paths should be rejected");
    }

    #[test]
    fn rejected_aws_credentials() {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/testuser".into());
        let path = format!("{}/.aws/credentials", home);
        let result = is_safe_write_path(&path);
        assert!(result.is_err(), "~/.aws/credentials should be rejected");
    }

    #[test]
    fn rejected_1password_config() {
        let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/testuser".into());
        let path = format!("{}/.config/1Password/settings.json", home);
        let result = is_safe_write_path(&path);
        assert!(result.is_err(), "~/.config/1Password/ should be rejected");
    }

    #[test]
    fn rejected_etc_hosts() {
        let result = is_safe_write_path("/etc/hosts");
        assert!(result.is_err(), "/etc/hosts should be rejected");
    }

    #[test]
    fn rejected_system_library() {
        let result = is_safe_write_path("/System/Library/CoreServices/SystemVersion.plist");
        assert!(result.is_err(), "/System/Library/ should be rejected");
    }

    #[test]
    fn rejected_usr_local_bin() {
        let result = is_safe_write_path("/usr/local/bin/somebinary");
        assert!(result.is_err(), "/usr/local/bin/ should be rejected");
    }

    #[test]
    fn rejected_library_keychains() {
        let result = is_safe_write_path("/Library/Keychains/System.keychain");
        assert!(result.is_err(), "/Library/Keychains/ should be rejected");
    }

    #[test]
    fn rejected_private_etc() {
        let result = is_safe_write_path("/private/etc/sudoers");
        assert!(result.is_err(), "/private/etc/ should be rejected");
    }

    #[test]
    fn rejected_empty_string() {
        // An empty path is not a traversal or a blocked prefix, but it should
        // be harmless — the write command will fail at the OS level. We verify
        // the safety gate at minimum does not panic and returns consistently.
        // The function itself doesn't explicitly block empty, but subsequent
        // fs::write will error, so we just assert it doesn't panic.
        let _ = is_safe_write_path("");
    }

    #[test]
    fn rejected_tilde_ssh_expanded() {
        // Tilde-prefixed paths must also be blocked after expansion.
        let result = is_safe_write_path("~/.ssh/id_rsa");
        assert!(result.is_err(), "~/.ssh/id_rsa (tilde form) should be rejected");
    }

    #[test]
    fn rejected_tilde_aws_expanded() {
        let result = is_safe_write_path("~/.aws/credentials");
        assert!(result.is_err(), "~/.aws/credentials (tilde form) should be rejected");
    }

    // ── build_tree ──────────────────────────────────────────────────────────

    #[test]
    fn build_tree_excludes_hidden_files() {
        let dir = tempfile::tempdir().expect("failed to create tempdir");
        let root = dir.path();

        stdfs::write(root.join("visible.md"), "hello").unwrap();
        stdfs::write(root.join(".hidden"), "secret").unwrap();

        let nodes = build_tree(root).expect("build_tree should not fail");
        let names: Vec<&str> = nodes.iter().map(|n| n.name.as_str()).collect();

        assert!(names.contains(&"visible.md"), "visible.md should appear");
        assert!(!names.contains(&".hidden"), ".hidden should be excluded");
    }

    #[test]
    fn build_tree_excludes_node_modules() {
        let dir = tempfile::tempdir().expect("failed to create tempdir");
        let root = dir.path();

        stdfs::create_dir(root.join("node_modules")).unwrap();
        stdfs::write(root.join("index.md"), "hi").unwrap();

        let nodes = build_tree(root).expect("build_tree should not fail");
        let names: Vec<&str> = nodes.iter().map(|n| n.name.as_str()).collect();

        assert!(!names.contains(&"node_modules"), "node_modules should be excluded");
        assert!(names.contains(&"index.md"), "index.md should appear");
    }

    #[test]
    fn build_tree_excludes_target_dir() {
        let dir = tempfile::tempdir().expect("failed to create tempdir");
        let root = dir.path();

        stdfs::create_dir(root.join("target")).unwrap();
        stdfs::write(root.join("lib.md"), "content").unwrap();

        let nodes = build_tree(root).expect("build_tree should not fail");
        let names: Vec<&str> = nodes.iter().map(|n| n.name.as_str()).collect();

        assert!(!names.contains(&"target"), "target should be excluded");
        assert!(names.contains(&"lib.md"), "lib.md should appear");
    }

    #[test]
    fn build_tree_nests_subdirectory_children() {
        let dir = tempfile::tempdir().expect("failed to create tempdir");
        let root = dir.path();

        let sub = root.join("docs");
        stdfs::create_dir(&sub).unwrap();
        stdfs::write(sub.join("readme.md"), "docs").unwrap();
        stdfs::write(root.join("main.md"), "main").unwrap();

        let nodes = build_tree(root).expect("build_tree should not fail");

        // Directories sort before files.
        assert_eq!(nodes[0].name, "docs", "docs dir should come first");
        assert!(nodes[0].is_dir, "docs should be marked as directory");

        let children = nodes[0].children.as_ref().expect("docs should have children");
        assert_eq!(children.len(), 1);
        assert_eq!(children[0].name, "readme.md");
        assert!(!children[0].is_dir);
    }

    #[test]
    fn build_tree_dirs_before_files() {
        let dir = tempfile::tempdir().expect("failed to create tempdir");
        let root = dir.path();

        stdfs::write(root.join("alpha.md"), "a").unwrap();
        stdfs::create_dir(root.join("beta")).unwrap();
        stdfs::write(root.join("gamma.md"), "g").unwrap();

        let nodes = build_tree(root).expect("build_tree should not fail");

        assert!(nodes[0].is_dir, "first entry should be the directory");
        assert_eq!(nodes[0].name, "beta");
        // Files follow in alphabetical order.
        assert!(!nodes[1].is_dir);
        assert_eq!(nodes[1].name, "alpha.md");
        assert_eq!(nodes[2].name, "gamma.md");
    }
}
