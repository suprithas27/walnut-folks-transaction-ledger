const asyncHandler = require("../utils/asyncHandler");
const { parseOrThrow, transferSchema } = require("../utils/validation");
const ledger = require("../services/ledgerService");

exports.create = asyncHandler(async (req, res) => {
  const data = parseOrThrow(transferSchema, req.body);
  const transaction = await ledger.transfer(data);
  res.status(201).json({ success: true, data: transaction });
});
