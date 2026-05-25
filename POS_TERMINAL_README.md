# Virtual POS Terminal System

A comprehensive virtual Point of Sale (POS) terminal system for PayBot that enables merchants to accept card payments and other payment methods through Maya Business API, PayMongo, and other payment gateways.

## Features

### For Customers/Merchants
- **Request Terminal**: Submit requests for POS terminals with business details
- **Terminal Dashboard**: View and manage assigned terminals
- **Create Orders**: Create payment orders through virtual terminals
- **Payment Processing**: Accept card payments, e-wallets (GCash, GrabPay), and other methods
- **Transaction History**: Track all transactions made through terminals
- **Telegram Integration**: Manage terminals via Telegram bot commands

### For Super Admins
- **Request Management**: Review and approve/reject terminal requests
- **Terminal Assignment**: Assign terminals to approved merchants
- **Terminal Control**: Deactivate or manage active terminals
- **Transaction Monitoring**: View transaction history across all terminals
- **Admin Dashboard**: Central management panel for all operations

## Database Models

### POSTerminal
Represents a virtual POS terminal assigned to a merchant.

```python
- id: int (Primary Key)
- terminal_code: str (Unique)
- terminal_name: str
- user_id: str (Telegram ID of merchant)
- merchant_id: str (Optional merchant account reference)
- status: str (active, inactive, assigned, unassigned)
- is_active: bool
- enabled_payment_methods: JSON (list of payment methods)
- daily_transaction_limit: int (in PHP)
- max_transaction_amount: int (in PHP)
- location: str
- description: str
- assigned_by: str (Telegram ID of admin)
- assigned_at: datetime
- created_at: datetime
- updated_at: datetime
- deactivated_at: datetime
```

### POSTerminalRequest
Represents a customer request for a POS terminal.

```python
- id: int (Primary Key)
- user_id: str (Telegram ID)
- user_name: str
- user_email: str
- user_phone: str
- business_name: str
- business_type: str
- location: str
- description: str
- required_payment_methods: JSON
- monthly_transaction_volume: int
- average_transaction_amount: int
- status: str (pending, approved, rejected)
- rejection_reason: str
- assigned_terminal_id: int
- reviewed_by: str (Admin Telegram ID)
- reviewed_at: datetime
- created_at: datetime
- updated_at: datetime
```

### POSTerminalTransaction
Represents a transaction made through a POS terminal.

```python
- id: int (Primary Key)
- terminal_id: int (Foreign Key)
- user_id: str (Telegram ID)
- order_id: str (Unique)
- description: str
- amount: int (in PHP cents)
- currency: str (default: PHP)
- payment_method: str (card, maya, gcash, grabpay)
- maya_checkout_id: str
- paymongo_checkout_id: str
- xendit_invoice_id: str
- payment_url: str
- customer_name: str
- customer_email: str
- customer_phone: str
- status: str (pending, completed, failed, cancelled)
- failure_reason: str
- created_at: datetime
- completed_at: datetime
- updated_at: datetime
```

## API Endpoints

### Terminal Management

#### Create Terminal (Admin Only)
```
POST /api/v1/pos-terminals/
Authorization: Bearer {token}
Content-Type: application/json

{
  "user_id": "telegram_id",
  "terminal_name": "Main Store Terminal",
  "location": "Manila",
  "description": "Terminal for main store",
  "enabled_payment_methods": ["card", "maya", "gcash", "grabpay"],
  "daily_transaction_limit": 50000,
  "max_transaction_amount": 10000
}

Response:
{
  "success": true,
  "message": "Terminal created successfully",
  "data": {
    "terminal_code": "TERM-ABC123XY",
    "terminal_id": 1
  }
}
```

#### List User Terminals
```
GET /api/v1/pos-terminals/?page=1&per_page=10
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "terminal_code": "TERM-ABC123XY",
      "terminal_name": "Main Store Terminal",
      "status": "active",
      "is_active": true,
      "location": "Manila",
      "enabled_payment_methods": ["card", "maya"]
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 10
}
```

