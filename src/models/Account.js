const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    currency: { type: String, required: true, uppercase: true, trim: true, default: "INR", minlength: 3, maxlength: 3 },
    balance: { type: Number, required: true, default: 0, min: 0 }
  },
  { timestamps: true, versionKey: false }
);

accountSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Account", accountSchema);
