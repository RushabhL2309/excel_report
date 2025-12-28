# Quick Start: MongoDB Setup

## Step 1: Create `.env` File

Create a file named `.env` in the root directory (same folder as `package.json`)

## Step 2: Add MongoDB URL

Add this single line to your `.env` file:

```env
DATABASE_URL="mongodb://localhost:27017/excel_report"
```

**That's the format you need!**

### For MongoDB Atlas (Cloud):
```env
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/excel_report?retryWrites=true&w=majority"
```

Replace `username`, `password`, and `cluster.mongodb.net` with your actual values.

## Step 3: Setup Database

```bash
npx prisma generate
npx prisma db push
```

## Step 4: Run the App

```bash
npm run dev
```

Upload an Excel file and data will be saved to MongoDB automatically!
