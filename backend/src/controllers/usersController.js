const pool = require("../config/database");

const getUsers = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;

    const [users] = await pool.execute(
      `SELECT
         id,
         display_name AS displayName,
         email,
         profile_picture_url AS profilePictureUrl,
         is_online AS isOnline,
         last_seen AS lastSeen
       FROM users
       WHERE id != ?
       ORDER BY display_name ASC`,
      [currentUserId]
    );

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers };
