# Assumptions and design decisions

- Account balances are maintained on the account document for fast reads; the immutable transaction collection is the audit ledger.
- Balance changes and ledger creation must succeed or fail together, so MongoDB replica-set transactions are used.
- Reference IDs are globally unique, including transfers.
- Transfer is stored as one ledger event with both account IDs. It appears in either account's history through an `$or` query.
- Transactions cannot be edited or deleted through this API.
- Pagination defaults to page 1 / 20 items and caps page size at 100.
- Transfers require matching currency codes; no foreign-exchange conversion is attempted.
- For production financial accuracy, monetary amounts should use integer minor units or Decimal128 rather than binary floating-point numbers.
