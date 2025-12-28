# Excel Report Dashboard - Customer Engagement Platform

A comprehensive Next.js application for managing retail customer interactions, tracking department visits, cross-selling metrics, and enabling customer engagement through telephony integration.

## Features

### Current Implementation
- ✅ Excel file upload and parsing
- ✅ Salesperson incentive calculation
- ✅ Customer visit tracking with department analysis
- ✅ Customer 360° profiles
- ✅ Database persistence (PostgreSQL with Prisma)
- ✅ API routes for all data operations
- ✅ Department visit analysis (visited vs not visited)
- ✅ Call feedback system with department analysis
- ✅ Cross-selling tracking structure

### Pending Implementation (Ready for Integration)
- ⏳ Telephony provider integration (Exotel/Knowlarity/TeleCMI)
- ⏳ Authentication and RBAC
- ⏳ Follow-up reminders UI
- ⏳ Analytics dashboard UI
- ⏳ Call initiation UI components

## Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (create `.env` file):
```env
DATABASE_URL="postgresql://user:password@localhost:5432/excel_report"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Telephony Provider (optional - for future integration)
TELEPHONY_PROVIDER="exotel"
TELEPHONY_API_KEY="your-api-key"
TELEPHONY_API_TOKEN="your-api-token"
TELEPHONY_VIRTUAL_NUMBER="your-virtual-number"
```

3. Set up the database:
```bash
npx prisma migrate dev
npx prisma generate
```

4. (Optional) Seed master departments:
```bash
# Run this in Prisma Studio or via a script
# Departments: MENS ETHNICS, WOMENS WEAR, KIDS WEAR, FOOTWEAR, ACCESSORIES, HOME DECOR
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

## Project Structure

```
app/
  api/                    # API routes
    excel/
      save/              # Save parsed Excel data to database
    customers/           # Customer CRUD operations
    calls/               # Call management
    feedback/            # Call feedback
    reminders/           # Follow-up reminders
    analytics/           # Analytics endpoints
  customers/             # Customer pages
    [id]/               # Customer 360° profile
  page.tsx              # Main dashboard
  layout.tsx            # Root layout
lib/
  prisma.ts             # Prisma client
  departments.ts        # Department utilities
  types.ts              # TypeScript types
prisma/
  schema.prisma         # Database schema
components/
  CallFeedbackForm.tsx  # Post-call feedback form
```

## Database Schema

The application uses PostgreSQL with the following main models:
- `User` - User accounts and authentication
- `Customer` - Customer records
- `CustomerVisit` - Unique customer visits (tracks visited/not visited departments)
- `VisitTransaction` - Individual transactions within visits
- `Call` - Call records
- `CallFeedback` - Post-call feedback with department analysis
- `CrossSellingAttempt` - Cross-selling tracking
- `FollowUpReminder` - Follow-up reminders
- `MasterDepartment` - Master list of departments

## Key Features Explained

### Department Visit Analysis
- Tracks which departments customer visited vs didn't visit
- Master department list: MENS ETHNICS, WOMENS WEAR, KIDS WEAR, FOOTWEAR, ACCESSORIES, HOME DECOR
- Shows missing departments in customer profile
- Helps identify cross-selling opportunities

### Cross-Selling Tracking
- Tracks which departments salesperson suggested to customer
- Records customer responses in call feedback
- Analyzes cross-selling success rates
- Identifies customer mindset (didn't know, not interested, etc.)

### Call Feedback System
- Comprehensive feedback form after calls
- Department-wise analysis for non-visited departments
- Tracks why customer didn't visit (didn't know, not interested, salesperson didn't inform, etc.)
- Records if salesperson mentioned the department

## API Endpoints

- `POST /api/excel/save` - Save parsed Excel data
- `GET /api/customers` - List customers with filters
- `GET /api/customers/[id]` - Get customer 360° profile
- `POST /api/calls/initiate` - Initiate call (telephony integration pending)
- `POST /api/calls/webhook` - Telephony provider webhooks
- `POST /api/feedback` - Submit call feedback
- `GET /api/feedback?callId=...` - Get feedback for call
- `GET /api/visits` - List visits with filters
- `GET /api/analytics/cross-selling` - Cross-selling analytics
- `GET /api/reminders` - List reminders
- `POST /api/reminders` - Create reminder

## Next Steps for Full Implementation

1. **Telephony Integration**: Implement actual API calls to Exotel/Knowlarity/TeleCMI in `/app/api/calls/initiate/route.ts`

2. **Authentication**: Set up NextAuth.js for user authentication and RBAC

3. **Complete UI Components**:
   - Call initiation modal
   - Analytics dashboard page
   - Reminders page
   - Settings page for RBAC

4. **Master Department Management**: Add UI to manage master department list

## Technologies

- Next.js 14 (App Router)
- React 18
- TypeScript
- Prisma ORM
- PostgreSQL
- Tailwind CSS
- XLSX (Excel parsing)
