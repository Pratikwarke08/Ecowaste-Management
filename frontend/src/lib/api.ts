function normalizeBase(input?: string) {
  const fallback =
    window.location.hostname === "localhost"
      ? "http://localhost:3000/api"
      : "http://10.15.78.33:3000/api";

  if (!input || !String(input).trim()) return fallback;
  let base = String(input).trim();
  if (!/^https?:\/\//i.test(base)) {
    base = `http://${base}`;
  }
  try {
    const url = new URL(base);
    let href = url.href;
    if (href.endsWith('/')) href = href.replace(/\/+$/, '');
    return href;
  } catch {
    return fallback;
  }
}

// export const API_BASE = normalizeBase(import.meta.env.VITE_API_BASE);
export const API_BASE = "/api";


export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiFetch(path: string, options: ApiOptions = {}) {
  const token = localStorage.getItem("token");
  const headers = new Headers(options.headers || {});

  if (!options.skipAuth) {
    if (!token) {
      throw new Error("Unauthorized");
    }
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMessage = response.statusText || "Request failed";
    try {
      const errorBody = await response.json();
      if (errorBody?.error) {
        errorMessage = errorBody.error;
      }
    } catch {
      // ignore json parse errors
    }
    throw new ApiError(errorMessage, response.status);
  }

  return response;
}


