import { getJson } from "./httpClient";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000").replace(/\/+$/, "");

async function createAuthHeaders(getToken) {
  const token = await getToken();
  if (!token) {
    throw new Error("Missing Clerk token.");
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
