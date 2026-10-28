const { parseOrThrow, transactionSchema, transferSchema } = require("../src/utils/validation");

describe("request validation", () => {
  test("rejects a zero transaction amount", () => {
    expect(() => parseOrThrow(transactionSchema, {
      type: "credit", amount: 0, referenceId: "REF-1"
    })).toThrow("Validation failed");
  });

  test("rejects a transfer from an account to itself", () => {
    const id = "507f1f77bcf86cd799439011";
    expect(() => parseOrThrow(transferSchema, {
      fromAccountId: id, toAccountId: id, amount: 10, referenceId: "REF-2"
    })).toThrow("Validation failed");
  });
});
