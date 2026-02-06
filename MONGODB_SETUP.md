# MongoDB Setup Instructions

## Where to Add MongoDB Connection URL

### 1. Create `.env` file in the root directory

Create a file named `.env` in the root of your project (same level as `package.json`).

### 2. Add your MongoDB connection string

Open the `.env` file and add:

```env
DATABASE_URL="mongodb://localhost:27017/excel_report"
```

Or if you're using MongoDB Atlas (cloud):

```env
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/excel_report?retryWrites=true&w=majority"
```

### 3. Connection String Formats

**Local MongoDB:**
```
mongodb://localhost:27017/excel_report
```

**MongoDB Atlas (Cloud):**
```
mongodb+srv://username:password@cluster.mongodb.net/excel_report?retryWrites=true&w=majority
```

**With Authentication:**
```
mongodb://username:password@host:port/database
```

### 4. Replace the placeholders:
- `username` - Your MongoDB username
- `password` - Your MongoDB password
- `cluster.mongodb.net` - Your MongoDB Atlas cluster URL
- `excel_report` - Database name (you can change this)

### 5. After adding the connection string:

1. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

2. **Push the schema to MongoDB:**
   ```bash
   npx prisma db push
   ```
   
   Note: For MongoDB, we use `db push` instead of `migrate` since MongoDB is schemaless.

3. **Verify connection:**
   ```bash
   npx prisma studio
   ```
   
   This will open Prisma Studio in your browser where you can view your database.

## Important Notes for MongoDB

1. **No Migrations:** MongoDB uses `db push` instead of migrations because it's schemaless.

2. **ObjectId:** All IDs are automatically converted to MongoDB ObjectIds.

3. **Decimal Fields:** Changed to `Float` since MongoDB doesn't have native Decimal type.

4. **Database Name:** The database name is specified in the connection string (e.g., `excel_report`).

5. **Collections:** Collections (tables) are automatically created when you push the schema.

## Testing the Connection

After setting up, you can test by:
1. Running the dev server: `npm run dev`
2. Uploading an Excel file
3. Data should be saved to MongoDB
4. Check in Prisma Studio or MongoDB Compass

## Troubleshooting

- **Connection Error:** Make sure MongoDB is running (if local) or your Atlas credentials are correct
- **Authentication Error:** Check username/password in connection string
- **Network Error:** For Atlas, ensure your IP is whitelisted in Atlas dashboard
- **Database Not Found:** MongoDB will create the database automatically when you first insert data




