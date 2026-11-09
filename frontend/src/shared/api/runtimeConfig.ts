export interface RuntimeConfig {
  readonly API_BASE_URL: string
}

const defaultConfig: RuntimeConfig = { API_BASE_URL: "http://localhost:8080" }

export function getRuntimeConfig(): RuntimeConfig {
  if (typeof window === "undefined") {
    return defaultConfig
  }

  const config = (window as typeof window & { __CONFIG__?: RuntimeConfig })
    .__CONFIG__
  return config ?? defaultConfig
}
