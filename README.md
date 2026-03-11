# RVAC Veterinarija Interface

**Respublikinis veterinarijos aprūpinimo centras**  
Veterinary Management System for 60+ Farms

![RVAC Logo](https://rvac.lt/s/img/wp-content/uploads/RVAC_logo.png)

---

## 🎯 Overview

RVAC Veterinarija Interface is a comprehensive veterinary management system designed to serve multiple farms (60+) with complete treatment tracking, inventory management, and regulatory compliance.

### Key Features:
- 🏥 **Veterinary Module** - Complete animal health management
- 💰 **Expenses Module** - Financial tracking and invoice management
- 🔄 **Synchronizations** - Breeding protocol management
- 📊 **Regulatory Reports** - Lithuanian veterinary law compliance
- 📦 **FIFO Inventory** - Automatic batch management

---

## 🏗️ System Architecture

### Technology Stack:
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** TailwindCSS
- **Database:** Supabase (PostgreSQL)
- **Real-time:** Supabase subscriptions
- **Authentication:** Supabase Auth with custom permissions

### Modules:
1. **Veterinarija** (Veterinary)
   - Animal registry
   - Treatment records
   - Stock management (medicines, vaccines, supplies)
   - Vaccinations
   - Visits scheduling
   - Synchronization protocols (breeding)
   - Insemination tracking
   - Hoof health
   - Biocide usage
   - Medical waste tracking
   - Regulatory reports

2. **Išlaidos** (Expenses)
   - Invoice management
   - Supplier tracking
   - Financial reporting

---

## 🚀 Getting Started

### Prerequisites:
- Node.js 18+
- npm or yarn
- Supabase account

### Installation:

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

### Environment Variables:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 📁 Project Structure

```
RVAC_VETERINARIJA_INTERFACE/
├── src/
│   ├── components/          # React components
│   │   ├── Dashboard.tsx
│   │   ├── Inventory.tsx
│   │   ├── AnimalsCompact.tsx
│   │   ├── Synchronizations.tsx
│   │   ├── InvoiceViewer.tsx
│   │   └── ...
│   ├── contexts/            # React contexts
│   │   ├── AuthContext.tsx
│   │   └── RealtimeContext.tsx
│   ├── lib/                 # Utilities
│   │   ├── supabase.ts
│   │   ├── types.ts
│   │   ├── helpers.ts
│   │   └── formatters.ts
│   └── main.tsx
├── supabase/
│   └── migrations/          # Database migrations
├── index.html
├── package.json
└── vite.config.ts
```

---

## 🗄️ Database Schema

### Core Tables:
- `animals` - Animal registry
- `treatments` - Treatment records
- `usage_items` - Medicine usage (FIFO tracking)
- `vaccinations` - Vaccination records
- `animal_visits` - Visit scheduling
- `products` - Product catalog
- `batches` - Inventory batches
- `suppliers` - Supplier registry
- `invoices` - Invoice records

### Synchronization System:
- `synchronization_protocols` - Breeding protocols
- `animal_synchronizations` - Active synchronizations
- `synchronization_steps` - Protocol steps
- `insemination_records` - Insemination tracking

### System Tables:
- `users` - User accounts
- `user_module_permissions` - Granular permissions
- `system_settings` - Configuration

---

## 🔐 Authentication & Permissions

### User Roles:
- `admin` - Full system access
- `vet` - Veterinary operations
- `tech` - Technical operations
- `viewer` - Read-only access
- `custom` - Granular module permissions

### Module Permissions:
- `view` - View data
- `edit` - Edit records
- `delete` - Delete records
- `create` - Create new records
- `receive_stock` - Receive stock
- `products` - Manage products
- `animals` - Manage animals
- `treatment` - Perform treatments
- `manage_users` - User management

---

## 📊 Regulatory Compliance

The system generates official Lithuanian veterinary reports:

1. **Veterinarinių vaistų žurnalas** (Drug Journal)
   - Medicine receipt and usage tracking
   - Batch numbers and expiry dates
   - Supplier information

2. **Gydomų gyvūnų registracijos žurnalas** (Treated Animals Register)
   - All 14 required columns per regulations
   - Treatment details and withdrawal periods
   - Veterinarian signatures

3. **Medicininių atliekų apskaita** (Medical Waste Log)
   - Automatic waste generation
   - Disposal tracking

4. **Biocidų naudojimo žurnalas** (Biocide Journal)
   - Biocide application tracking
   - Usage quantities and dates

---

## 🚨 Important Notes

### Current Status:
✅ **Single-farm system** - Currently operates as single-tenant  
⚠️ **Multi-tenancy required** - Needs implementation before serving 60 farms

### Migration History:
- **March 12, 2026** - Migrated from Berčiūnai system
- Removed GEA integration
- Removed Milk, Admin, Equipment, Worker modules
- Rebranded to RVAC
- **Next:** Implement multi-tenancy

---

## 📖 Documentation

- `RVAC_MIGRATION_SUMMARY.md` - Detailed migration summary
- `MULTI_TENANCY_IMPLEMENTATION_GUIDE.md` - Complete guide for adding multi-farm support
- `supabase/migrations/` - Database schema and changes

---

## 🛠️ Development

### Build:
```bash
npm run build
```

### Preview Production Build:
```bash
npm run preview
```

### Lint:
```bash
npm run lint
```

---

## 🎨 Features Retained

### Veterinary Module:
- ✅ Complete stock management (FIFO)
- ✅ Treatment tracking with withdrawal periods
- ✅ Vaccination campaigns
- ✅ Visit scheduling
- ✅ **Synchronization protocols** (breeding)
- ✅ Insemination tracking
- ✅ Hoof health management
- ✅ Biocide usage
- ✅ Medical waste tracking
- ✅ Regulatory reports
- ✅ Real-time updates

### Expenses Module:
- ✅ Invoice management
- ✅ Supplier tracking
- ✅ Financial reporting

---

## 🔮 Roadmap

### Phase 1: Multi-Tenancy (CRITICAL)
- [ ] Create farms table
- [ ] Add farm_id to all tables
- [ ] Implement farm selector UI
- [ ] Update authentication
- [ ] Update RLS policies
- [ ] Test data isolation

### Phase 2: Farm Onboarding
- [ ] Bulk farm import (60 farms)
- [ ] Automated farm setup
- [ ] User-farm assignments
- [ ] Farm management UI

### Phase 3: Enhancements
- [ ] Cross-farm reporting
- [ ] Farm-specific settings
- [ ] Advanced analytics
- [ ] Mobile optimization

---

## 📞 Support

**Client:** RVAC (Respublikinis veterinarijos aprūpinimo centras)  
**Website:** https://rvac.lt

---

## 📄 License

Proprietary - RVAC Internal Use Only

---

**Last Updated:** March 12, 2026  
**Version:** 2.0.0 (Post-Migration)  
**Status:** ⚠️ Multi-tenancy implementation required
