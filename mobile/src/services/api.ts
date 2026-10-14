const API_BASE_URL = 'http://10.0.2.2:3000/api'; //emulator
//const API_BASE_URL = 'http://192.168.0.113:3000/api'; //device

export type User = {
  id: number;
  displayName: string;
  email: string;
  profilePictureUrl?: string | null;
  createdAt?: string;
  isOnline?: boolean;
  lastSeen?: string | null;
};

type AuthResponse = {
  success: boolean;
  message: string;
  user: User;
  token: string;
};

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      'Cannot connect to the server. Check that the backend is running and the API address is correct.',
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data as T;
}

export type ChatMessage = {
  id: number | string;
  conversationId: number | string;
  senderUserId: number | string;
  senderName: string;
  messageType: 'text' | 'image' | 'file';
  body: string;
  createdAt: string;
  editedAt?: string | null;
};

export type DirectConversationResponse = {
  success: boolean;
  created: boolean;
  conversationId: number | string;
  message: string;
};

export type MessagesResponse = {
  success: boolean;
  messages: ChatMessage[];
};

export type SendMessageResponse = {
  success: boolean;
  message: string;
  data: ChatMessage;
};

export const api = {
  register(displayName: string, email: string, password: string) {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ displayName, email, password }),
    });
  },

  login(email: string, password: string) {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  me(token: string) {
    return request<{ success: boolean; user: User }>('/auth/me', {}, token);
  },

  getUsers: (token: string) =>
    request<{
      success: boolean;
      users: User[];
    }>('/users', {}, token),

  openDirectConversation(otherUserId: number, token: string) {
    return request<DirectConversationResponse>(
      '/conversations/direct',
      {
        method: 'POST',
        body: JSON.stringify({ otherUserId }),
      },
      token,
    );
  },

  getMessages(conversationId: number | string, token: string) {
    return request<MessagesResponse>(`/messages/${conversationId}`, {}, token);
  },

  sendMessage(conversationId: number | string, body: string, token: string) {
    return request<SendMessageResponse>(
      `/messages/${conversationId}`,
      {
        method: 'POST',
        body: JSON.stringify({ body }),
      },
      token,
    );
  },
};
