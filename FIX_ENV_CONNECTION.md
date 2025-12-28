# Fix MongoDB Connection String

## Error Message
"The provided database string is invalid. Database must be defined in the connection string"

## Solution

Your MongoDB Atlas connection string needs to include the database name.

### Current Format (WRONG):
```
mongodb+srv://username:password@cluster.mongodb.net?retryWrites=true&w=majority
```

### Correct Format (CORRECT):
```
mongodb+srv://username:password@cluster.mongodb.net/excel_report?retryWrites=true&w=majority
```

**Notice:** `/excel_report` is added after the cluster URL and before the `?`

## Steps to Fix:

1. Open your `.env` file in `D:\excel_report\.env`

2. Make sure your DATABASE_URL looks like this:

```env
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/excel_report?retryWrites=true&w=majority"
```

3. Replace:
   - `username` → Your MongoDB Atlas username
   - `password` → Your MongoDB Atlas password
   - `cluster.mongodb.net` → Your actual cluster URL
   - `excel_report` → Database name (you can change this to any name you want)

4. Make sure there's a `/database_name` part in the URL before the `?` character

5. Save the file

6. Then run:
```bash
npx prisma db push
```

## Example:

If your connection string is:
```
mongodb+srv://myuser:mypass@cluster0.hmogpuz.mongodb.net?retryWrites=true&w=majority
```

Change it to:
```
mongodb+srv://myuser:mypass@cluster0.hmogpuz.mongodb.net/excel_report?retryWrites=true&w=majority
```

The database name `excel_report` will be created automatically when we push the schema.

