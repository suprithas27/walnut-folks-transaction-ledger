const express = require("express");
const controller = require("../controllers/transferController");

const router = express.Router();
router.post("/", controller.create);

module.exports = router;
