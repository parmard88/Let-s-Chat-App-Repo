const pool = require("../config/database");

const getMessages = async (req, res, next) => {
  try {
    const conversationId = Number(req.params.conversationId);
    const currentUserId = Number(req.user.id);

    if (!Number.isSafeInteger(conversationId) || conversationId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID.",
      });
    }

    // Confirm that the logged-in user belongs to this conversation.
    const [membership] = await pool.execute(
      `SELECT 1
       FROM conversation_members
       WHERE conversation_id = ? AND user_id = ?
       LIMIT 1`,
      [conversationId, currentUserId]
    );

    if (membership.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this conversation.",
      });
    }

    const [messages] = await pool.execute(
      `SELECT
         m.id,
         m.conversation_id AS conversationId,
         m.sender_user_id AS senderUserId,
         u.display_name AS senderName,
         m.message_type AS messageType,
         m.body,
         m.created_at AS createdAt,
         m.edited_at AS editedAt
       FROM messages m
       INNER JOIN users u ON u.id = m.sender_user_id
       WHERE m.conversation_id = ?
         AND m.deleted_at IS NULL
       ORDER BY m.created_at ASC, m.id ASC
       LIMIT 200`,
      [conversationId]
    );

    return res.status(200).json({
      success: true,
      messages,
    });
  } catch (error) {
    return next(error);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const conversationId = Number(req.params.conversationId);
    const currentUserId = Number(req.user.id);
    const body = typeof req.body.body === "string" ? req.body.body.trim() : "";

    if (!Number.isSafeInteger(conversationId) || conversationId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid conversation ID.",
      });
    }

    if (!body || body.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Message must contain 1 to 5000 characters.",
      });
    }

    // Only conversation members may send messages.
    const [membership] = await pool.execute(
      `SELECT 1
       FROM conversation_members
       WHERE conversation_id = ? AND user_id = ?
       LIMIT 1`,
      [conversationId, currentUserId]
    );

    if (membership.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this conversation.",
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO messages
         (conversation_id, sender_user_id, message_type, body)
       VALUES (?, ?, 'text', ?)`,
      [conversationId, currentUserId, body]
    );

    const [rows] = await pool.execute(
      `SELECT
         m.id,
         m.conversation_id AS conversationId,
         m.sender_user_id AS senderUserId,
         u.display_name AS senderName,
         m.message_type AS messageType,
         m.body,
         m.created_at AS createdAt,
         m.edited_at AS editedAt
       FROM messages m
       INNER JOIN users u ON u.id = m.sender_user_id
       WHERE m.id = ?`,
      [result.insertId]
    );
    const io = req.app.get("io");

    // Deliver the message to sockets viewing this conversation.
    io.to(`conversation:${conversationId}`).emit("new_message", rows[0]);

    // Notify every member so their conversation list can update,
    // even when they are viewing a different conversation.
    const [conversationMembers] = await pool.execute(
      `SELECT user_id
   FROM conversation_members
   WHERE conversation_id = ?`,
      [conversationId]
    );

    for (const member of conversationMembers) {
      io.to(`user:${member.user_id}`).emit("conversation_list_updated", {
        conversationId,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Message sent successfully.",
      data: rows[0],
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getMessages, sendMessage };
