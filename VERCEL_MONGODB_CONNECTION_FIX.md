# Fix MongoDB Connection Error on Vercel

## Error Message
```
fatal alert: InternalError
Server selection timeout: No available servers
```

## Root Cause
This is a TLS/SSL connection issue between Vercel serverless functions and MongoDB Atlas. The connection string format or connection pooling might be causing issues.

## Solutions

### Solution 1: Update DATABASE_URL in Vercel (Recommended)

**Check your connection string format:**

Your connection string should look like this:
```
mongodb+srv://username:password@cluster.mongodb.net/excel_report?retryWrites=true&w=majority
```

**Add connection pooling parameters:**
```
mongodb+srv://username:password@cluster.mongodb.net/excel_report?retryWrites=true&w=majority&maxPoolSize=10&serverSelectionTimeoutMS=5000
```

**Full example:**
```
mongodb+srv://myuser:mypassword@cluster0.hmogpuz.mongodb.net/excel_report?retryWrites=true&w=majority&maxPoolSize=10&serverSelectionTimeoutMS=5000
```

**Parameters explained:**
- `retryWrites=true` - Enable retry for write operations
- `w=majority` - Write concern
- `maxPoolSize=10` - Maximum number of connections in the pool
- `serverSelectionTimeoutMS=5000` - Timeout for server selection (5 seconds)

### Solution 2: Verify MongoDB Atlas Settings

1. **Network Access:**
   - Go to MongoDB Atlas → Network Access
   - Add IP Address: `0.0.0.0/0` (Allow from anywhere)
   - Or add Vercel's IP ranges if you know them

2. **Database User:**
   - Go to MongoDB Atlas → Database Access
   - Verify your user has correct permissions
   - Username and password must match the connection string

3. **Cluster Status:**
   - Ensure your cluster is running and not paused
   - Check cluster status in Atlas dashboard

### Solution 3: Update Connection String in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Find `DATABASE_URL`
3. Update it with the parameters above
4. **Important:** Make sure there are no extra spaces or quotes
5. Redeploy your application

### Solution 4: Test Connection String Format

The connection string should:
- ✅ Start with `mongodb+srv://`
- ✅ Include username and password (URL encoded if special characters)
- ✅ Include cluster hostname
- ✅ Include database name (`/excel_report`)
- ✅ Include query parameters after `?`

**Correct Format:**
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/excel_report?retryWrites=true&w=majority
```

**Common Mistakes:**
- ❌ Missing database name (`/excel_report`)
- ❌ Using `mongodb://` instead of `mongodb+srv://`
- ❌ Extra spaces or quotes around the URL
- ❌ Special characters in password not URL encoded

### Solution 5: URL Encode Special Characters

If your password contains special characters, URL encode them:

- `@` becomes `%40`
- `#` becomes `%23`
- `$` becomes `%24`
- `%` becomes `%25`
- `&` becomes `%26`
- `+` becomes `%2B`
- `=` becomes `%3D`

**Example:**
If your password is `P@ssw0rd#123`, use: `P%40ssw0rd%23123`

## Quick Checklist

- [ ] Connection string starts with `mongodb+srv://`
- [ ] Connection string includes database name (`/excel_report`)
- [ ] Connection string includes connection pool parameters
- [ ] MongoDB Atlas Network Access allows `0.0.0.0/0` or Vercel IPs
- [ ] Database user credentials are correct
- [ ] Cluster is running (not paused)
- [ ] No extra spaces or quotes in DATABASE_URL in Vercel
- [ ] Special characters in password are URL encoded
- [ ] Application has been redeployed after updating DATABASE_URL

## Still Having Issues?

1. **Create a new MongoDB user:**
   - Sometimes recreating the database user helps
   - Use a simple password without special characters for testing

2. **Test connection locally:**
   - Copy the exact connection string from Vercel
   - Test it locally with MongoDB Compass or `mongosh`
   - If it works locally but not on Vercel, it's likely a network/IP issue

3. **Check Vercel function logs:**
   - Look for more specific error messages
   - Check if the connection string is being read correctly

4. **Try a different MongoDB cluster:**
   - If possible, create a new cluster and test
   - This helps isolate if it's a cluster-specific issue

