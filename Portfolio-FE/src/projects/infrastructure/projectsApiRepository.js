import { getJson } from "../../core/http/httpClient";
import { toProjectModel } from "../domain/projectModel";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000").replace(/\/+$/, "");

export const projectsApiRepository = {
  async getAll() {
    const data = await getJson(`${API_BASE_URL}/api/projects`);
    return data.map(toProjectModel);
  }
};
