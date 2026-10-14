import { useCallback, useEffect, useState } from "react";
import { login, register } from "./api/auth";

import { getUsers, getConversations, openDirectConversation } from "./api/chat";

import "./App.css";
import ChatWindow from "./components/ChatWindow";
import { io } from "socket.io-client";

export default function App() {
  const [isRegister, setIsRegister] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("letschat_user")) || null;
    } catch {
      return null;
    }
  });

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);

  const [selectedChat, setSelectedChat] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [lastSeenByUser, setLastSeenByUser] = useState({});
  const [openingChatId, setOpeningChatId] = useState(null);

  const token = localStorage.getItem("letschat_token");

  const usersWithoutConversations = users.filter(
    (item) =>
      !conversations.some(
        (conversation) => Number(conversation.otherUserId) === Number(item.id)
      )
  );

  const loadUsers = useCallback(async () => {
    if (!token) return;

    setUsersLoading(true);
    setError("");

    try {
      const result = await getUsers(token);
      setUsers(result.users || []);
    } catch (err) {
      setError(err.message || "Could not load users.");
    } finally {
      setUsersLoading(false);
    }
  }, [token]);

  const loadConversations = useCallback(async () => {
    if (!token) return;

    setConversationsLoading(true);

    try {
      const result = await getConversations(token);
      setConversations(result || []);
    } catch (err) {
      setError(err.message || "Could not load conversations.");
    } finally {
      setConversationsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!user || !token) return;

    const socket = io("http://localhost:3000", {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Global conversation updates connected.");
    });

    socket.on("conversation_list_updated", () => {
      loadConversations();
    });

    socket.on("connect_error", (err) => {
      console.error("Global socket connection failed:", err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [user, token, loadConversations]);

  useEffect(() => {
    if (!user || !token) return;

    const socket = io("http://localhost:3000", {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("online_users", (userIds) => {
      setOnlineUsers(userIds.map(Number));
    });

    socket.on("connect", () => {
      socket.emit("get_online_users");
    });

    socket.on("user_status_changed", ({ userId, status, lastSeen }) => {
      const id = Number(userId);

      setOnlineUsers((previousUsers) => {
        if (status === "online") {
          return previousUsers.includes(id)
            ? previousUsers
            : [...previousUsers, id];
        }

        return previousUsers.filter((existingId) => existingId !== id);
      });

      if (status === "offline" && lastSeen) {
        setLastSeenByUser((previous) => ({
          ...previous,
          [id]: lastSeen,
        }));
      }
    });

    socket.on("connect_error", (err) => {
      console.error("Presence socket connection failed:", err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [user, token]);

  useEffect(() => {
    if (user && token) {
      (async () => {
        await loadUsers();
        await loadConversations();
      })();
    }
  }, [user, token, loadUsers, loadConversations]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = isRegister
        ? await register(displayName.trim(), email.trim(), password)
        : await login(email.trim(), password);

      localStorage.setItem("letschat_token", result.token);
      localStorage.setItem("letschat_user", JSON.stringify(result.user));
      setUser(result.user);
      setPassword("");
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenChat(otherUser) {
    if (!token || openingChatId !== null) return;

    setOpeningChatId(otherUser.id);
    setError("");

    try {
      const result = await openDirectConversation(otherUser.id, token);

      setSelectedChat({
        user: otherUser,
        conversationId: result.conversationId,
      });

      await loadConversations();
    } catch (err) {
      setError(err.message || "Could not open conversation.");
    } finally {
      setOpeningChatId(null);
    }
  }

  function handleLogout() {
    localStorage.removeItem("letschat_token");
    localStorage.removeItem("letschat_user");
    setUser(null);
    setUsers([]);
    setConversations([]);
    setSelectedChat(null);
    setPassword("");
    setError("");
  }

  if (!user || !token) {
    return (
      <main className="app-shell">
        <section className="auth-card">
          <div className="brand-mark">LC</div>
          <h1>Let's Chat</h1>
          <p className="subtitle">
            {isRegister
              ? "Create your account and start connecting."
              : "Welcome back! Sign in to continue."}
          </p>

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <div className="form-field">
                <label htmlFor="displayName">Full name</label>
                <input
                  id="displayName"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div className="form-field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
              />
            </div>

            {error && <p className="error-message">{error}</p>}

            <button className="primary-button" disabled={loading}>
              {loading
                ? "Please wait..."
                : isRegister
                ? "Create account"
                : "Sign in"}
            </button>
          </form>

          <p className="switch-mode">
            {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
            >
              {isRegister ? "Sign in" : "Register"}
            </button>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="chat-app">
      <header className="top-bar">
        <div className="brand-mark small-mark">LC</div>
        <div className="top-bar-title">
          <h1>Let's Chat</h1>
          <span>Signed in as {user.displayName}</span>
        </div>
        <button className="logout-button" onClick={handleLogout}>
          Log out
        </button>
      </header>

      {error && (
        <div className="chat-error">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}

      <div className="chat-layout">
        <aside className="users-panel">
          <div className="panel-heading">
            <div>
              <h2>Messages</h2>
              <p>Connect with people</p>
            </div>
            <button
              className="refresh-button"
              onClick={loadUsers}
              disabled={usersLoading}
            >
              Refresh
            </button>
          </div>

          <div className="previous-conversations">
            <h3>Previous conversations</h3>

            {conversationsLoading ? (
              <p className="empty-message">Loading conversations...</p>
            ) : conversations.length === 0 ? (
              <p className="empty-message">No previous conversations yet.</p>
            ) : (
              <div className="user-list">
                {conversations.map((conversation) => {
                  const otherUser = {
                    id: conversation.otherUserId,
                    displayName: conversation.otherUserName || "Unknown user",
                    profilePictureUrl: conversation.profilePictureUrl || "",
                  };

                  return (
                    <div className="user-row" key={conversation.conversationId}>
                      <div className="avatar">
                        {otherUser.displayName.charAt(0).toUpperCase()}
                      </div>

                      <div className="user-info">
                        <div className="user-name-row">
                          <strong>{otherUser.displayName}</strong>

                          {onlineUsers.includes(Number(otherUser.id)) && (
                            <span
                              className="online-status-dot"
                              title="Online"
                              aria-label="Online"
                            />
                          )}
                        </div>

                        <span>
                          {conversation.lastMessage || "No messages yet"}
                        </span>

                        <small>
                          {onlineUsers.includes(
                            Number(conversation.otherUserId)
                          )
                            ? "Online"
                            : (() => {
                                const lastSeen =
                                  lastSeenByUser[
                                    Number(conversation.otherUserId)
                                  ] || conversation.lastSeen;

                                return lastSeen
                                  ? `Last seen: ${new Date(
                                      lastSeen
                                    ).toLocaleString()}`
                                  : "Offline";
                              })()}
                        </small>

                        {conversation.lastMessageAt && (
                          <small>
                            {new Date(
                              conversation.lastMessageAt
                            ).toLocaleString()}
                          </small>
                        )}
                      </div>

                      <button
                        className="chat-button"
                        onClick={() =>
                          setSelectedChat({
                            user: otherUser,
                            conversationId: conversation.conversationId,
                          })
                        }
                      >
                        Open
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {usersLoading ? (
            <p className="empty-message">Loading users...</p>
          ) : usersWithoutConversations.length === 0 ? (
            <p className="empty-message">
              No other users found. Register another account to test chatting.
            </p>
          ) : (
            <div className="user-list">
              {usersWithoutConversations.map((item) => (
                <div className="user-row" key={item.id}>
                  <div className="avatar">
                    {(item.displayName || item.email || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="user-info">
                    <div className="user-name-row">
                      <strong>{item.displayName || item.email}</strong>

                      {onlineUsers.includes(Number(item.id)) && (
                        <span
                          className="online-status-dot"
                          title="Online"
                          aria-label="Online"
                        />
                      )}
                    </div>

                    <span>{item.email}</span>

                    <small>
                      {onlineUsers.includes(Number(item.id))
                        ? "Online"
                        : (() => {
                            const lastSeen =
                              lastSeenByUser[Number(item.id)] || item.lastSeen;

                            return lastSeen
                              ? `Last seen: ${new Date(
                                  lastSeen
                                ).toLocaleString()}`
                              : "Offline";
                          })()}
                    </small>
                  </div>

                  <button
                    className="chat-button"
                    onClick={() => handleOpenChat(item)}
                    disabled={openingChatId !== null}
                  >
                    {openingChatId === item.id ? "Opening..." : "Chat"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>

        <section className="conversation-panel">
          {selectedChat ? (
            <ChatWindow
              key={selectedChat.conversationId}
              conversationId={selectedChat.conversationId}
              currentUser={user}
              otherUser={selectedChat.user}
              token={token}
              onBack={() => setSelectedChat(null)}
              onMessagesUpdated={loadConversations}
            />
          ) : (
            <div className="conversation-placeholder">
              <div className="empty-chat-icon">💬</div>
              <h2>Your conversations</h2>
              <p>Select a user to open a conversation.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
