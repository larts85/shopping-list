# Shopping List

A Next.js web application for managing shopping lists using Google Drive and Google Sheets as a backend database.

## 🎯 Features

- **Google Authentication**: Secure OAuth 2.0 authentication with Google
- **Product Management**: Create, edit, and organize household products
- **Category System**: Organize products into customizable categories
- **Shopping Lists**: Build shopping lists with quantities, prices, and automatic calculations
- **Purchase History**: Track all purchases with historical data
- **Google Drive Integration**: All data stored in your own Google Drive
- **Data Sharing**: Share your logistics data with family members
- **Email Notifications**: Send notifications via Gmail

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Google account
- Google Cloud Project with OAuth 2.0 credentials

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/home-logistics.git
   cd home-logistics
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:

   ```env
   # Generate with: openssl rand -base64 32
   AUTH_SECRET=your-random-secret-here

   # Get from Google Cloud Console
   AUTH_GOOGLE_ID=your-google-client-id.apps.googleusercontent.com
   AUTH_GOOGLE_SECRET=your-google-client-secret
   ```

4. **Configure Google Cloud Console**

   See [GOOGLE_AUTH.md](./GOOGLE_AUTH.md) for detailed setup instructions.

5. **Run the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**

   Navigate to [http://localhost:2020](http://localhost:2020)

## 📖 Documentation

- **[Google Authentication Guide](./GOOGLE_AUTH.md)** - Complete guide for setting up Google OAuth
- **[Memory Bank](./memory-bank/)** - Architecture, patterns, and technical context
- **[API Documentation](#)** - Coming soon

## 🏗️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Components)
- **Language**: TypeScript
- **Authentication**: [NextAuth.js v5](https://next-auth.js.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **APIs**: Google Drive, Google Sheets, Gmail
- **Database**: Google Sheets (via googleapis and google-spreadsheet)

## 📁 Project Structure

```
home-logistics/
├── app/
│   ├── actions/          # Server actions for data operations
│   ├── api/             # API routes (NextAuth handlers)
│   ├── lib/             # Shared utilities and helpers
│   ├── logistic/        # Main application routes
│   │   ├── add/        # Add items to shopping list
│   │   ├── admin/      # Admin panel (categories, products)
│   │   └── data/       # Data sharing features
│   ├── ui/              # UI components
│   └── no-data/         # First-time setup page
├── memory-bank/         # Project documentation
├── utils/               # Utility functions
├── auth.ts              # NextAuth configuration
├── middleware.ts        # Next.js middleware
└── README.md
```

## 🔐 Security

- **OAuth 2.0**: Secure authentication with Google
- **Server-side API Calls**: All Google API calls made server-side
- **Encrypted Tokens**: Tokens stored in encrypted JWT cookies
- **No Client Exposure**: Credentials never exposed to client-side code
- **User-Owned Data**: All data stored in user's own Google Drive

See [GOOGLE_AUTH.md](./GOOGLE_AUTH.md) for security best practices.

## 🛠️ Development

### Available Scripts

```bash
npm run dev      # Start development server (port 2020)
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

### Environment Setup

1. Copy `.env.example` to `.env.local`
2. Fill in your Google OAuth credentials
3. Generate a random `AUTH_SECRET`

### Google Cloud Setup

Required APIs to enable:

- Google Drive API
- Google Sheets API
- Gmail API

Required OAuth Scopes:

- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/drive`
- `https://www.googleapis.com/auth/gmail.send`

See [GOOGLE_AUTH.md](./GOOGLE_AUTH.md) for step-by-step configuration.

## 📊 How It Works

### First-Time Setup

1. User signs in with Google
2. Application requests Drive and Gmail permissions
3. System creates `homeLogistic` folder in user's Google Drive
4. Creates `homeLogisticSheet` spreadsheet with 4 tabs:
   - **categories**: Product categories
   - **products**: Master product list
   - **list**: Current shopping list
   - **historical**: Purchase history

### Data Flow

```
User Action → Server Action → Google Session Auth → Google API → Google Sheets
```

All operations read/write directly to Google Sheets in the user's Drive.

## 🎨 Features in Detail

### Category Management

- Create, edit, and delete categories
- Organize products by category
- Visual category indicators

### Product Management

- Add products with category assignment
- Mark products as checked/unchecked
- Edit product details
- Delete products

### Shopping Lists

- Add products with quantity and price
- Automatic price calculations (quantity × price)
- Price per kg calculation for weight-based items
- Mark items as purchased
- View organized by categories

### Historical Tracking

- Automatic purchase history recording
- Track quantities, prices, and dates
- Budget analysis (coming soon)

### Data Sharing

- Share Google Drive folder with family
- Collaborative access to shopping data
- Email notifications

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables:
   - `AUTH_SECRET`
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`
4. Update Google Cloud Console:
   - Add production URL to authorized domains
   - Add callback URL: `https://yourdomain.com/api/auth/callback/google`
5. Deploy!

### Docker

```dockerfile
# Coming soon
```

### Traditional Node.js Hosting

```bash
npm run build
npm start
```

Ensure environment variables are set on your hosting platform.

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Use TypeScript for new files
- Follow existing code style
- Add tests for new features (when test suite is implemented)
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [NextAuth.js](https://next-auth.js.org/) - Authentication
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Google APIs](https://developers.google.com/) - Drive, Sheets, Gmail

## 📧 Support

For issues and questions:

- Open an issue on [GitHub Issues](https://github.com/yourusername/home-logistics/issues)
- Check [GOOGLE_AUTH.md](./GOOGLE_AUTH.md) for authentication help
- Review [memory-bank/](./memory-bank/) for technical details

## 🗺️ Roadmap

- [ ] Automated token refresh handling
- [ ] Comprehensive test suite
- [ ] Budget tracking and analytics
- [ ] Recipe integration
- [ ] Mobile app (React Native)
- [ ] Barcode scanning
- [ ] Dark mode
- [ ] Multi-language support
- [ ] Export functionality (PDF, CSV)
- [ ] Offline mode with sync

## 📊 Status

**Current Version**: 0.1.0 (Beta)

**Stability**: Functional, in active development

**Test Coverage**: Not yet implemented

---

Made with ❤️ for better household management
