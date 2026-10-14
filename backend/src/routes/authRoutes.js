const express = require("express");
const { register, login } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const pool = require("../config/database");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.execute(
      `SELECT id, display_name, email,
              profile_picture_url, created_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    const user = users[0];

    return res.json({
      success: true,
      user: {
        id: user.id,
        displayName: user.display_name,
        email: user.email,
        profilePictureUrl: user.profile_picture_url,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error("Profile lookup failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve profile.",
    });
  }
});

module.exports = router;