#### Get Terminal Details
```
GET /api/v1/pos-terminals/{terminal_id}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "terminal": {...}
  }
}
```

### Terminal Requests

#### Create Terminal Request
```
POST /api/v1/pos-terminals/requests
Authorization: Bearer {token}
Content-Type: application/json

{
  "business_name": "My Store",
  "business_type": "Retail",
  "location": "Makati",
  "description": "Clothing retail store",
  "required_payment_methods": ["card", "maya"],
  "monthly_transaction_volume": 5000,
  "average_transaction_amount": 2000,
  "user_email": "owner@store.com",
  "user_phone": "+63 9XX XXX XXXX"
}

Response:
{
  "success": true,
  "message": "Terminal request submitted successfully",
  "data": {
    "request_id": 1
  }
}
```

#### List Pending Requests (Admin Only)
```
GET /api/v1/pos-terminals/requests/pending?page=1&per_page=10
Authorization: Bearer {admin_token}

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": "123456",
      "user_name": "John Doe",
      "business_name": "My Store",
      "status": "pending",
      "created_at": "2024-05-25T10:00:00Z"
    }
  ],
  "total": 1
}
```

#### Approve Terminal Request
```
POST /api/v1/pos-terminals/requests/{request_id}/approve
Authorization: Bearer {admin_token}

Response:
{
  "success": true,
  "message": "Terminal request approved",
  "terminal_code": "TERM-ABC123XY"
}
```

#### Reject Terminal Request
```
POST /api/v1/pos-terminals/requests/{request_id}/reject
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "reason": "Business documentation incomplete"
}

Response:
{
  "success": true,
  "message": "Terminal request rejected"
}
```

### Transactions

#### Create Transaction
```
POST /api/v1/pos-terminals/{terminal_id}/transactions
Authorization: Bearer {token}
Content-Type: application/json

{
  "description": "Online Purchase Order #12345",
  "amount": 5000,  # in PHP (not cents)
  "payment_method": "card",  # card, maya, gcash, grabpay
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "+63 9XX XXX XXXX"
}

Response:
{
  "success": true,
  "checkout_url": "https://pg-sandbox.paymaya.com/checkout/...",
  "payment_url": "https://pg-sandbox.paymaya.com/checkout/...",
  "order_id": "order-abc123xyz",
  "message": "Transaction created successfully"
}
```

#### List Terminal Transactions
```
GET /api/v1/pos-terminals/{terminal_id}/transactions?page=1&per_page=10
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "order_id": "order-abc123xyz",
      "description": "Online Purchase",
      "amount": 5000,
      "payment_method": "card",
      "status": "completed",
      "customer_name": "John Doe",
      "created_at": "2024-05-25T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 10
}
```

#### Get Transaction Details
```
GET /api/v1/pos-terminals/transactions/{order_id}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "transaction": {...}
  }
}
```

## Webhook Endpoints

### Maya Business API Webhook
```
POST /api/v1/webhooks/maya/payment-status
X-Maya-Signature: {HMAC-SHA256 signature}
Content-Type: application/json

{
  "id": "checkout-id",
  "requestReferenceNumber": "order-abc123xyz",
  "status": "COMPLETED",
  "totalAmount": {...}
}
```

### PayMongo Webhook
```
POST /api/v1/webhooks/paymongo/payment-status
Content-Type: application/json

{
  "data": {
    "attributes": {
      "checkout_session_id": "checkout-id",
      "status": "paid",
      "reference": "order-abc123xyz"
    }
  }
}
```

## Telegram Bot Commands

### For Customers
- `/request_terminal` - Request a new POS terminal
- `/my_terminals` - View your terminals
- `/terminal_status {terminal_code}` - Get terminal details
- `/transactions {terminal_code}` - View recent transactions

