const pool = require("../config/database");

const openDirectConversation = async (req, res, next) => {
  const currentUserId = Number(req.user.id);
  const otherUserId = Number(req.body.otherUserId);

  if (
    !Number.isSafeInteger(otherUserId) ||
    otherUserId <= 0 ||
    otherUserId === currentUserId
  ) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid other user ID.",
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Make sure the other user exists.
    const [otherUsers] = await connection.execute(
      "SELECT id FROM users WHERE id = ?",
      [otherUserId]
    );

    if (otherUsers.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Check whether a direct conversation already exists
    // with exactly these two members.
    const [existing] = await connection.execute(
      `SELECT c.id
       FROM conversations c
       INNER JOIN conversation_members cm
         ON cm.conversation_id = c.id
       WHERE c.type = 'direct'
         AND cm.user_id IN (?, ?)
       GROUP BY c.id
       HAVING COUNT(DISTINCT cm.user_id) = 2
          AND (
            SELECT COUNT(*)
            FROM conversation_members cm2
            WHERE cm2.conversation_id = c.id
          ) = 2
       LIMIT 1`,
      [currentUserId, otherUserId]
    );

    if (existing.length > 0) {
      await connection.commit();

      return res.status(200).json({
        success: true,
        created: false,
        conversationId: existing[0].id,
        message: "Conversation opened successfully.",
      });
    }

    // Create a new direct conversation.
    const [conversationResult] = await connection.execute(
      `INSERT INTO conversations (type, created_by)
       VALUES ('direct', ?)`,
      [currentUserId]
    );

    const conversationId = conversationResult.insertId;

    // Add both participants.
    await connection.execute(
      `INSERT INTO conversation_members
         (conversation_id, user_id, role)
       VALUES (?, ?, 'admin'), (?, ?, 'member')`,
      [conversationId, currentUserId, conversationId, otherUserId]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      created: true,
      conversationId,
      message: "Conversation created successfully.",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }

    return next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const getConversations = async (req, res, next) => {
  const currentUserId = Number(req.user.id);

  try {
    const [conversations] = await pool.execute(
      `SELECT
         c.id AS conversationId,
         c.type,
         c.group_name AS groupName,
         c.created_at AS createdAt,
        other_user.id AS otherUserId,
        other_user.display_name AS otherUserName,
        other_user.profile_picture_url AS profilePictureUrl,
        other_user.is_online AS isOnline,
        other_user.last_seen AS lastSeen,
         latest.body AS lastMessage,
         latest.created_at AS lastMessageAt
       FROM conversations c
       INNER JOIN conversation_members mine
         ON mine.conversation_id = c.id
        AND mine.user_id = ?
       LEFT JOIN conversation_members other_member
         ON c.type = 'direct'
        AND other_member.conversation_id = c.id
        AND other_member.user_id <> mine.user_id
       LEFT JOIN users other_user
         ON other_user.id = other_member.user_id
       LEFT JOIN messages latest
         ON latest.id = (
           SELECT m.id
           FROM messages m
           WHERE m.conversation_id = c.id
             AND m.deleted_at IS NULL
           ORDER BY m.created_at DESC, m.id DESC
           LIMIT 1
         )
       ORDER BY
         COALESCE(latest.created_at, c.created_at) DESC,
         c.id DESC`,
      [currentUserId]
    );

    return res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  openDirectConversation,
  getConversations,
};
