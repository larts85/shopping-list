# Technical Context: Home Logistics

## Technology Stack

### Core Framework

- **Next.js**: 14.2.2 (App Router, Server Components, Server Actions)
- **React**: 18.x
- **TypeScript**: 5.x (gradual migration from JavaScript)
- **Node.js**: 20.x (recommended)

### Authentication & Authorization

- **next-auth**: 5.0.0-beta.17 (NextAuth.js v5)
- **google-auth-library**: 9.10.0

### Google APIs

- **googleapis**: 137.1.0 (Google Drive, Gmail APIs)
- **google-spreadsheet**: 4.1.2 (Google Sheets wrapper)

### Styling & UI

- **Tailwind CSS**: 3.4.1
- **PostCSS**: 8.x
- **react-icons**: 5.3.0
- **react-spinners**: 0.14.1

### Development Tools

- **ESLint**: 8.x with TypeScript support
- **Prettier**: 9.1.0 (via eslint-config-prettier)
- **TypeScript ESLint**: 8.6.0

## Development Setup

### Prerequisites

```bash
Node.js >= 18.0.0
npm or yarn
Google Cloud Project with OAuth 2.0 credentials
```

### Environment Variables Required

```env
AUTH_SECRET=<random-secret-for-nextauth>
AUTH_GOOGLE_ID=<google-oauth-client-id>
AUTH_GOOGLE_SECRET=<google-oauth-client-secret>
```

### Installation

```bash
npm install
npm run dev  # Development server on port 2020
npm run build  # Production build
npm start  # Production server
npm run lint  # Run ESLint
```

### Google Cloud Console Setup

1. **Create Project**

   - Go to Google Cloud Console
   - Create new project or select existing

2. **Enable APIs**

   - Google Drive API
   - Google Sheets API
   - Gmail API (for email features)

3. **Configure OAuth Consent Screen**

   - Set application name
   - Add required scopes:
     - `openid`
     - `email`
     - `profile`
     - `https://www.googleapis.com/auth/drive`
     - `https://www.googleapis.com/auth/gmail.send`

4. **Create OAuth 2.0 Credentials**

   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:2020/api/auth/callback/google` (development)
     - `https://your-domain.com/api/auth/callback/google` (production)

5. **Get Credentials**
   - Copy Client ID → `AUTH_GOOGLE_ID`
   - Copy Client Secret → `AUTH_GOOGLE_SECRET`

## Technical Constraints

### API Limitations

- **Google Sheets API**:
  - 100 requests per 100 seconds per user
  - 500 requests per 100 seconds per project
- **Google Drive API**:
  - 1,000 requests per 100 seconds per user
  - 10,000 requests per 100 seconds per project

### OAuth Token Expiry

- Access tokens expire after 1 hour
- Refresh tokens used for obtaining new access tokens
- Offline access required for long sessions

### Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES2020+ JavaScript features
- No IE11 support

## Dependencies Overview

### Production Dependencies

```json
{
  "dotenv": "16.4.5", // Environment variables
  "google-auth-library": "9.10.0", // Google OAuth client
  "google-spreadsheet": "4.1.2", // Sheets SDK wrapper
  "googleapis": "137.1.0", // Official Google APIs
  "next": "14.2.2", // Next.js framework
  "next-auth": "5.0.0-beta.17", // Authentication
  "react": "18", // React library
  "react-dom": "18", // React DOM
  "react-icons": "5.3.0", // Icon library
  "react-spinners": "0.14.1" // Loading spinners
}
```

### Dev Dependencies

```json
{
  "@types/node": "20", // Node.js types
  "@types/react": "18", // React types
  "@types/react-dom": "18", // React DOM types
  "@types/google-spreadsheet": "4.0.0", // Spreadsheet types
  "@typescript-eslint/eslint-plugin": "8.6.0",
  "@typescript-eslint/parser": "8.6.0",
  "eslint": "8", // Linting
  "eslint-config-next": "14.2.2", // Next.js ESLint config
  "eslint-config-prettier": "9.1.0", // Prettier integration
  "postcss": "8", // CSS processing
  "tailwindcss": "3.4.1", // Utility CSS
  "typescript": "5" // TypeScript compiler
}
```

## Build Configuration

### Next.js Config (`next.config.mjs`)

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router configuration
  experimental: {
    serverActions: true,
  },
};
```

### TypeScript Config (`tsconfig.json`)

- Target: ES2017
- Module: ESNext
- JSX: preserve
- Strict mode enabled
- Path aliases configured

### Tailwind Config (`tailwind.config.ts`)

- Content paths: `app/**/*.{js,ts,jsx,tsx}`
- Default theme extended
- No custom plugins

## Deployment Considerations

### Environment

- Node.js runtime required
- Environment variables must be set
- OAuth redirect URIs must match deployment URL

### Build Process

1. Install dependencies: `npm ci`
2. Build application: `npm run build`
3. Start server: `npm start`

### Recommended Platforms

- **Vercel**: Native Next.js support (recommended)
- **Netlify**: Next.js compatible
- **Docker**: Container deployment
- **Node.js server**: Traditional hosting

### Production Checklist

- [ ] Set `AUTH_SECRET` with strong random value
- [ ] Configure production OAuth redirect URIs
- [ ] Set appropriate CORS policies
- [ ] Enable error logging
- [ ] Configure rate limiting if needed
- [ ] Set up monitoring and alerts

## Code Organization Conventions

### File Naming

- Components: PascalCase (e.g., `Authenticate.tsx`)
- Utilities: camelCase (e.g., `googleSessionAuth.ts`)
- Server Actions: camelCase (e.g., `authenticate.js`)
- Pages: lowercase (e.g., `page.tsx`)

### Import Patterns

```typescript
// React/Next.js
import { useState } from "react";
import { redirect } from "next/navigation";

// Server actions
import { doGoogleLogin } from "@/app/actions/authenticate";

// Libraries
import { GoogleSpreadsheet } from "google-spreadsheet";

// Local utilities
import { googleSessionAuth } from "../lib/googleSessionAuth";
```

### Server vs Client Components

- Default: Server Components
- Use `"use client"` directive only when needed:
  - Event handlers
  - Browser APIs
  - useState, useEffect hooks
  - Third-party client libraries

### Server Actions

- Always use `"use server"` directive
- Place in `/app/actions/` directory
- Export async functions
- Handle errors appropriately

## Migration Status

### TypeScript Migration

- **Complete**: Most files in TypeScript
- **In Progress**: Some legacy `.js` files remain
- **Priority**: Migrate server actions and utilities first

### Legacy Files (JavaScript)

- `app/actions/authenticate.js` (should migrate)
- `utils/getRefreshToken.js` (commented out, legacy)

## Known Technical Debt

1. **Mixed JS/TS**: Not all files migrated to TypeScript
2. **Error Handling**: Could be more consistent across actions
3. **Type Safety**: Some `any` types in Google API responses
4. **Testing**: No test suite currently implemented
5. **Refresh Token**: Unused utility file (`getRefreshToken.js`)
