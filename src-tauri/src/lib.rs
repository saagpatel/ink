mod commands;

use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_files_and_annotations",
            sql: include_str!("../migrations/001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_settings",
            sql: include_str!("../migrations/002_settings.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:ink.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            commands::fs::list_dir,
            commands::fs::read_file,
            commands::fs::write_file,
            commands::ollama::check_ollama,
            commands::ollama::generate_annotation,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
