# Authentication Credentials

## Simple Username/Password Authentication

The application uses a simple authentication system with two roles:

### Admin Role
- **Username:** `admin`
- **Password:** `admin123`
- **Access:** Full access to all features
  - ✅ Incentive page (Excel upload and parsing)
  - ✅ Customer Details page
  - ✅ Calling page

### Telecaller Role
- **Username:** `telecaller`
- **Password:** `telecaller123`
- **Access:** CRM features only
  - ❌ Incentive page (blocked - redirects to Customer Details)
  - ✅ Customer Details page
  - ✅ Calling page

## How It Works

1. **Login Page:** `/login`
   - Simple form with username and password fields
   - Shows demo credentials at the bottom

2. **Authentication:**
   - Credentials are hardcoded in `contexts/AuthContext.tsx`
   - Simple string comparison (no encryption/hashing)
   - Session stored in `localStorage`

3. **Route Protection:**
   - All routes except `/login` require authentication
   - Unauthenticated users are redirected to `/login`
   - Admin-only routes check role and redirect if needed

4. **Sidebar Navigation:**
   - Shows different menu items based on user role
   - Admin sees: Incentive, Customer Details, Calling
   - Telecaller sees: Customer Details, Calling
   - Logout button at bottom of sidebar

## Implementation Details

- **Auth Context:** `contexts/AuthContext.tsx`
- **Login Page:** `app/login/page.tsx`
- **Layout:** `app/layout.tsx` (wraps with AuthProvider)
- **Sidebar:** `components/Sidebar.tsx` (role-based navigation)
- **Protected Routes:** Check in component `useEffect`

## Security Note

⚠️ **This is a simple authentication system for demo/internal use.**
- Credentials are hardcoded (not secure for production)
- No password hashing/encryption
- Session stored in localStorage (can be cleared)
- For production, use proper authentication (NextAuth.js, JWT, etc.)

## Testing

1. Go to any page → Redirected to `/login`
2. Login as Admin → Can access all pages
3. Login as Telecaller → Can only access Customer Details and Calling
4. Try accessing `/` as Telecaller → Redirected to `/customers`
5. Logout → Redirected to `/login`
