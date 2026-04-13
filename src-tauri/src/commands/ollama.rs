use serde::{Deserialize, Serialize};

/// Allowed localhost hostnames for Ollama connectivity.
/// Note: the `url` crate returns IPv6 addresses with surrounding brackets
/// (e.g. `"[::1]"`), so both forms are listed here.
const ALLOWED_HOSTS: &[&str] = &["localhost", "127.0.0.1", "::1", "[::1]"];

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

#[cfg(test)]
mod tests {
    use super::*;

    // ── validate_ollama_endpoint ────────────────────────────────────────────

    #[test]
    fn valid_localhost_http() {
        let result = validate_ollama_endpoint("http://localhost:11434");
        assert!(result.is_ok(), "http://localhost:11434 should be valid");
        assert_eq!(result.unwrap(), "http://localhost:11434");
    }

    #[test]
    fn valid_127_0_0_1_http() {
        let result = validate_ollama_endpoint("http://127.0.0.1:11434");
        assert!(result.is_ok(), "http://127.0.0.1:11434 should be valid");
        assert_eq!(result.unwrap(), "http://127.0.0.1:11434");
    }

    #[test]
    fn valid_localhost_https() {
        let result = validate_ollama_endpoint("https://localhost:11434");
        assert!(result.is_ok(), "https://localhost:11434 should be valid");
        assert_eq!(result.unwrap(), "https://localhost:11434");
    }

    #[test]
    fn valid_ipv6_loopback() {
        // The url crate returns host_str() as "[::1]" (with brackets) for IPv6.
        // ALLOWED_HOSTS lists both "::1" and "[::1]" to handle this.
        let result = validate_ollama_endpoint("http://[::1]:11434");
        assert!(result.is_ok(), "http://[::1]:11434 (IPv6 loopback) should be valid");
    }

    #[test]
    fn rejected_remote_hostname() {
        let result = validate_ollama_endpoint("http://remote.example.com:11434");
        assert!(result.is_err(), "remote hostname should be rejected");
        let err = result.unwrap_err();
        assert!(err.contains("not allowed"), "error should mention 'not allowed'");
    }

    #[test]
    fn rejected_private_network_ip() {
        let result = validate_ollama_endpoint("http://192.168.1.1:11434");
        assert!(result.is_err(), "private network IP should be rejected");
    }

    #[test]
    fn rejected_ftp_scheme() {
        let result = validate_ollama_endpoint("ftp://localhost:11434");
        assert!(result.is_err(), "ftp scheme should be rejected");
        let err = result.unwrap_err();
        assert!(err.contains("not allowed"), "error should mention 'not allowed'");
    }

    #[test]
    fn rejected_malformed_url() {
        let result = validate_ollama_endpoint("not-a-url");
        assert!(result.is_err(), "malformed URL should be rejected");
    }

    #[test]
    fn rejected_empty_string() {
        let result = validate_ollama_endpoint("");
        assert!(result.is_err(), "empty string should be rejected");
    }

    #[test]
    fn base_url_strips_trailing_slash() {
        // Supplying a trailing slash should still yield a clean base URL.
        let result = validate_ollama_endpoint("http://localhost:11434/");
        assert!(result.is_ok());
        // The reconstructed URL should not end with a slash.
        assert!(!result.unwrap().ends_with('/'));
    }

    #[test]
    fn base_url_without_port() {
        // No port → scheme + host only.
        let result = validate_ollama_endpoint("http://localhost");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "http://localhost");
    }

    #[test]
    fn base_url_strips_path_component() {
        // Users may paste an API-style path, but the validator should normalize to the base URL.
        let result = validate_ollama_endpoint("http://localhost:11434/v1");
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "http://localhost:11434");
    }
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
