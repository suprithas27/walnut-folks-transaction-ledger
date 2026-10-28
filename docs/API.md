# API Reference

Base URL: `http://localhost:4000`

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/accounts` | Create account |
| GET | `/api/accounts` | List accounts |
| GET | `/api/accounts/:accountId` | Get account |
| POST | `/api/accounts/:accountId/transactions` | Credit/debit |
| GET | `/api/accounts/:accountId/transactions` | History + filters + pagination |
| POST | `/api/transfers` | Bonus atomic transfer |

## History query examples
- `?page=2&limit=10`
- `?type=debit`
- `?referenceId=ORDER-12`
- `?from=2026-10-01T00:00:00.000Z&to=2026-10-31T23:59:59.999Z`

## Error format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [{ "field": "amount", "message": "Number must be greater than 0" }]
  }
}
```
