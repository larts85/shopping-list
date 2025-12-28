# Product Context: Home Logistics

## Why This Project Exists

Home Logistics solves the common problem of managing household shopping and inventory. Traditional methods (paper lists, notes apps) lack structure and historical tracking. This application provides a structured, organized way to manage household logistics while leveraging Google's ecosystem for data storage and accessibility.

## Problems It Solves

1. **Disorganized Shopping Lists**: Provides structured list management with categories
2. **Price Tracking**: Records prices and calculates totals automatically
3. **Historical Data Loss**: Maintains purchase history for budgeting and planning
4. **Data Accessibility**: Stores data in user's Google Drive for easy access and backup
5. **Product Management**: Maintains a master list of products with categories

## How It Works

### User Journey

1. **First Time Setup**

   - User signs in with Google account
   - Application requests Drive and Gmail permissions
   - System creates "homeLogistic" folder in Google Drive
   - Creates "homeLogisticSheet" spreadsheet with 4 tabs:
     - `categories`: Product categories
     - `products`: Master product list
     - `list`: Current shopping list
     - `historical`: Purchase history

2. **Daily Usage**

   - Sign in to access dashboard
   - Add/edit products and categories
   - Create shopping lists with quantities and prices
   - Mark items as purchased
   - View historical purchase data
   - Share folder access via email

3. **Data Flow**
   - All operations read/write directly to Google Sheets
   - OAuth access tokens authenticate API requests
   - Server-side actions handle all Google API calls
   - Real-time synchronization with Google Drive

## User Experience Goals

### Simplicity

- One-click Google sign-in
- Intuitive navigation between sections
- Clear visual hierarchy

### Reliability

- Automatic data persistence
- Error handling with user feedback
- Session management with token refresh

### Performance

- Fast page loads with Server Components
- Optimistic UI updates where appropriate
- Efficient API calls to Google services

### Security

- Secure OAuth 2.0 flow
- Server-side API calls only
- No client-side credential exposure
- User-owned data in their Google Drive

## Key Features

### Admin Panel

- **Categories**: Add, edit, delete product categories
- **Products**: Manage master product list with category assignment

### Shopping Lists

- Add products with quantity, price, and units
- Calculate totals automatically (price × quantity)
- Calculate price per kg for weight-based items
- Mark items as purchased
- Move purchased items to historical data

### Data Sharing

- Share Google Drive folder with other users
- Collaborative access to shopping data
- Email notifications via Gmail API

## Future Considerations

- Multi-language support
- Budget tracking and analytics
- Recipe integration
- Barcode scanning
- Mobile app version
- Offline sync capabilities
