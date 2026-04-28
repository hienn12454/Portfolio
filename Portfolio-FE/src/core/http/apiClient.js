import { getJson } from "./httpClient";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000").replace(/\/+$/, "");
const CLERK_JWT_TEMPLATE = import.meta.env.VITE_CLERK_JWT_TEMPLATE ?? "portfoliobe-api";

async function createAuthHeaders(getToken) {
  const token = await getToken({ template: CLERK_JWT_TEMPLATE });

  if (!token) {
    throw new Error(
      `Không lấy được JWT template '${CLERK_JWT_TEMPLATE}'. Vui lòng kiểm tra Clerk JWT template và đăng nhập lại.`
    );
  }

  return {
    Authorization: `Bearer ${token}`
  };
}

export function createApiClient(getToken) {
  return {
    getPublic(path) {
      return getJson(`${API_BASE_URL}${path}`);
    },
    postPublic(path, payload = {}) {
      return getJson(`${API_BASE_URL}${path}`, {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    async getProtected(path) {
      const headers = await createAuthHeaders(getToken);
      return getJson(`${API_BASE_URL}${path}`, { headers });
    },
    async putProtected(path, payload) {
      const headers = await createAuthHeaders(getToken);
      return getJson(`${API_BASE_URL}${path}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload)
      });
    },
    async postProtected(path, payload) {
      const headers = await createAuthHeaders(getToken);
      return getJson(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
    },
    async deleteProtected(path) {
      const headers = await createAuthHeaders(getToken);
      return getJson(`${API_BASE_URL}${path}`, {
        method: "DELETE",
        headers
      });
    }
  };
}
