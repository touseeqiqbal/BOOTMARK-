## Authentication & Token Flow

### Overview

BOOTMARK uses **Firebase Authentication** on the frontend and a combination of:
- A **short-lived Firebase ID token** (used for API auth)
- An **Express session + cookie** (for \"remember me\" and SSR-safe context)

This document explains how tokens and sessions interact so you can understand the behaviour after long idle periods.

### Components

- **Firebase ID token**
  - Issued by Firebase Auth, typically valid ~1 hour.
  - Included as `Authorization: Bearer <token>` header on every API request.
  - Backend verifies it with Firebase Admin in `middleware/auth.js`.

- **Session cookie (`sessionId`)**
  - Managed by `express-session` in `server.js`.
  - Lifetime: 60 days (configurable).
  - Stores `req.session.userId`, `req.session.userEmail`, and `req.session.authenticated`.
  - When present, `authRequired` trusts the session and skips token verification.

- **`token` cookie (optional)**
  - Set by `/api/auth/verify-firebase-token` for some flows.
  - Backend also looks here if `Authorization` header is missing.

### Request Flow

1. **Frontend**
   - On each request, the Axios interceptor in `public/src/utils/api.js`:
     - Waits for `auth.authStateReady()`.
     - Reads `auth.currentUser`.
     - Calls `currentUser.getIdToken()` to obtain a valid ID token.
     - Sets `Authorization: Bearer <token>` header.

2. **Backend (`middleware/auth.js`)**
   - If a session exists (`req.session.authenticated`), it builds `req.user` from the session and (optionally) Firestore and **does not require a token**.
   - Otherwise:
     - Reads token from `Authorization` header or `token` cookie.
     - Verifies the token with Firebase Admin:
       - On success: builds `req.user` (UID, email, role, businessId, etc.).
       - On `auth/id-token-expired`: returns **401** with `{ error: \"token_expired\" }`.
       - On other Firebase auth errors: returns **401** with `{ error: \"invalid_token\" }`.

3. **Frontend 401 Handling**
   - Axios response interceptor in `public/src/utils/api.js`:
     - If it sees a **401** and the request has not been retried:
       - Calls `auth.authStateReady()`.
       - Uses `auth.currentUser.getIdToken(true)` to **force-refresh** the ID token.
       - Updates the `Authorization` header.
       - Retries the original request once.
   - If the refresh fails (e.g., user signed out in another tab), the request fails and the app can redirect to `/login`.

### Idle Behaviour

After the app has been idle for a few hours:

- The **session cookie** may still be valid (60-day lifetime).
- The **Firebase ID token** may be expired.

What happens on the next request:

1. Axios sends the expired token in the header.
2. Backend responds with `401 { error: \"token_expired\" }`.
3. Axios interceptor:
   - Refreshes the token via `getIdToken(true)`.
   - Retries the request with a fresh token.
4. Backend accepts the new token, and the request succeeds **without manual re-login**.

Additionally, `AuthContext` includes a `useEffect` that:
- On mount and whenever the tab becomes visible again:
  - Calls `auth.authStateReady()`.
  - If `auth.currentUser` exists, calls `getIdToken(true)` to proactively refresh the token.
  - If `auth.currentUser` is `null`, clears the local `bt_user_cache` and sets `user` to `null` to avoid \"half logged-in\" state.

### Why You Saw Repeated \"ID Token Expired\" Logs Before

Previously, `authRequired` had a **development-only** branch that:
- Logged the `auth/id-token-expired` error.
- Decoded the expired token and **accepted it anyway**.

That caused:
- Repeated log spam for each request using an expired token.
- No 401 response, so the frontend never triggered the refresh logic.
- Session/token state drift that only fully reset after manual logout/login.

Now:
- Expired tokens always yield **401 + `error: \"token_expired\"`**.
- The Axios interceptor refreshes the token automatically.
- Logs are concise and only show one line per auth error.

### Key Guarantees

- **No cross-tenant leaks**: `businessId` is always derived from verified token claims and/or Firestore, never guessed.
- **Short-lived authorization**: Only valid Firebase ID tokens are accepted; expired ones must be refreshed.
- **Smooth UX after idle**: A single failed request triggers a transparent token refresh and retry.
- **Clear errors**: Persistent auth problems show up as 401 responses rather than opaque backend logs only.

### When to Re-Login

The user will need to manually re-login only if:
- `auth.currentUser` is `null` (Firebase thinks there is no signed-in user), or
- Token refresh fails (e.g., revoked credentials, network issues).

In those cases, redirecting to `/login` is the correct flow.


