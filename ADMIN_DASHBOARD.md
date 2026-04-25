# Admin Dashboard Documentation

## Overview

The Admin Dashboard is a dedicated page for **platform administrators** (users with `client_admin` role) to manage all clients in the SaaS system and view platform-wide usage analytics.

## Access

**URL:** `/admin`

**Required Role:** `client_admin`

**Access Point:** Click the "Admin Dashboard" button on the Module Selector page (only visible to client_admin users)

---

## Features

### 1. Platform Overview Stats

Five key metrics displayed at the top:

- **Total Clients** - Total number of organizations registered
- **Active Clients** - Clients with active subscriptions
- **Total Farms** - All farms across all clients
- **Total Users** - All users across all clients
- **Active Animals** - Total animals being managed
- **Monthly Revenue** - Total platform revenue (to be calculated)

### 2. Client Management

#### View Clients

- Comprehensive table showing all clients
- Real-time usage statistics for each client:
  - Number of farms
  - Number of users
  - Number of active animals
  - Treatments in last 30 days

#### Search & Filter

- Search by:
  - Client name
  - Email
  - Company code
  - Subscription plan

#### Add New Client

**Form Fields:**
- **Basic Information:**
  - Organization Name (required)
  - Company Code
  - VAT Code
  
- **Contact Information:**
  - Email (required)
  - Phone
  - Address
  - City

- **Subscription Settings:**
  - Subscription Plan (trial/basic/professional/enterprise)
  - Max Farms allowed
  - Max Users allowed
  - VAT Registered checkbox

**On Creation:**
- Client is automatically set to `active` status
- Subscription starts immediately
- Client receives access to the system

#### View Client Details

Click the eye icon to see:
- Full contact information
- Subscription details
- Current usage stats
- Important dates (created, subscription start/end, next billing)
- Farm and user counts
- Active animals count
- Treatment activity

#### Manage Client Status

- **Toggle Active/Inactive** - Enable or disable client access
- **Delete Client** - Permanently remove client and ALL associated data (requires confirmation)

⚠️ **Warning:** Deleting a client will cascade delete:
- All farms
- All users
- All animals
- All treatments
- All inventory
- All financial records

---

## Client Hierarchy

```
CLIENT (Organization)
├── Subscription Plan (trial/basic/professional/enterprise)
├── Max Farms Limit
├── Max Users Limit
└── Usage Stats
    ├── Active Farms (X / Max Farms)
    ├── Active Users (X / Max Users)
    ├── Active Animals
    └── Monthly Treatment Count
```

---

## Subscription Plans

| Plan         | Base/Farm | Per Animal | Max Farms | Max Users |
|--------------|-----------|------------|-----------|-----------|
| Trial        | €5.00     | €0.25      | 3         | 2         |
| Basic        | -         | -          | -         | -         |
| Professional | €4.00     | €0.18      | 10        | 5         |
| Enterprise   | €2.00     | €0.12      | 999       | 50        |

---

## Security

- Only users with `client_admin` role can access `/admin`
- Access denied page shown for unauthorized users
- All database operations include proper client_id filtering
- Confirmation required for destructive actions (delete)

---

## Usage Example

### Adding a New Veterinary Clinic

1. Click "Add Client" button
2. Fill in form:
   ```
   Organization Name: "Vilnius Veterinary Clinic"
   Company Code: "VET-2026-001"
   Email: "info@vilniusvet.lt"
   Phone: "+370 600 12345"
   Subscription Plan: "Professional"
   Max Farms: 5
   Max Users: 10
   ```
3. Click "Create Client"
4. Client is now active and can be managed

### Monitoring Client Usage

View real-time stats for each client:
- If farms = 5/5 → Client at farm limit
- If users = 10/10 → Client at user limit
- If animals = 500 → Calculate monthly bill: (5 × €4.00) + (500 × €0.18) = €110.00

---

## Future Enhancements

- [ ] Edit client information
- [ ] Billing invoice generation
- [ ] Payment tracking
- [ ] Usage graphs and charts
- [ ] Export client data
- [ ] Email notifications
- [ ] Activity logs
- [ ] Subscription upgrade/downgrade
- [ ] Bulk operations
- [ ] Advanced filtering

---

## Technical Notes

**Database Tables Used:**
- `clients` - Client organizations
- `farms` - Client farms
- `users` - System users
- `animals` - Animal registry
- `treatments` - Treatment records
- `billing_invoices` - Invoices (future)
- `payment_history` - Payments (future)

**Key Functions:**
- `loadClients()` - Fetch all clients
- `loadClientStats()` - Calculate usage for each client
- `loadPlatformStats()` - Calculate platform-wide metrics
- `handleAddClient()` - Create new client
- `handleDeleteClient()` - Delete client and cascade
- `handleToggleActive()` - Enable/disable client

**Client_id Pattern:**
Every query must filter by client_id for data isolation:
```typescript
.eq('client_id', clientId)
```

---

## Support

For issues or questions:
1. Check if user has `client_admin` role
2. Verify Supabase connection
3. Check browser console for errors
4. Review database RLS policies
