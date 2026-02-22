const express = require("express");
const router = express.Router();

// Simple packages endpoint - can be extended later
router.get("/", (req, res) => {
  res.json({ packages: [] });
});

module.exports = router;
