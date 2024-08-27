// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use std::fs;
use std::path::Path;
use tauri::api::path::app_data_dir;
use tauri::{command, State, Config};


#[command]
fn read_hosts_file() -> Result<String, String> {
    let path = "/etc/hosts";
    if Path::new(path).exists() {
        match fs::read_to_string(path) {
            Ok(content) => Ok(content),
            Err(e) => Err(format!("Failed to read hosts file: {}", e)),
        }
    } else {
        Err("Hosts file does not exist.".to_string())
    }
}

#[command]
fn save_host_file(oldname: Option<String>, name: String, content: String, config: State<Config>) -> Result<(), String> {    
    println!("oldname: {:?}", oldname);
    println!("name: {:?}", name);
    let mut path = app_data_dir(&config).unwrap_or_else(|| {        
        let mut fallback_path = std::env::current_dir().unwrap();
        fallback_path.push("/my-hosts");
        fallback_path
    });

    path.push("my-hosts");

    println!("Base path: {:?}", path);

    if let Some(old) = oldname {
        let mut old_path = path.clone();
        old_path.push(&old);


        println!("Old file path: {:?}", old_path);

        if old_path.exists() {
            if let Err(e) = fs::remove_file(&old_path) {
                return Err(format!("Failed to remove old file: {}", e));
            }
            println!("Old file removed: {:?}", old_path);
        }
    }

    path.push(&name);
    

    println!("New file path: {:?}", path);

    if let Some(parent) = path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|err| err.to_string())?;
            println!("Created directories for path: {:?}", parent);
        }
    }

    match fs::write(path, content) {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

#[command]
fn list_host_files(config: State<Config>) -> Result<Vec<String>, String> {
    let mut path = app_data_dir(&config).unwrap_or_else(|| {
        let mut fallback_path = std::env::current_dir().unwrap();
        fallback_path.push("my-hosts");
        fallback_path
    });

    path.push("my-hosts");

    if !path.exists() {
        return Ok(vec![]); 
    }

    let mut file_names = vec![];

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries {
            if let Ok(entry) = entry {
                if let Some(file_name) = entry.path().file_name() {
                    if let Some(file_name_str) = file_name.to_str() {
                        file_names.push(file_name_str.to_string());
                    }
                }
            }
        }
    } else {
        return Err("Failed to read directory".to_string());
    }

    Ok(file_names)
}

#[command]
fn read_host_file(name: String, config: State<Config>) -> Result<String, String> {
    let mut path = app_data_dir(&config).unwrap_or_else(|| {
        let mut fallback_path = std::env::current_dir().unwrap();
        fallback_path.push("my-hosts");
        fallback_path
    });

    path.push("my-hosts");
    path.push(name);

    if path.exists() {
        match fs::read_to_string(path) {
            Ok(content) => Ok(content),
            Err(e) => Err(format!("Failed to read file: {}", e)),
        }
    } else {
        Ok("".to_string())
    }
}


#[command]
fn apply_host_file(name: String, config: State<Config>) -> Result<(), String> {
    let mut path = app_data_dir(&config).unwrap_or_else(|| {
        let mut fallback_path = std::env::current_dir().unwrap();
        fallback_path.push("my-hosts");
        fallback_path
    });

    path.push("my-hosts");
    path.push(&name);

    let destination = "/etc/hosts";

    if path.exists() {        
        let script = format!("do shell script \"sudo cp '{}' '{}'\" with administrator privileges", path.to_str().unwrap(), destination);
        
        let output = Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output();

        match output {
            Ok(output) => {
                if output.status.success() {
                    Ok(())
                } else {
                    Err(format!(
                        "Failed to apply hosts file with error: {}",
                        String::from_utf8_lossy(&output.stderr)
                    ))
                }
            }
            Err(e) => Err(format!("Failed to execute command: {}", e)),
        }
    } else {
        Err("Selected hosts file does not exist.".to_string())
    }
}

#[command]
fn get_app_data_dir(config: State<Config>) -> Result<String, String> {
    match app_data_dir(&config) {
        Some(path) => Ok(path.to_string_lossy().into_owned()),
        None => Err("Failed to get app data directory".to_string()),
    }
}

#[command]
fn save_current_host_name(name: String, config: State<Config>) -> Result<(), String> {
    let mut path = app_data_dir(&config).unwrap_or_else(|| {
        let mut fallback_path = std::env::current_dir().unwrap();
        fallback_path.push("/my-hosts");
        fallback_path
    });

    path.push("private-host-secret-host-current-host.txt");

    fs::write(&path, name).map_err(|err| err.to_string())?;
    Ok(())
}


#[command]
fn read_current_host_name(config: State<Config>) -> Result<String, String> {
    let mut path = app_data_dir(&config).unwrap_or_else(|| {
        let mut fallback_path = std::env::current_dir().unwrap();
        fallback_path.push("/my-hosts");
        fallback_path
    });

    path.push("private-host-secret-host-current-host.txt");

    if path.exists() {
        fs::read_to_string(&path).map_err(|err| err.to_string())
    } else {
        Ok(String::new())  // 파일이 없으면 빈 문자열 반환
    }
}

#[command]
fn delete_host_file(name: String, config: State<Config>) -> Result<(), String> {
    let mut path = app_data_dir(&config).unwrap_or_else(|| {
        let mut fallback_path = std::env::current_dir().unwrap();
        fallback_path.push("my-hosts");
        fallback_path
    });

    path.push("my-hosts");
    path.push(name);

    if path.exists() {
        match fs::remove_file(&path) {
            Ok(_) => Ok(()),
            Err(e) => Err(format!("Failed to delete file: {}", e)),
        }
    } else {
        Err("File does not exist.".to_string())
    }
}

fn main() {
    let context = tauri::generate_context!();

    tauri::Builder::default()
        .manage(context.config().clone()) 
        .invoke_handler(tauri::generate_handler![read_hosts_file, save_host_file, list_host_files, read_host_file, apply_host_file, get_app_data_dir, save_current_host_name, read_current_host_name, delete_host_file])
        .run(context)
        .expect("error while running tauri application");
}
