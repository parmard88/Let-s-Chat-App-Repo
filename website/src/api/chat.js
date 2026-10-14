const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

async function request(path, token, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "Cannot connect to the server. Check that the backend is running."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}

export function getUsers(token) {
  return request("/users", token);
}

export function openDirectConversation(otherUserId, token) {
  return request("/conversations/direct", token, {
    method: "POST",
    body: JSON.stringify({ otherUserId }),
  });
}

export function getMessages(conversationId, token) {
  return request(`/messages/${conversationId}`, token);
}

export function sendMessage(conversationId, body, token) {
  return request(`/messages/${conversationId}`, token, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function getConversations(token) {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/conversations`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to load conversations");
  }

  return data.conversations;
}
