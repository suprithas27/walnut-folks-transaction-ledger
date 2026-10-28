# Walnut Folks — Transaction Ledger API

A REST API for creating accounts, recording credits/debits, reading transaction history, and (bonus) transferring funds between accounts.

## Stack
- Node.js 18+
- Express
- MongoDB + Mongoose
- Zod request validation
- Jest + Supertest + mongodb-memory-server (test dependencies)

## Requirements covered
- Create and retrieve accounts; initial balance is always zero.
- Credit/debit transactions with positive finite amounts.
- Reject debits when the account has insufficient funds.
- Atomic balance update and ledger insert using MongoDB transactions.
- Globally unique `referenceId` to prevent duplicate transaction requests.
- Immutable ledger design: there are no update/delete transaction endpoints.
- History filter by type, reference ID, date range, pagination, newest first.
- Consistent JSON error structure.
- Bonus atomic transfer between two accounts; one unique ledger record represents the transfer.
- Transfer rejects same account, different currencies, missing accounts, insufficient funds, and duplicate references.

## Important implementation note
MongoDB multi-document transactions require a replica set. Do not use a standalone MongoDB server for this project. The provided Docker Compose config starts a single-node replica set.

## Run locally
1. Install Node.js 18 or later and Docker.
2. Copy `.env.example` to `.env`.
3. Start MongoDB:
   ```bash
   docker compose up -d
   ```
4. Initiate the replica set once (wait until MongoDB is ready):
   ```bash
   docker exec -it walnut-ledger-mongo mongosh --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})'
   ```
   If it says the replica set is already initialized, continue.
5. Install dependencies and start:
   ```bash
   npm install
   npm run dev
   ```
6. Health check: `GET http://localhost:4000/health`

## API documentation

All responses are JSON. Successful response envelope:
```json
{ "success": true, "data": {} }
```
Error response envelope:
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Account has insufficient funds"
  }
}
```

### 1. Create account
`POST /api/accounts`

Request:
```json
{ "name": "Supritha", "currency": "INR" }
```
`currency` is optional and defaults to `INR`. Balance is set to zero by the server.

### 2. List accounts
`GET /api/accounts`

### 3. Get account
`GET /api/accounts/:accountId`

### 4. Credit or debit
`POST /api/accounts/:accountId/transactions`

Credit request:
```json
{
  "type": "credit",
  "amount": 1500,
  "referenceId": "PAY-10001",
  "description": "Initial deposit"
}
```
Debit request:
```json
{
  "type": "debit",
  "amount": 250,
  "referenceId": "PAY-10002",
  "description": "Purchase"
}
```
`amount` must be greater than zero. `referenceId` must be unique across all ledger records. Duplicate reference returns `409 DUPLICATE_REFERENCE`.

### 5. Transaction history
`GET /api/accounts/:accountId/transactions`

Supported query parameters:
- `type=credit|debit|transfer`
- `referenceId=PAY-10001`
- `from=2026-10-01T00:00:00.000Z`
- `to=2026-10-31T23:59:59.999Z`
- `page=1` (default 1)
- `limit=20` (default 20, maximum 100)

Example:
`GET /api/accounts/ACCOUNT_ID/transactions?type=credit&page=1&limit=10`

History is sorted newest first. Transfer records appear in both source and destination account histories.

### 6. Bonus: transfer
`POST /api/transfers`

Request:
```json
{
  "fromAccountId": "SOURCE_ACCOUNT_ID",
  "toAccountId": "DESTINATION_ACCOUNT_ID",
  "amount": 100,
  "referenceId": "TRANSFER-9001",
  "description": "Payback"
}
```
The transfer debits and credits inside one MongoDB transaction. If any operation fails, both balance changes and the ledger write roll back.

## Common status/error codes
- `400 VALIDATION_ERROR` — invalid body or amount
- `400 INVALID_DATE` / `INVALID_FILTER` — invalid history filter
- `404 ACCOUNT_NOT_FOUND` — account does not exist
- `404 ROUTE_NOT_FOUND` — endpoint does not exist
- `409 INSUFFICIENT_FUNDS` — debit/transfer would overdraw
- `409 DUPLICATE_REFERENCE` — reference already used
- `400 CURRENCY_MISMATCH` — transfer between different currencies
- `500 INTERNAL_SERVER_ERROR` — unexpected server error

## Assumptions
1. Each account begins at zero; no opening balance is accepted from the client.
2. Currency is an ISO-style three-letter code, defaults to INR, and is not converted.
3. Amounts are positive JavaScript numbers. For a production financial system, represent money as integer minor units (paise/cents) or Decimal128 to avoid floating-point rounding.
4. Each request must provide a globally unique reference ID. A repeated reference is treated as a duplicate, not an idempotent replay.
5. Ledger records are append-only at the API level; no edit/delete endpoints exist.
6. A transfer is represented as one immutable record with source and destination account IDs and balance snapshots.
7. Authentication/authorization, rate limiting, and external payment integrations are outside the stated assignment scope.
8. MongoDB replica-set transactions are required for atomic balance + ledger operations.

## Suggested manual test sequence
1. Create two accounts.
2. Credit the first account with 500.
3. Debit 100 from the first account.
4. Attempt to debit 999; expect 409 and unchanged balance.
5. Repeat a used reference ID; expect 409.
6. Transfer 50 from first to second; verify balances 350 and 50.
7. Query both account histories and verify newest-first ordering and pagination.
