import { getRuntimeConfig } from "@/app/runtimeConfig"

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

async function jsonBody<T = unknown>(res: Response): Promise<T | null> {
  const contentType = res.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) {
    return null
  }
  return (await res.json().catch(() => null)) as T | null
}

export async function api<T>(
  path: string,
  init: RequestInit & { studentId?: string } = {}
): Promise<T> {
  const { studentId, ...rest } = init
  let res: Response
  try {
    res = await fetch(`${getRuntimeConfig().API_BASE_URL}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(studentId ? { "X-Student-Id": studentId } : {}),
        ...rest.headers,
      },
    })
  } catch {
    throw new ApiError(0, "NETWORK", "network")
  }
  if (!res.ok) {
    const body =
      (await jsonBody<{ error?: { code?: string; message?: string } }>(res)) ??
      {}
    throw new ApiError(
      res.status,
      body.error?.code ?? "UNKNOWN",
      body.error?.message ?? ""
    )
  }
  if (res.status === 204) {
    return undefined as unknown as T
  }
  return (await res.json()) as T
}
