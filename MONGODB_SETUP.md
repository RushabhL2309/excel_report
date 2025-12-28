# MongoDB Setup Instructions

## Where to Add MongoDB Connection URL

### Create `.env` File

Create a file named `.env` in the root directory (same level as `package.json`).

### Add MongoDB URL

Add this line to your `.env` file:

```env
DATABASE_URL="mongodb://localhost:27017/excel_report"
```

**This is the format you need to use.**

### For MongoDB Atlas (Cloud):

```env
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/excel_report?retryWrites=true&w=majority"
```

Replace:
- `username` - Your MongoDB username
- `password` - Your MongoDB password
- `cluster.mongodb.net` - Your MongoDB Atlas cluster URL
- `excel_report` - Database name (you can change this)

## After Adding the URL

1. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

2. **Push the schema to MongoDB:**
   ```bash
   npx prisma db push
   ```
   
   Note: For MongoDB, we use `db push` instead of `migrate`.

3. **Start your app:**
   ```bash
   npm run dev
   ```

4. **Test by uploading an Excel file** - Data will be saved to MongoDB.

## Important Notes for MongoDB

- Use `npx prisma db push` (not `migrate`) for MongoDB
- Database is created automatically when you first insert data
- All IDs are MongoDB ObjectIds
- Decimal fields are stored as Float

## Troubleshooting

- **Connection Error:** Make sure MongoDB is running (if local) or credentials are correct
- **Authentication Error:** Check username/password in connection string
- **Network Error:** For Atlas, ensure your IP is whitelisted
