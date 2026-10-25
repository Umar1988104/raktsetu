import { auth } from "./firebase";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function request(path, { method = "GET", body, text = false } = {}) {
  const user = auth.currentUser;
  const headers = { "Content-Type": "application/json" };

  if (user) {
    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (text && res.ok) return res.text(); // e.g. CSV downloads

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data.code;
    throw err;
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  getText: (path) => request(path, { text: true }),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  del: (path) => request(path, { method: "DELETE" }),
};
