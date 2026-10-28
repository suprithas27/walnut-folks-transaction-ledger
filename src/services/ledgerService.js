const mongoose = require("mongoose");
const Account = require("../models/Account");
const Transaction = require("../models/Transaction");

function httpError(statusCode, code, message, details) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  if (details) error.details = details;
  return error;
}

async function createAccount(data) {
  const account = await Account.create({
    name: data.name,
    currency: data.currency.toUpperCase(),
    balance: 0
  });
  return account;
}

async function getAccount(accountId) {
  const account = await Account.findById(accountId);
  if (!account) throw httpError(404, "ACCOUNT_NOT_FOUND", "Account was not found");
  return account;
}

async function listAccounts() {
  return Account.find().sort({ createdAt: -1, _id: -1 });
}

async function createTransaction(accountId, data) {
  const session = await mongoose.startSession();
  let created;
  try {
    await session.withTransaction(async () => {
      const account = await Account.findById(accountId).session(session);
      if (!account) throw httpError(404, "ACCOUNT_NOT_FOUND", "Account was not found");

      if (data.type === "debit" && account.balance < data.amount) {
        throw httpError(409, "INSUFFICIENT_FUNDS", "Account has insufficient funds");
      }

      // Use a conditional atomic update to prevent concurrent debits from
      // driving the balance below zero.
      const filter = { _id: account._id };
      const update = data.type === "credit"
        ? { $inc: { balance: data.amount } }
        : { $inc: { balance: -data.amount }, balance: { $gte: data.amount } };

      let updated;
      if (data.type === "credit") {
        updated = await Account.findOneAndUpdate(filter, update, { new: true, session });
      } else {
        updated = await Account.findOneAndUpdate(
          { ...filter, balance: { $gte: data.amount } },
          { $inc: { balance: -data.amount } },
          { new: true, session }
        );
      }
      if (!updated) throw httpError(409, "INSUFFICIENT_FUNDS", "Account has insufficient funds");

      const [transaction] = await Transaction.create([{
        accountId: account._id,
        type: data.type,
        amount: data.amount,
        referenceId: data.referenceId,
        description: data.description,
        balanceAfter: updated.balance
      }], { session });
      created = transaction;
    });
    return created;
  } catch (error) {
    if (error.code === 11000) {
      throw httpError(409, "DUPLICATE_REFERENCE", "referenceId has already been used");
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

async function transfer(data) {
  const session = await mongoose.startSession();
  let created;
  try {
    await session.withTransaction(async () => {
      const ids = [data.fromAccountId, data.toAccountId];
      const accounts = await Account.find({ _id: { $in: ids } }).session(session);
      const source = accounts.find((a) => a._id.toString() === data.fromAccountId);
      const destination = accounts.find((a) => a._id.toString() === data.toAccountId);
      if (!source || !destination) {
        throw httpError(404, "ACCOUNT_NOT_FOUND", "Source or destination account was not found");
      }
      if (source.currency !== destination.currency) {
        throw httpError(400, "CURRENCY_MISMATCH", "Accounts must use the same currency");
      }
      if (source.balance < data.amount) {
        throw httpError(409, "INSUFFICIENT_FUNDS", "Source account has insufficient funds");
      }

      const debited = await Account.findOneAndUpdate(
        { _id: source._id, balance: { $gte: data.amount } },
        { $inc: { balance: -data.amount } },
        { new: true, session }
      );
      if (!debited) throw httpError(409, "INSUFFICIENT_FUNDS", "Source account has insufficient funds");

      const credited = await Account.findOneAndUpdate(
        { _id: destination._id },
        { $inc: { balance: data.amount } },
        { new: true, session }
      );
      if (!credited) throw httpError(404, "ACCOUNT_NOT_FOUND", "Destination account was not found");

      const [transaction] = await Transaction.create([{
        type: "transfer",
        fromAccountId: source._id,
        toAccountId: destination._id,
        amount: data.amount,
        referenceId: data.referenceId,
        description: data.description,
        fromBalanceAfter: debited.balance,
        toBalanceAfter: credited.balance
      }], { session });
      created = transaction;
    });
    return created;
  } catch (error) {
    if (error.code === 11000) {
      throw httpError(409, "DUPLICATE_REFERENCE", "referenceId has already been used");
    }
    throw error;
  } finally {
    await session.endSession();
  }
}

async function getHistory(accountId, query) {
  await getAccount(accountId);

  const page = Math.max(1, Number.parseInt(query.page || "1", 10));
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit || "20", 10)));
  const filter = {
    $or: [
      { accountId: accountId },
      { fromAccountId: accountId },
      { toAccountId: accountId }
    ]
  };

  if (query.type) {
    if (!["credit", "debit", "transfer"].includes(query.type)) {
      throw httpError(400, "INVALID_FILTER", "type must be credit, debit, or transfer");
    }
    filter.type = query.type;
  }
  if (query.referenceId) filter.referenceId = query.referenceId;

  const dateFilter = {};
  if (query.from) {
    const from = new Date(query.from);
    if (Number.isNaN(from.getTime())) throw httpError(400, "INVALID_DATE", "from must be a valid date");
    dateFilter.$gte = from;
  }
  if (query.to) {
    const to = new Date(query.to);
    if (Number.isNaN(to.getTime())) throw httpError(400, "INVALID_DATE", "to must be a valid date");
    dateFilter.$lte = to;
  }
  if (Object.keys(dateFilter).length) filter.createdAt = dateFilter;

  const [items, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Transaction.countDocuments(filter)
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1
    }
  };
}

module.exports = { createAccount, getAccount, listAccounts, createTransaction, transfer, getHistory };
