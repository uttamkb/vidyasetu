# VidyaSetu - Learning Platform for Class 9 & 10

A comprehensive learning management system built with modern web technologies, designed to help students track assignments, study materials, and progress analytics.

## 🚀 Features

- **📚 Assignment Management**: Weekly assignments with MCQs, short answers, and long answers
- **📖 Study Materials**: Curated notes, videos, PDFs, and practice materials
- **📊 Progress Tracking**: Visual analytics with charts, streaks, and subject-wise insights
- **🎯 Gamification**: Badges, points, and achievements to motivate learning
- **🔐 Authentication**: Secure login with Google OAuth
- **📱 Responsive Design**: Works seamlessly on desktop and mobile devices
- **⚡ Modern Stack**: Built with Next.js 16, React 19, and TypeScript

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Recharts** - Data visualization library

### Backend & Database
- **NextAuth.js** - Authentication framework
- **Prisma** - Database ORM
- **Neon PostgreSQL** - Serverless database
- **Prisma Accelerate** - Database connection pooling

### Development & Testing
- **Vitest** - Fast unit testing framework
- **React Testing Library** - Component testing utilities
- **ESLint** - Code linting
- **TypeScript** - Type checking

## 📁 Project Structure

```
vidyasetu/
├── .clinerules/           # AI assistant rules and skills
├── docs/                  # Documentation
├── prisma/                # Database schema and migrations
├── public/                # Static assets
├── src/
│   ├── app/               # Next.js app router pages
│   │   ├── (dashboard)/   # Protected dashboard routes
│   │   ├── api/           # API routes
│   │   └── login/         # Authentication page
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # Base UI components (Radix)
│   │   └── navbar.tsx    # Navigation component
│   ├── lib/              # Utility libraries
│   │   ├── auth.ts       # Authentication configuration
│   │   ├── db.ts         # Database connection
│   │   └── utils.ts      # Helper functions
│   ├── services/         # Business logic services
│   ├── types/            # TypeScript type definitions
│   └── middleware.ts     # Next.js middleware
├── vitest.config.ts      # Test configuration
├── vitest.setup.ts       # Test setup
└── package.json          # Dependencies and scripts
```

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** - JavaScript runtime
- **Git** - Version control
- **Neon PostgreSQL** - Database (sign up at [neon.tech](https://neon.tech))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/uttamkb/vidyasetu.git
   cd vidyasetu
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:

   ```env
   # Database
   DATABASE_URL="your_neon_database_url"

   # Authentication
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key"

   # Google OAuth
   AUTH_GOOGLE_ID="your-google-client-id"
   AUTH_GOOGLE_SECRET="your-google-client-secret"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npx prisma generate

   # Run database migrations
   npx prisma db push

   # Seed the database
   npm run seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🧪 Testing

### Run Unit Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run coverage
```

### Test Coverage Threshold
- **Statements**: 90%
- **Branches**: 90%
- **Functions**: 90%
- **Lines**: 90%

## 📜 Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run seed         # Seed database with initial data

# Testing
npm test             # Run unit tests
npm run coverage     # Run tests with coverage report

# Code Quality
npm run lint         # Run ESLint
```

## 🔧 Development Tools Compatibility

This project is designed to work seamlessly with various development tools and IDEs:

### Antigravity
- Full TypeScript support with proper type definitions
- Comprehensive test coverage for reliable development
- Well-structured component architecture
- Clear separation of concerns

### Codex IDE
- Modern Next.js 16 with App Router
- Extensive documentation in `/docs` folder
- Standardized coding patterns and conventions
- Automated testing setup

### VS Code Extensions
Recommended extensions for optimal development experience:
- **TypeScript Importer** - Auto import TypeScript symbols
- **Tailwind CSS IntelliSense** - CSS class autocompletion
- **Prisma** - Database schema support
- **ESLint** - Code linting
- **Prettier** - Code formatting

## 📚 Documentation

Detailed documentation is available in the `/docs` folder:

- [API Contracts](./docs/api-contracts.md) - API endpoint specifications
- [Architecture](./docs/architecture.md) - System architecture overview
- [Database Schema](./docs/db-schema.md) - Database design and relationships
- [Coding Standards](./docs/coding-standards.md) - Code style and conventions
- [Product Specification](./docs/product-spec.md) - Feature requirements
- [UI Patterns](./docs/ui-patterns.md) - Design system guidelines

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [Neon](https://neon.tech/) - Serverless PostgreSQL
- [Radix UI](https://www.radix-ui.com/) - Component primitives
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [Prisma](https://prisma.io/) - Database toolkit

---

Built with ❤️ for students, by developers who care about education.
