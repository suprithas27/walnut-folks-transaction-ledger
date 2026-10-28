const express = require("express");
const controller = require("../controllers/accountController");

const router = express.Router();

router.post("/", controller.create);
router.get("/", controller.list);
router.get("/:accountId", controller.get);
router.post("/:accountId/transactions", controller.createTransaction);
router.get("/:accountId/transactions", controller.history);

module.exports = router;
