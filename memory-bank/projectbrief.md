# Project Brief: Home Logistics

## Project Overview

Home Logistics is a Next.js web application designed to manage household shopping logistics through Google Drive and Google Sheets integration. The application provides a comprehensive solution for managing products, categories, shopping lists, and purchase history.

## Core Requirements

### Functionality

1. **User Authentication**: Google OAuth 2.0 authentication with offline access
2. **Product Management**: CRUD operations for household products
3. **Category Management**: Organize products into categories
4. **Shopping List**: Create and manage shopping lists with pricing and quantities
5. **Historical Tracking**: Track purchase history over time
6. **Google Drive Integration**: Store all data in user's Google Drive
7. **Google Sheets Backend**: Use Google Sheets as the database

### User Experience Goals

- Seamless Google authentication
- Automatic data synchronization with Google Drive
- User-friendly interface for managing household shopping
- Real-time data updates
- Secure, user-owned data storage

## Technical Stack

- **Framework**: Next.js 14.2.2 (App Router)
- **Language**: TypeScript (with some legacy JavaScript files)
- **Authentication**: NextAuth.js v5 (beta)
- **Styling**: Tailwind CSS
- **Data Storage**: Google Sheets via Google APIs
- **File Storage**: Google Drive API

## Project Scope

### In Scope

- Google authentication with Drive and Gmail scopes
- Product and category CRUD operations
- Shopping list management
- Historical data tracking
- Automatic Google Sheet creation and configuration
- Email notifications via Gmail API

### Out of Scope (Current Version)

- Multi-user collaboration
- Mobile native apps
- Offline mode
- Third-party integrations beyond Google ecosystem

## Success Metrics

1. Successful authentication with Google
2. Reliable data persistence in Google Sheets
3. Intuitive user interface for household management
4. Secure handling of user credentials
5. Fast page loads and responsive UI

## Key Constraints

- Requires Google account for authentication
- Depends on Google Drive and Sheets availability
- OAuth token refresh handling required for long sessions
- Single-user focused application
