import { useCallback, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { getMessages, sendMessage } from "../api/chat";
import "./ChatWindow.css";

const SOCKET_URL = "http://localhost:3000";

function getMessageId(message) {
  return String(message.id);
}

function mergeMessages(existing, incoming) {
  const unique = new Map();

  [...existing, ...incoming].forEach((message) => {
    unique.set(getMessageId(message), message);
  });

  return [...unique.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

function formatTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatWindow({
  conversationId,
  currentUser,
  otherUser,
  token,
  onBack,
  onMessagesUpdated,
}) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("connecting");

  const loadMessages = useCallback(
    async (clearMessages = false) => {
      if (clearMessages) {
        setMessages([]);
      }
      setLoading(true);
      setError("");

      try {
        const result = await getMessages(conversationId, token);
        setMessages((current) => mergeMessages(current, result.messages || []));
      } catch (err) {
        setError(err.message || "Could not load messages.");
      } finally {
        setLoading(false);
      }
    },
    [conversationId, token]
  );

  useEffect(() => {
    const initializeMessages = async () => {
      await loadMessages(true);
    };
    initializeMessages();
  }, [loadMessages]);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      setConnectionStatus("connected");
      socket.emit("join_conversation", conversationId);
    });

    socket.on("disconnect", () => {
      setConnectionStatus("disconnected");
    });

    socket.on("connect_error", () => {
      setConnectionStatus("disconnected");
    });

    socket.on("new_message", (message) => {
      setMessages((current) => mergeMessages(current, [message]));
      onMessagesUpdated?.();
    });

    socket.on("chat_error", (data) => {
      setError(data.message || "A chat error occurred.");
    });

    return () => {
      socket.disconnect();
    };
  }, [conversationId, token, onMessagesUpdated]);

  async function handleSubmit(event) {
    event.preventDefault();

    const body = draft.trim();

    if (!body || sending) return;

    setSending(true);
    setError("");

    try {
      const result = await sendMessage(conversationId, body, token);

      setMessages((current) => mergeMessages(current, [result.data]));

      setDraft("");
      onMessagesUpdated?.();
    } catch (err) {
      setError(err.message || "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="chat-window">
      <header className="chat-header">
        {onBack && (
          <button
            className="back-button"
            onClick={onBack}
            aria-label="Back to users"
          >
            ←
          </button>
        )}

        <div className="chat-avatar">
          {(otherUser.displayName || otherUser.email || "?")
            .charAt(0)
            .toUpperCase()}
        </div>

        <div className="chat-header-info">
          <strong>{otherUser.displayName || otherUser.email}</strong>
          <span>
            {connectionStatus === "connected"
              ? "Real-time connection active"
              : "Connecting to chat..."}
          </span>
        </div>
      </header>

      {error && (
        <div className="message-error">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}

      <div className="messages-area">
        {loading && messages.length === 0 ? (
          <p className="chat-info">Loading messages...</p>
        ) : messages.length === 0 ? (
          <div className="chat-info">
            <strong>No messages yet</strong>
            <span>Send a message to start the conversation.</span>
          </div>
        ) : (
          messages.map((message) => {
            const isMine =
              String(message.senderUserId) === String(currentUser.id);

            return (
              <div
                key={getMessageId(message)}
                className={`message-row ${isMine ? "mine" : "theirs"}`}
              >
                <div className="message-bubble">
                  {!isMine && (
                    <span className="message-sender">
                      {message.senderName || otherUser.displayName}
                    </span>
                  )}

                  <p>{message.body}</p>

                  <time>{formatTime(message.createdAt)}</time>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form className="message-composer" onSubmit={handleSubmit}>
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type a message..."
          maxLength={5000}
          aria-label="Message"
        />

        <button type="submit" disabled={!draft.trim() || sending}>
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
}
