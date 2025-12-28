# Environment Variables for Vercel Deployment

## Required Environment Variables

Add these environment variables in your Vercel project settings:

### 1. DATABASE_URL (REQUIRED)

**Purpose:** MongoDB connection string for your database

**Format for MongoDB Atlas:**
```
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/excel_report?retryWrites=true&w=majority
```

**How to get it:**
1. Go to your MongoDB Atlas dashboard
2. Click "Connect" on your cluster
3. Select "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your actual password
6. Replace `<dbname>` with `excel_report` (or your preferred database name)

**Example:**
```
DATABASE_URL=mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/excel_report?retryWrites=true&w=majority
```

---

## Optional Environment Variables

### 2. TELEPHONY_PROVIDER (Optional - for future use)

**Purpose:** Telephony provider type (when telephony integration is implemented)

**Values:** `EXOTEL`, `KNOWLARITY`, or `TELECMI`

**Example:**
```
TELEPHONY_PROVIDER=EXOTEL
```

**Note:** This is currently not used but reserved for future telephony integration. You can skip this for now.

---

## How to Add Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click on **Settings** tab
3. Click on **Environment Variables** in the sidebar
4. Click **Add New** button
5. Enter the variable name (e.g., `DATABASE_URL`)
6. Enter the variable value
7. Select the environments where it should be available:
   - ✅ Production
   - ✅ Preview
   - ✅ Development (optional)
8. Click **Save**
9. **Important:** After adding variables, redeploy your application for changes to take effect

---

## Summary

**Minimum Required:**
- ✅ `DATABASE_URL` - MongoDB connection string

**Optional (for future use):**
- ⏳ `TELEPHONY_PROVIDER` - Telephony provider type

---

## After Adding Environment Variables

1. **Redeploy your application** in Vercel
2. The build process will automatically run `prisma generate`
3. Your application should connect to MongoDB successfully

---

## Security Notes

- ⚠️ Never commit `.env` files to git (already in `.gitignore`)
- ⚠️ Environment variables in Vercel are encrypted at rest
- ⚠️ Use different MongoDB credentials for production vs development if possible
- ⚠️ Keep your MongoDB password strong and secure

---

## Troubleshooting

### Database connection errors:
- Verify your MongoDB Atlas IP whitelist includes Vercel's IPs (or use `0.0.0.0/0` for testing)
- Check that your username and password are correct
- Ensure the database name is included in the connection string

### Build errors:
- Make sure `DATABASE_URL` is set before building
- Check that Prisma can generate the client (runs automatically in Vercel build)

