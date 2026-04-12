use serde::{Deserialize, Serialize};

/// Allowed localhost hostnames for Ollama connectivity.
const ALLOWED_HOSTS: &[&str] = &["localhost", "127.0.0.1", "::1"];

/// Validate that the endpoint URL is a local-only address with an allowed scheme.
/// Returns the normalised base URL string on success.
fn validate_ollama_endpoint(endpoint: &str) -> Result<String, String> {
    let parsed = reqwest::Url::parse(endpoint)
        .map_err(|e| format!("Invalid endpoint URL '{}': {}", endpoint, e))?;

    let scheme = parsed.scheme();
    if scheme != "http" && scheme != "https" {
        return Err(format!(
            "Endpoint scheme '{}' is not allowed — use http or https",
            scheme
        ));
    }

    let host = parsed
        .host_str()
        .ok_or_else(|| format!("Endpoint '{}' has no host", endpoint))?;

    if !ALLOWED_HOSTS.contains(&host) {
        return Err(format!(
            "Endpoint host '{}' is not allowed — Ollama must run on localhost",
            host
        ));
    }

    // Reconstruct a clean base URL (scheme + host + optional port, no trailing slash)
    let base = match parsed.port() {
        Some(port) => format!("{}://{}:{}", scheme, host, port),
        None => format!("{}://{}", scheme, host),
    };
    Ok(base)
}

#[derive(Debug, Serialize)]
pub struct OllamaModel {
    pub name: String,
    pub size: u64,
}

#[derive(Debug, Serialize)]
pub struct OllamaStatus {
    pub connected: bool,
    pub models: Vec<OllamaModel>,
}

#[tauri::command]
pub async fn check_ollama(endpoint: String) -> Result<OllamaStatus, String> {
    let base = validate_ollama_endpoint(&endpoint)?;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("{}/api/tags", base);

    match client.get(&url).send().await {
        Ok(response) => {
            if !response.status().is_success() {
                return Ok(OllamaStatus {
                    connected: false,
                    models: vec![],
                });
            }

            let body: serde_json::Value = response
                .json()
                .await
                .map_err(|e| e.to_string())?;

            let models = body
                .get("models")
                .and_then(|m| m.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|m| {
                            let name = m.get("name")?.as_str()?.to_string();
                            let size = m.get("size")?.as_u64().unwrap_or(0);
                            Some(OllamaModel { name, size })
                        })
                        .collect()
                })
                .unwrap_or_default();

            Ok(OllamaStatus {
                connected: true,
                models,
            })
        }
        Err(_) => Ok(OllamaStatus {
            connected: false,
            models: vec![],
        }),
    }
}

#[derive(Debug, Serialize)]
pub struct GenerateResponse {
    pub response: String,
    pub latency_ms: u64,
}

#[derive(Debug, Deserialize)]
struct OllamaGenerateResponse {
    response: String,
}

#[tauri::command]
pub async fn generate_annotation(
    endpoint: String,
    model: String,
    prompt: String,
) -> Result<GenerateResponse, String> {
    let base = validate_ollama_endpoint(&endpoint)?;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let url = format!("{}/api/generate", base);

    let payload = serde_json::json!({
        "model": model,
        "prompt": prompt,
        "stream": false,
        "options": {
            "temperature": 0.7,
            "num_predict": 120
        }
    });

    let start = std::time::Instant::now();

    let response = client
        .post(&url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Ollama request failed: {}", e))?;

    let latency_ms = start.elapsed().as_millis() as u64;

    if !response.status().is_success() {
        return Err(format!("Ollama returned status {}", response.status()));
    }

    let body: OllamaGenerateResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse Ollama response: {}", e))?;

    Ok(GenerateResponse {
        response: body.response,
        latency_ms,
    })
}
