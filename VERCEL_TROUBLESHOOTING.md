# Vercel Deployment Troubleshooting Guide

## Common Issues and Solutions

### 1. 404/500 Errors - Database Not Loading

#### Check 1: DATABASE_URL Environment Variable

**Problem:** The most common cause of 500 errors is a missing or incorrect `DATABASE_URL` environment variable.

**Solution:**
1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Verify that `DATABASE_URL` is set correctly
4. Format should be:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/excel_report?retryWrites=true&w=majority
   ```
5. Make sure it's enabled for **Production**, **Preview**, and **Development**
6. **Redeploy** your application after adding/updating the variable

#### Check 2: MongoDB Atlas Network Access

**Problem:** Vercel's IP addresses might not be whitelisted in MongoDB Atlas.

**Solution:**
1. Go to MongoDB Atlas → **Network Access**
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere** (for testing) or add `0.0.0.0/0`
4. For production, consider adding Vercel's IP ranges (optional but more secure)

#### Check 3: Database User Permissions

**Problem:** The database user might not have correct permissions.

**Solution:**
1. Go to MongoDB Atlas → **Database Access**
2. Ensure your user has **Read and write to any database** permissions
3. Or at minimum, permissions for the `excel_report` database

#### Check 4: Database Name in Connection String

**Problem:** Missing database name in connection string.

**Solution:**
Make sure your connection string includes the database name:
- ✅ Correct: `mongodb+srv://user:pass@cluster.mongodb.net/excel_report?retryWrites=true&w=majority`
- ❌ Wrong: `mongodb+srv://user:pass@cluster.mongodb.net?retryWrites=true&w=majority`

#### Check 5: Prisma Client Generation

**Problem:** Prisma Client might not be generated during build.

**Solution:**
Vercel should automatically run `prisma generate` during build. If not:
1. Check build logs in Vercel dashboard
2. Verify `package.json` has `postinstall` script (should be automatic with Next.js + Prisma)
3. If needed, add to `package.json`:
   ```json
   {
     "scripts": {
       "postinstall": "prisma generate"
     }
   }
   ```

---

### 2. 404 Errors - API Routes Not Found

**Problem:** API routes returning 404.

**Possible Causes:**
1. Routes not deployed correctly
2. Build errors preventing route compilation
3. File structure issues

**Solution:**
1. Check Vercel build logs for compilation errors
2. Verify API route files exist in `app/api/` directory
3. Ensure route files export named functions (GET, POST, etc.)
4. Check that file structure matches Next.js App Router conventions

---

### 3. Database Connection Errors

**Error Messages to Look For:**
- `P1001: Can't reach database server`
- `P1017: Server has closed the connection`
- `Authentication failed`

**Solutions:**
1. **Verify DATABASE_URL** is correct (see Check 1 above)
2. **Check MongoDB Atlas Status** - ensure cluster is running
3. **Verify Credentials** - username and password are correct
4. **Check Connection String Format** - must include database name
5. **Review Network Access** - IP whitelist in MongoDB Atlas

---

### 4. Empty Data on Page Load

**Expected Behavior:**
- If database is empty, API should return empty arrays
- Page should load without errors
- Dashboard should show "No data" message

**If you're seeing errors instead:**
1. Check browser console for specific error messages
2. Check Vercel function logs in dashboard
3. Verify API routes are returning proper responses

---

### 5. Build-Time Errors

**Common Build Errors:**

#### Prisma Client Not Generated
```
@prisma/client did not initialize yet
```
**Solution:** Add to `package.json`:
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

#### TypeScript Errors
Check `tsconfig.json` - should have `"target": "ES2015"` or higher

---

## Debugging Steps

### Step 1: Check Environment Variables
```bash
# In Vercel dashboard, verify:
✅ DATABASE_URL is set
✅ Value is correct MongoDB connection string
✅ Enabled for all environments (Production, Preview, Development)
```

### Step 2: Check Build Logs
1. Go to Vercel → Your Project → Deployments
2. Click on the latest deployment
3. Check "Build Logs" tab
4. Look for errors related to:
   - Prisma
   - Database connection
   - TypeScript compilation

### Step 3: Check Function Logs
1. Go to Vercel → Your Project → Functions
2. Click on an API route (e.g., `/api/dashboard/data`)
3. Check "Logs" tab for runtime errors

### Step 4: Test API Routes Directly
1. Open your Vercel deployment URL
2. Navigate to: `https://your-app.vercel.app/api/dashboard/data`
3. Should return JSON (empty or with data)
4. If 404/500, check the error details

---

## Quick Fix Checklist

- [ ] `DATABASE_URL` is set in Vercel environment variables
- [ ] `DATABASE_URL` includes database name (`/excel_report`)
- [ ] MongoDB Atlas IP whitelist includes `0.0.0.0/0` (or Vercel IPs)
- [ ] Database user has correct permissions
- [ ] Connection string format is correct
- [ ] Application has been redeployed after adding environment variables
- [ ] Build logs show no errors
- [ ] Function logs show no runtime errors

---

## Still Having Issues?

1. **Check Vercel Logs:**
   - Go to your deployment
   - Check both "Build Logs" and "Function Logs"
   - Look for specific error messages

2. **Verify Database Connection:**
   - Try connecting to MongoDB Atlas from your local machine
   - Use MongoDB Compass or `mongosh` with the same connection string

3. **Test Locally:**
   - Copy the exact `DATABASE_URL` from Vercel
   - Test locally with that connection string
   - If it works locally but not on Vercel, it's likely an IP whitelist issue

4. **Contact Support:**
   - Share specific error messages from logs
   - Include relevant parts of build/function logs
   - Mention which API routes are failing

