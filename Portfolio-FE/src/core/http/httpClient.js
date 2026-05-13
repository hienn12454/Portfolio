const DEFAULT_TIMEOUT_MS = 10000;

/**
 * @param {string} url
 * @param {RequestInit & { timeoutMs?: number }} [options]
 */
export async function getJson(url, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(fetchOptions.headers ?? {})
      }
    });

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 401) {
        throw new Error("Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.");
      }

      throw new Error(`HTTP ${response.status} - ${body || "Request failed"}`);
    }

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return await response.text();
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}
