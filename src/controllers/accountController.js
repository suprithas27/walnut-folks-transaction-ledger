const asyncHandler = require("../utils/asyncHandler");
const { parseOrThrow, createAccountSchema, transactionSchema } = require("../utils/validation");
const ledger = require("../services/ledgerService");

exports.create = asyncHandler(async (req, res) => {
  const data = parseOrThrow(createAccountSchema, req.body);
  const account = await ledger.createAccount(data);
  res.status(201).json({ success: true, data: account });
});

exports.list = asyncHandler(async (req, res) => {
  const accounts = await ledger.listAccounts();
  res.json({ success: true, data: accounts });
});

exports.get = asyncHandler(async (req, res) => {
  const account = await ledger.getAccount(req.params.accountId);
  res.json({ success: true, data: account });
});

exports.createTransaction = asyncHandler(async (req, res) => {
  const data = parseOrThrow(transactionSchema, req.body);
  const transaction = await ledger.createTransaction(req.params.accountId, data);
  res.status(201).json({ success: true, data: transaction });
});

exports.history = asyncHandler(async (req, res) => {
  const result = await ledger.getHistory(req.params.accountId, req.query);
  res.json({ success: true, data: result.items, pagination: result.pagination });
});
