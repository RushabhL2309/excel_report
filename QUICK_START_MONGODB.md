# Quick Start: MongoDB Setup

## Step 1: Add MongoDB Connection URL

**Create a file named `.env` in the root directory** (same folder as `package.json`)

Add this line:

```env
DATABASE_URL="mongodb://localhost:27017/excel_report"
```

### For MongoDB Atlas (Cloud):
```env
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/excel_report?retryWrites=true&w=majority"
```

**Replace:**
- `username` - Your MongoDB username
- `password` - Your MongoDB password  
- `cluster.mongodb.net` - Your Atlas cluster URL
- `excel_report` - Database name (change if needed)

## Step 2: Setup Database

Run these commands:

```bash
# Generate Prisma client for MongoDB
npx prisma generate

# Push schema to MongoDB (creates collections)
npx prisma db push
```

## Step 3: Test It

```bash
# Start the app
npm run dev

# Upload an Excel file
# Data will be saved to MongoDB automatically
```

## Step 4: View Data (Optional)

```bash
# Open Prisma Studio to view your data
npx prisma studio
```

This opens a web interface at http://localhost:5555 where you can browse your MongoDB collections.

## That's It! ✅

Your data is now being saved to MongoDB when you upload Excel files.