### For Admins
- `/pending_requests` - View pending terminal requests
- `/approve_terminal {request_id}` - Approve a terminal request

## Configuration

Add these environment variables to your `.env` file:

```env
# Maya Business API Configuration
MAYA_BUSINESS_API_KEY=your_api_key
MAYA_BUSINESS_SECRET_KEY=your_secret_key
MAYA_BUSINESS_MODE=sandbox  # or live
MAYA_BUSINESS_BASE_URL=https://api-sandbox.paymaya.com  # optional

# Webhook Configuration
WEBHOOK_MAYA_PAYMENT_STATUS_URL=https://your-domain.com/api/v1/webhooks/maya/payment-status
WEBHOOK_PAYMONGO_PAYMENT_STATUS_URL=https://your-domain.com/api/v1/webhooks/paymongo/payment-status
```

## Usage Examples

### React Frontend - User Dashboard

```typescript
import POSTerminalDashboard from '@/components/POSTerminal';

export default function Dashboard() {
  return <POSTerminalDashboard />;
}
```

### React Frontend - Admin Panel

```typescript
import POSTerminalAdminPanel from '@/components/POSTerminalAdmin';

export default function AdminPanel() {
  return <POSTerminalAdminPanel />;
}
```

### Creating a Transaction Programmatically

```python
from services.pos_terminal import POSTerminalService
from schemas.pos_terminal import POSTerminalTransactionCreate

# Create transaction
service = POSTerminalService(db)
transaction_data = POSTerminalTransactionCreate(
    description="Order #12345",
    amount=5000,  # in PHP
    payment_method="card",
    customer_name="John Doe",
    customer_email="john@example.com"
)

result = await service.create_transaction(
    terminal_id=1,
    user_id="user_123",
    transaction_data=transaction_data
)

# Returns payment URL for customer
checkout_url = result.get("payment_url")
```

## Payment Flow

1. **Customer creates order** → Payment request sent to payment gateway
2. **Payment gateway returns checkout URL** → Customer is redirected to payment page
3. **Customer completes payment** → Payment gateway sends webhook notification
4. **Webhook updates transaction status** → Database reflects payment completion
5. **Transaction marked as completed** → Order fulfillment can proceed

## Security Considerations

1. **Webhook Signature Verification**: All Maya webhooks are verified using HMAC-SHA256
2. **User Authorization**: All endpoints validate user ownership of terminals
3. **Admin Authorization**: Admin-only endpoints require admin role
4. **Rate Limiting**: Recommended to implement rate limiting on transaction endpoints
5. **Payment Method Limits**: Daily and per-transaction limits can be configured per terminal
6. **Data Validation**: All user inputs are validated using Pydantic schemas

## Error Handling

Common error responses:

```json
{
  "success": false,
  "error": "Terminal not found"
}
```

Status codes:
- `400`: Bad request (invalid data)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not found (terminal/request not found)
- `500`: Server error

## Support and Troubleshooting

### Terminal Request Not Appearing
- Check if user has pending approval request (only one allowed at a time)
- Verify business information is complete
- Check admin dashboard for requests

### Payment Not Processing
- Verify terminal is active (`is_active: true`)
- Check payment method is enabled for terminal
- Verify daily transaction limits not exceeded
- Check Maya Business API credentials are correct

### Webhook Not Updating Transactions
- Verify webhook URL is configured correctly
- Check webhook signature verification (Maya)
- Verify request ID matches transaction order_id
- Check database connection and user has permission

## Migration

To apply the POS Terminal database schema:

```bash
cd backend
python -m alembic upgrade head
```

Or manually using the migration file:
```
backend/alembic/versions/001_add_pos_terminals.py
```

## Future Enhancements

- [ ] QR code generation for quick payments
- [ ] Batch payment processing
- [ ] Transaction settlements and reconciliation
- [ ] Multi-currency support
- [ ] Advanced analytics dashboard
- [ ] Recurring/subscription payments
- [ ] Split payments between multiple accounts
