const express = require("express");
const router = express.Router();

// Simple workspace endpoint - can be extended later
router.get("/", (req, res) => {
  res.json({ workspaces: [] });
});

module.exports = router;
