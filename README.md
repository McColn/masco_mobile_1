# MASCO Finance — Mobile App
**Expo React Native · TypeScript · Production-Ready**

Programu ya simu ya MASCO Finance Co. Ltd — imejengwa kutoka mfumo wa Django web app.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 51 + Expo Router v3 |
| Language | TypeScript (strict) |
| State — Server | TanStack Query v5 |
| State — Client | Zustand v4 |
| HTTP | Axios + JWT interceptors |
| Forms | react-hook-form + zod |
| Storage | expo-secure-store |
| UI | Custom design system (navy/gold/teal) |
| Backend | Django REST Framework + SimpleJWT |

---

## Project Structure

```
masco-mobile/
├── app/                        # Expo Router file-based routes
│   ├── _layout.tsx             # Root layout (providers, session restore)
│   ├── (auth)/
│   │   └── index.tsx           # Login screen
│   ├── (tabs)/
│   │   ├── index.tsx           # Dashboard
│   │   ├── loans.tsx           # Loan list
│   │   ├── clients.tsx         # Client list
│   │   ├── expenses.tsx        # Expense list
│   │   └── profile.tsx         # User profile
│   ├── loans/
│   │   ├── [id].tsx            # Loan detail + repayment
│   │   └── new.tsx             # New loan form
│   ├── clients/
│   │   ├── [id].tsx            # Client detail
│   │   └── new.tsx             # New client form
│   ├── expenses/
│   │   └── new.tsx             # New expense form
│   ├── reports/
│   │   └── index.tsx           # Monthly reports
│   └── salaries/
│       └── index.tsx           # Salary list
├── components/
│   ├── ui/                     # Atomic UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── StatCard.tsx
│   │   ├── Badge.tsx
│   │   ├── Skeleton.tsx
│   │   ├── EmptyState.tsx
│   │   └── ProgressBar.tsx
│   └── common/                 # Domain components
│       ├── ScreenHeader.tsx
│       ├── BranchSelector.tsx
│       ├── LoanCard.tsx
│       └── ClientRow.tsx
├── constants/
│   └── theme.ts                # Design tokens (colors, spacing, typography)
├── hooks/
│   └── useDebounce.ts
├── lib/
│   ├── api.ts                  # Axios instance + JWT refresh interceptor
│   ├── services.ts             # Typed API service layer
│   ├── types.ts                # All TypeScript interfaces
│   ├── format.ts               # TZS formatting, date helpers
│   ├── queryClient.ts          # TanStack QueryClient + query key factory
│   └── toastConfig.tsx         # Custom toast styles
├── store/
│   ├── authStore.ts            # Auth state (user, tokens, login/logout)
│   └── branchStore.ts          # Selected office/branch state
└── backend_addition/
    └── views_mobile.py         # New Django view: api/reports/monthly/
```

---

## Setup

### 1. Install dependencies

```bash
cd masco-mobile
npm install
```

> **Note on `victory-native`:** If you add charts later, use `victory-native@^36` which is compatible with React 18. Do NOT use `@36.x` with React 19.

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — set EXPO_PUBLIC_API_URL to your Django server
```

### 3. Django backend — add monthly report endpoint

Copy `backend_addition/views_mobile.py` content into your Django project:

```python
# In api/views.py — add this import at top:
from .views_mobile import api_monthly_summary  # if kept separate

# In api/urls.py — add:
path('reports/monthly/', api_monthly_summary, name='api_monthly_summary'),
```

Ensure your Django `settings.py` has:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:8081",  # Expo dev
    "exp://192.168.x.x:8081",
]

# Or for all origins during development:
CORS_ALLOW_ALL_ORIGINS = True  # Remove in production

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}
```

### 4. Run

```bash
# Start Expo dev server
npm start

# Android
npm run android

# iOS
npm run ios
```

---

## Authentication Flow

```
App Launch
  └── restoreSession() — reads tokens from SecureStore
        ├── tokens found → validate / set Zustand auth state → (tabs)
        └── no tokens    → (auth)/login

Login Screen
  └── POST /api/auth/login/ → { access, refresh, user }
        └── store in SecureStore → Zustand → redirect (tabs)

Every API request
  └── Axios interceptor attaches:
        Authorization: Bearer <access_token>
        X-Office-Id: <selected_branch_id>

On 401 response
  └── Silent refresh via POST /api/auth/refresh/
        ├── success → retry original request with new token
        └── failure → authEventEmitter.emit('logout') → app-wide logout
```

---

## Branch Switching

The selected office is stored in `branchStore` (Zustand + SecureStore).  
All API calls automatically include `X-Office-Id` header, mirroring the web app's office scoping exactly.

Superusers can switch between all offices.  
Regular users see only their assigned offices.

---

## Design System

Colors defined in `constants/theme.ts`:

| Token | Hex | Usage |
|-------|-----|-------|
| `Colors.navy` | `#0d1b2e` | Background, deep surfaces |
| `Colors.gold` | `#d4950a` | Primary accent, CTAs |
| `Colors.teal` | `#0fc0c0` | Secondary accent, repayments |
| `Colors.surface` | `#162236` | Cards, inputs |
| `Colors.border` | `#1e3a5f` | Dividers, borders |
| `Colors.text` | `#f0f4f8` | Primary text |
| `Colors.textMuted` | `#64748b` | Labels, metadata |

---

## API Endpoints Used

All endpoints are on the existing DRF backend at `/api/`:

| Endpoint | Method | Description |
|---------|--------|-------------|
| `/auth/login/` | POST | JWT login |
| `/auth/refresh/` | POST | Token refresh |
| `/auth/logout/` | POST | Blacklist token |
| `/dashboard/` | GET | Stats + recent activity |
| `/offices/` | GET | Branch list |
| `/clients/` | GET/POST | Paginated client list + create |
| `/clients/:id/` | GET/PUT | Client detail + edit |
| `/loans/` | GET/POST | Paginated loan list + create |
| `/loans/:id/` | GET | Loan detail |
| `/loans/:id/repayments/` | GET/POST | Repayments list + add |
| `/loans/:id/schedule/` | GET | Amortization schedule |
| `/expenses/` | GET/POST | Expenses list + create |
| `/expense-categories/` | GET | Category list |
| `/salaries/` | GET | Salary list |
| `/reports/monthly/` | GET | Monthly summary (**new**) |

---

## Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Configure
eas build:configure

# Build APK (Android)
eas build --platform android --profile preview

# Build AAB for Play Store
eas build --platform android --profile production
```

Make sure `app.json` has correct `android.package` before submitting.

---

## Developer Notes

- All UI labels are in **Swahili** to match the existing web app.
- Currency always formatted in **TZS** via `formatTZS()`.
- Queries use stale time of **2 minutes** — adjust in `lib/queryClient.ts`.
- Infinite scroll uses TanStack Query `useInfiniteQuery` with page-based pagination.
- The `X-Office-Id` header is injected in `lib/api.ts` interceptor — never manually.

---

*Built by Cornel Mtavangu — mccoln.com*
