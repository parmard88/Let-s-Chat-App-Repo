const express = require("express");

const {
  openDirectConversation,
  getConversations,
} = require("../controllers/conversationsController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, getConversations);
router.post("/direct", authMiddleware, openDirectConversation);

module.exports = router;
