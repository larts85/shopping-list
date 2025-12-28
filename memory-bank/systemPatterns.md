# System Patterns: Home Logistics

## Architecture Overview

Home Logistics follows a server-centric Next.js architecture using the App Router with Server Components and Server Actions.

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  (React Components, UI, User Interactions)                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                      Server Actions                          │
│  (authenticate.js, categories.ts, products.ts, etc.)        │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                    Authentication Layer                      │
│         (NextAuth, OAuth2, Session Management)              │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                    Google API Layer                          │
│     (Drive API, Sheets API, Gmail API)                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                    Data Storage                              │
│              (Google Sheets as Database)                     │
└─────────────────────────────────────────────────────────────┘
```

## Key Technical Decisions

### 1. NextAuth v5 Beta for Authentication

**Decision**: Use NextAuth.js v5 (beta) with Google provider

**Rationale**:

- Native Next.js 14 App Router support
- Simplified OAuth 2.0 flow
- Built-in session management
- Extensible callback system for custom token handling

**Implementation**:

- OAuth configuration in `auth.ts`
- Offline access with refresh tokens
- Extended scopes: Drive, Gmail
- Custom JWT and session callbacks

### 2. Google Sheets as Database

**Decision**: Use Google Sheets API directly instead of traditional database

**Rationale**:

- User owns their data
- No database hosting costs
- Built-in sharing capabilities
- Familiar spreadsheet interface
- Easy data export and backup

**Trade-offs**:

- API rate limits
- Limited query capabilities
- Slower than traditional databases
- Requires internet connection

### 3. Server Actions for Data Operations

**Decision**: Use Server Actions exclusively for data mutations

**Rationale**:

- Security: API credentials never exposed to client
- Type safety with TypeScript
- Built-in Next.js optimization
- Simplified data fetching patterns

**Pattern**:

```typescript
"use server";

export async function serverAction() {
  const { session, accessToken } = await googleSessionAuth();
  // Perform Google API call
  return result;
}
```

### 4. Middleware for Data Validation

**Decision**: Implement middleware to check for required Google Drive setup

**Implementation**:

- Check for "homeLogistic" folder existence
- Redirect to setup page if missing
- Applied to `/logistic/` routes only

## Component Relationships

### Authentication Flow

```
User → Authenticate Component → doGoogleLogin()
  → NextAuth SignIn → Google OAuth
  → Callback → JWT with tokens
  → Session with accessToken
  → Redirect to /logistic
```

### Data Access Pattern

```
Page Component → Server Action → googleSessionAuth()
  → Validate Session → Get Access Token
  → Google API Call → Process Response
  → Return Data → Display in UI
```

### Google Sheets Structure

```
homeLogistic/
  └── homeLogisticSheet
      ├── categories (id, name)
      ├── products (id, name, id_category, checked)
      ├── list (id, id_product, name, id_category, cantidad,
      │         medida, precio, precio_total, precio_kg,
      │         kg_total, comprado)
      └── historical (id, id_list, id_product, name,
                     id_category, cantidad, medida, precio,
                     precio_total, precio_kg, kg_total,
                     comprado, fecha)
```

## Design Patterns in Use

### 1. Repository Pattern (Implicit)

- `googleDatabase.ts`: Database access layer
- `googleFileSheetConection.ts`: Connection management
- Server Actions: Domain operations

### 2. Factory Pattern

- `getOAuth2Client()`: Creates authenticated OAuth2 clients
- `sheetDoc()`: Creates GoogleSpreadsheet instances

### 3. Facade Pattern

- `googleSessionAuth()`: Simplifies authentication access
- `getSheetFileId()`: Abstracts folder and file lookup

### 4. Error Handling Strategy

- Try-catch in server actions
- Descriptive error messages
- Middleware error boundaries
- Redirect to error pages

## Module Organization

```
app/
├── actions/          # Server actions (data operations)
├── api/             # API routes (NextAuth handlers)
├── lib/             # Shared utilities
│   ├── googleDatabase.ts
│   ├── googleFileSheetConection.ts
│   ├── googleSessionAuth.ts
│   └── types.ts
├── logistic/        # Main application routes
│   ├── add/        # Add items to list
│   ├── admin/      # Admin panel
│   └── data/       # Data sharing
├── ui/              # UI components
└── no-data/         # Setup required page
```

## State Management

**Approach**: Server-driven state with React Server Components

- No client-side state management library
- Server Components fetch fresh data
- Server Actions handle mutations
- URL state for navigation
- Session state via NextAuth

## Type System

### TypeScript Integration

- Strict type checking enabled
- Custom type definitions in `next-auth.d.ts`
- Type-safe Google API interactions
- Type definitions in `app/lib/types.ts`

### Type Extensions

```typescript
// Extended NextAuth types for custom session data
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    idToken?: string;
  }
}
```

## Security Patterns

1. **Server-Only API Calls**: All Google API calls happen server-side
2. **Token Storage**: OAuth tokens stored in JWT, never exposed to client
3. **Session Validation**: Every protected action validates session
4. **Scope Limitation**: Request only necessary OAuth scopes
5. **Error Sanitization**: Avoid leaking sensitive data in errors

## Performance Considerations

1. **Server Components**: Default to Server Components for better performance
2. **Data Caching**: Leverage Next.js cache for API responses
3. **Selective Client Components**: Use "use client" only when necessary
4. **Optimistic Updates**: Could be implemented for better UX
5. **API Batch Operations**: Batch Google API calls where possible
