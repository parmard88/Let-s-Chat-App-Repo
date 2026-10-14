require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const mysql = require("mysql2/promise");
const { Server } = require("socket.io");
const authRoutes = require("./src/routes/authRoutes");
const usersRoutes = require("./src/routes/usersRoutes");
const conversationsRoutes = require("./src/routes/conversationsRoutes");
const messagesRoutes = require("./src/routes/messagesRoutes");
const jwt = require("jsonwebtoken");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be configured with a strong secret.");
}

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
app.set("io", io);
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (typeof token !== "string" || !token.trim()) {
    return next(new Error("Authentication token is required."));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload.sub || !Number.isSafeInteger(Number(payload.sub))) {
      return next(new Error("Invalid authentication token."));
    }

    socket.data.userId = Number(payload.sub);
    next();
  } catch {
    next(new Error("Invalid or expired authentication token."));
  }
});

const pool = require("./src/config/database");

// Tracks active Socket.IO connections for each user.
// A user can have multiple tabs or devices connected.
const onlineUsers = new Map();

app.use(cors());
app.use(express.json({ limit: "20kb" }));

app.get("/", (req, res) => {
  res.json({
    app: "Let's Chat",
    status: "running",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Let's Chat API is working",
  });
});

app.get("/api/health/db", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT DATABASE() AS database_name, 1 AS connected"
    );

    res.json({
      success: true,
      message: "MySQL connection successful",
      database: rows[0].database_name,
    });
  } catch (error) {
    console.error("Database health check failed:", error.message);

    res.status(500).json({
      success: false,
      message: "Could not connect to the database.",
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/conversations", conversationsRoutes);
app.use("/api/messages", messagesRoutes);

io.on("connection", async (socket) => {
  const userId = socket.data.userId;

  const currentConnections = onlineUsers.get(userId) || new Set();
  const wasOffline = currentConnections.size === 0;

  currentConnections.add(socket.id);
  onlineUsers.set(userId, currentConnections);

  if (wasOffline) {
    try {
      await pool.execute("UPDATE users SET is_online = 1 WHERE id = ?", [
        userId,
      ]);

      io.emit("user_status_changed", {
        userId,
        status: "online",
      });
    } catch (error) {
      console.error("Failed to update user online status:", error);
    }
  }

  // Personal room for notifications across all conversations.
  socket.join(`user:${userId}`);

  console.log(`Authenticated client connected: ${socket.id}`);

  // Send the current list of online users to this client.
  socket.on("get_online_users", () => {
    const userIds = Array.from(onlineUsers.keys());
    socket.emit("online_users", userIds);
  });

  socket.on("join_conversation", async (conversationIdValue) => {
    try {
      const conversationId = Number(conversationIdValue);

      if (!Number.isSafeInteger(conversationId) || conversationId <= 0) {
        socket.emit("chat_error", {
          message: "Invalid conversation ID.",
        });
        return;
      }

      // Only conversation members can join its socket room.
      const [members] = await pool.execute(
        `SELECT 1
         FROM conversation_members
         WHERE conversation_id = ? AND user_id = ?
         LIMIT 1`,
        [conversationId, userId]
      );

      if (members.length === 0) {
        socket.emit("chat_error", {
          message: "You do not have access to this conversation.",
        });
        return;
      }

      await socket.join(`conversation:${conversationId}`);

      socket.emit("conversation_joined", {
        conversationId,
      });
    } catch (error) {
      console.error("Failed to join conversation:", error.message);
      socket.emit("chat_error", {
        message: "Could not join the conversation.",
      });
    }
  });

  socket.on("disconnect", async () => {
    const currentConnections = onlineUsers.get(userId);

    if (currentConnections) {
      currentConnections.delete(socket.id);

      // Mark the user offline only when their final connection closes.
      if (currentConnections.size === 0) {
        onlineUsers.delete(userId);

        try {
          await pool.execute(
            `UPDATE users
           SET is_online = 0, last_seen = NOW()
           WHERE id = ?`,
            [userId]
          );

          const [rows] = await pool.execute(
            "SELECT last_seen AS lastSeen FROM users WHERE id = ?",
            [userId]
          );

          io.emit("user_status_changed", {
            userId,
            status: "offline",
            lastSeen: rows[0]?.lastSeen ?? null,
          });
        } catch (error) {
          console.error("Failed to update user offline status:", error);

          // Still notify clients that the user disconnected.
          io.emit("user_status_changed", {
            userId,
            status: "offline",
          });
        }
      }
    }

    console.log(`Client disconnected: ${socket.id}`);
  });
});

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body.",
    });
  }

  console.error("Unhandled request error:", err.message);

  return res.status(500).json({
    success: false,
    message: "An unexpected server error occurred.",
  });
});

const PORT = Number(process.env.PORT || 3000);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Let's Chat backend running on port ${PORT}`);
});

async function shutdown() {
  server.close(async () => {
    try {
      await pool.end();
    } finally {
      process.exit(0);
    }
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
