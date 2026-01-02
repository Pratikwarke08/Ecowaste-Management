export const API_BASE =
  import.meta.env.PROD
    ? `${import.meta.env.VITE_API_URL}/api`
    : "/api";


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
