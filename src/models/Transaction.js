const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    // Credit/debit use accountId. A transfer is one immutable ledger record
    // referencing both accounts, so a single referenceId remains globally unique.
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    fromAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    toAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    type: { type: String, enum: ["credit", "debit", "transfer"], required: true },
    amount: { type: Number, required: true, min: 0.01 },
    referenceId: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    // Snapshot balance after the transaction for credit/debit. For transfers,
    // these hold the post-transfer balances of source and destination.
    balanceAfter: { type: Number, min: 0 },
    fromBalanceAfter: { type: Number, min: 0 },
    toBalanceAfter: { type: Number, min: 0 }
  },
  { timestamps: true, versionKey: false, strict: "throw" }
);

transactionSchema.index({ referenceId: 1 }, { unique: true });
transactionSchema.index({ accountId: 1, createdAt: -1 });
transactionSchema.index({ fromAccountId: 1, createdAt: -1 });
transactionSchema.index({ toAccountId: 1, createdAt: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
