const express = require("express");
const {
  getMessages,
  sendMessage,
} = require("../controllers/messagesController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:conversationId", authMiddleware, getMessages);
router.post("/:conversationId", authMiddleware, sendMessage);

module.exports = router;
