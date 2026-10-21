// Tiny wrapper around fetch() that adds the login token and turns errors into
// readable messages. Every call to the Spring Boot API goes through here.

const TOKEN_KEY = 'nestswap_token';

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* private mode: user just stays logged in for this tab */ }
}

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields || {};
  }
}

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (form) {
    payload = form;                       // FormData: browser sets the multipart boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(path, { method, headers, body: payload });
  } catch {
    throw new ApiError('Can’t reach the server. Is the backend running?', 0);
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) setToken(null);   // expired token
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data?.fields);
  }
  return data;
}

/** Build a query string from an object, skipping empty values. */
export function toQuery(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== false) q.set(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}
