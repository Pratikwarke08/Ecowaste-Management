
/**
 * Backend-safe fetch helper.
 * - NEVER redirects
 * - NEVER clears auth
 * - Throws ONLY on auth errors so callers can decide what to do
 */
export async function apiFetch(
    url: string,
    options: RequestInit = {}
): Promise<Response> {
    const res = await fetch(url, options);

    // Auth errors should be handled explicitly by the caller
    if (res.status === 401 || res.status === 403) {
        throw new Error("Unauthorized");
    }

    // All other responses (including 404) are returned as-is
    return res;
}
