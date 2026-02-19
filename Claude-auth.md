# Auth — Shared Access Code Authentication

Lightweight authentication for an internal team tool. No user accounts, no OAuth. A single shared access code grants access. Sessions persist via signed HTTP-only cookies for 7 days.

## Features

### Access Code Login

#### Constraints
- **Access code must be stored as `ACCESS_CODE` environment variable — never in code or database**
- **Comparison must be timing-safe to prevent timing attacks** (use `crypto.timingSafeEqual`)
- **Failed attempts must be rate-limited: max 5 attempts per IP per 15 minutes**
- *Log failed attempts with timestamp and IP for audit*

#### Flow
- Input: User submits access code via login form
- Process: `POST /api/auth/login` receives code, compares timing-safe against env var
- On match: Generate signed session cookie with `SESSION_SECRET`, set `httpOnly`, `secure`, `sameSite: strict`, `maxAge: 7 days`
- On failure: Return 401 with generic "Invalid code" message (no hint about correctness)
- Output: Redirect to `/dashboard`

### Session Management

#### Constraints
- **Session cookie must be `httpOnly` and `secure` in production**
- **Cookie name: `sd_session`**
- **Cookie value: signed token containing `{ authenticated: true, issuedAt: timestamp }`**
- *Use `jose` or `jsonwebtoken` for signing — not plain base64*

#### Validation Flow
- Input: Any request to a protected route
- Process: `middleware.ts` reads `sd_session` cookie, verifies signature with `SESSION_SECRET`, checks `issuedAt` is within 7 days
- On valid: Allow request to proceed
- On invalid/expired/missing: Redirect to `/` (login page)
- Output: Request continues or redirects

### Logout

#### Constraints
- **Clear the `sd_session` cookie on logout**
- *Redirect to `/` after clearing*

#### Flow
- Input: User clicks logout button
- Process: `POST /api/auth/logout` clears the session cookie
- Output: Redirect to `/`

### Middleware Route Protection

#### Constraints
- **Protect all routes under `/dashboard` and `/history` and `/api/upload` and `/api/uploads` and `/api/export`**
- **Do not protect `/` (login page) or `/api/auth/*` routes**
- **Middleware must run on the edge — keep dependencies minimal**

#### Flow
- Input: Every incoming request
- Process: `middleware.ts` checks the route path. If protected, validate session cookie. If not protected, pass through.
- Output: Continue or redirect to login

## Types

```typescript
// Session payload signed into the cookie
interface SessionPayload {
  authenticated: true;
  issuedAt: number; // Unix timestamp
}

// Login request body
const LoginSchema = z.object({
  code: z.string().min(1).max(100),
});

// Login response
interface LoginResponse {
  success: boolean;
  message?: string;
}
```

## Security Notes

- The access code is not hashed because it is a shared secret, not a user password. It lives only in the environment variable and is compared server-side.
- If the team grows beyond 10 people, consider migrating to Supabase Auth with email/password or magic links. The `AuthGuard` component and middleware are designed to make this swap straightforward.
- All auth API routes must return consistent response times regardless of success/failure to prevent timing-based enumeration.
