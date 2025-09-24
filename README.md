<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# LISA - Advanced AI Personal Assistant

A comprehensive AI-powered personal assistant with advanced features including multi-modal chat, document processing, code generation, and social authentication.

## ✨ Features

### Core Features
- 🤖 **AI Chat Assistant** - Powered by Google Gemini AI
- 🔐 **Authentication** - Email/password + Social OAuth (Google, GitHub, Microsoft)
- 💬 **Chat Management** - Persistent chat sessions with history
- 📄 **Document Processing** - PDF parsing and analysis
- 💻 **Code Generation** - AI-powered code assistance
- 🎨 **Modern UI** - Responsive design with dark/light mode

### Advanced Features
- 🔄 **Real-time Sync** - Persistent data with SQLite/PostgreSQL
- 📊 **Usage Analytics** - Track and monitor AI usage
- 🛡️ **Security** - JWT tokens, rate limiting, audit logging
- 🎯 **Performance** - Code splitting, lazy loading, React optimizations
- 📱 **PWA Ready** - Progressive Web App capabilities

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- yarn or npm

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd LISA
   yarn install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

3. **Initialize database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start development servers:**
   ```bash
   # Start both backend and frontend
   yarn dev:full
   
   # Or start separately:
   yarn server  # Backend (port 5000)
   yarn dev     # Frontend (port 5173)
   ```

5. **Open your browser:**
   ```
   http://localhost:5173
   ```

## 🔑 Configuration

### Required Environment Variables

```env
# AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Authentication
JWT_SECRET=your_super_secret_jwt_key

# Database
DATABASE_URL="file:./dev.db"

# Firebase (for social auth) - See SOCIAL_AUTH_SETUP.md
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
# ... (see .env.example for complete list)
```

### Social Authentication Setup

For detailed social authentication setup (Google, GitHub, Microsoft), see:
**📋 [SOCIAL_AUTH_SETUP.md](./SOCIAL_AUTH_SETUP.md)**

## 🏗️ Architecture

### Backend Stack
- **Runtime**: Node.js + Express.js
- **Database**: SQLite (dev) / PostgreSQL (prod) with Prisma ORM
- **Authentication**: JWT + Firebase Auth for social providers
- **AI**: Google Gemini API integration
- **Security**: Helmet, CORS, rate limiting

### Frontend Stack
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand + React Query
- **Styling**: Tailwind CSS + Custom design system
- **Animations**: Framer Motion
- **Auth**: Firebase SDK + custom JWT handling

### Database Schema
- **Users**: Authentication and profile data
- **ChatSessions**: Persistent chat history
- **SocialAccounts**: Multiple OAuth provider support
- **UsageStats**: AI usage tracking and analytics
- **Documents**: File storage and processing
- **AuditLogs**: Security and activity monitoring

## 📂 Project Structure

```
LISA/
├── src/
│   ├── components/         # React components
│   │   ├── auth/          # Authentication components
│   │   ├── chat/          # Chat interface
│   │   └── common/        # Reusable components
│   ├── config/            # Configuration files
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API and external services
│   ├── store/             # State management
│   └── utils/             # Utility functions
├── server/                # Backend API
├── prisma/                # Database schema and migrations
├── public/                # Static assets
└── docs/                  # Documentation
```

## 🧪 Testing

```bash
# Run tests (when implemented)
yarn test

# Type checking
yarn type-check

# Linting
yarn lint
```

## 🚀 Deployment

### Development
```bash
yarn dev:full
```

### Production Build
```bash
yarn build
yarn start
```

### Environment Setup
1. Set up production database (PostgreSQL recommended)
2. Configure environment variables for production
3. Set up Firebase project for social authentication
4. Deploy to your preferred hosting platform

## 📖 API Documentation

### Authentication Endpoints
- `POST /auth/login` - Email/password login
- `POST /auth/register` - User registration  
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/logout` - User logout

### Chat Endpoints
- `GET /api/chat/sessions` - Get user's chat sessions
- `POST /api/chat/sessions` - Create new chat session
- `POST /api/chat/message` - Send message to AI
- `DELETE /api/chat/sessions/:id` - Delete chat session

### User Endpoints
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/stats` - Get usage statistics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Google Gemini AI for the powerful language model
- Firebase for authentication services
- The open-source community for the amazing tools and libraries

---

**View your app in AI Studio**: https://ai.studio/apps/drive/17eKTbvWypv4foPuXda_-lgO_i8GyS2oO
