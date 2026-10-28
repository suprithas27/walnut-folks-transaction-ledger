const { z } = require("zod");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Must be a valid MongoDB ObjectId");
const positiveAmount = z.number().finite().positive().max(1_000_000_000);
const referenceId = z.string().trim().min(1).max(120);
const description = z.string().trim().max(500).optional().default("");

const createAccountSchema = z.object({
  name: z.string().trim().min(2).max(100),
  currency: z.string().trim().length(3).optional().default("INR")
}).strict();

const transactionSchema = z.object({
  type: z.enum(["credit", "debit"]),
  amount: positiveAmount,
  referenceId,
  description
}).strict();

const transferSchema = z.object({
  fromAccountId: objectId,
  toAccountId: objectId,
  amount: positiveAmount,
  referenceId,
  description
}).strict().refine((data) => data.fromAccountId !== data.toAccountId, {
  message: "Source and destination accounts must be different",
  path: ["toAccountId"]
});

function parseOrThrow(schema, value) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    const error = new Error("Validation failed");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    error.details = parsed.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message
    }));
    throw error;
  }
  return parsed.data;
}

module.exports = {
  objectId,
  createAccountSchema,
  transactionSchema,
  transferSchema,
  parseOrThrow
};
