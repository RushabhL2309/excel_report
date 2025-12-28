# .env File Format for MongoDB

## Step 1: Create `.env` file

Create a file named `.env` in the root directory of your project (same folder as `package.json`).

## Step 2: Add MongoDB URL

Copy and paste this line into your `.env` file:

```env
DATABASE_URL="mongodb://localhost:27017/excel_report"
```

## For Local MongoDB:

```env
DATABASE_URL="mongodb://localhost:27017/excel_report"
```

## For MongoDB Atlas (Cloud):

```env
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/excel_report?retryWrites=true&w=majority"
```

**Replace in Atlas URL:**
- `username` → Your MongoDB Atlas username
- `password` → Your MongoDB Atlas password
- `cluster.mongodb.net` → Your cluster URL (from Atlas dashboard)
- `excel_report` → Database name (you can change this)

## Example .env file:

```env
DATABASE_URL="mongodb://localhost:27017/excel_report"
```

That's it! Just one line is needed for now.

## After adding the URL:

Run these commands:

```bash
npx prisma generate
npx prisma db push
npm run dev
```

