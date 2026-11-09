import { getRuntimeConfig } from "@/shared/api/runtimeConfig"
import { ApiError } from "@/shared/api/ApiError"
import { observeServerDate } from "@/shared/api/serverClock"

interface ErrorEnvelope {
  error?: { code?: string; message?: string }
}

async function readJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) {
    return null
  }
  return (await response.json().catch(() => null)) as T | null
}

export async function api<T>(
  path: string,
  init: RequestInit & { studentId?: string } = {}
): Promise<T> {
  const { studentId, headers, ...rest } = init

  let response: Response
  try {
    response = await fetch(`${getRuntimeConfig().API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(studentId ? { "X-Student-Id": studentId } : {}),
        ...headers,
      },
    })
  } catch {
    throw new ApiError(0, "NETWORK", "network")
  }

  observeServerDate(response)

  if (!response.ok) {
    const body = (await readJson<ErrorEnvelope>(response)) ?? {}
    throw new ApiError(
      response.status,
      body.error?.code ?? "UNKNOWN",
      body.error?.message ?? ""
    )
  }

  if (response.status === 204) {
    return undefined as unknown as T
  }

  return (await response.json()) as T
}
