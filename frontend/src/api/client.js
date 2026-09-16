const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor({ code, message, fields, status }) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.fields = fields;
    this.status = status;
  }
}

async function request(path, { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError({
      code: "NETWORK_ERROR",
      message: "Could not reach the server. Check your connection and try again.",
      status: null,
    });
  }

  if (response.status === 204) {
    return null;
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // no/invalid JSON body
  }

  if (!response.ok) {
    const error = data?.error;
    throw new ApiError({
      code: error?.code ?? "UNKNOWN_ERROR",
      message: error?.message ?? "Something went wrong.",
      fields: error?.fields,
      status: response.status,
    });
  }

  return data;
}

export const client = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  delete: (path) => request(path, { method: "DELETE" }),
};
