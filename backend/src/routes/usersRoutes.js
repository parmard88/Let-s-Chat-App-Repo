const express = require("express");
const { getUsers } = require("../controllers/usersController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, getUsers);

module.exports = router;
