# Northstar - AI-Powered Goal Achievement Platform

A mobile-first goal management application that transforms abstract objectives into structured, actionable roadmaps using AI-powered planning and daily accountability systems.

## Features

- **AI-Powered Goal Planning** - OpenAI integration breaks down complex goals into achievable milestones
- **Daily Check-in System** - Morning intention setting and evening reflection with streak tracking
- **Smart Notifications** - Timezone-aware reminders at 10am and 8pm
- **Progress Tracking** - Visual progress indicators and goal completion analytics
- **Journal Integration** - Daily reflections tied to goal progress
- **Subscription Management** - Stripe integration for premium features

## Tech Stack

### Frontend
- React 18 with TypeScript
- Wouter for routing
- TanStack Query for state management
- Radix UI + shadcn/ui components
- Tailwind CSS for styling
- Vite for build tooling

### Backend
- Node.js with Express
- TypeScript throughout
- Replit Auth with OpenID Connect
- PostgreSQL with Drizzle ORM
- OpenAI GPT-4o integration
- Stripe payment processing

## Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- OpenAI API key
- Stripe API keys (for payments)

### Environment Variables
```
DATABASE_URL=your_postgresql_connection_string
OPENAI_API_KEY=your_openai_api_key
STRIPE_SECRET_KEY=your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
SESSION_SECRET=your_session_secret
```

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/northstar-app.git
cd northstar-app
```

2. Install dependencies
```bash
npm install
```

3. Set up the database
```bash
npm run db:push
```

4. Start the development server
```bash
npm run dev
```

The app will be available at `http://localhost:5000`

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:push` - Push database schema changes
- `npm run db:studio` - Open Drizzle Studio for database management

## Project Structure

```
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utilities and configs
├── server/              # Express backend
│   ├── db.ts           # Database connection
│   ├── routes.ts       # API routes
│   ├── storage.ts      # Data access layer
│   └── replitAuth.ts   # Authentication setup
├── shared/             # Shared types and schemas
│   └── schema.ts       # Drizzle database schema
└── replit.md          # Project documentation
```

## Core Features

### Goal Management
- Create goals with AI-generated milestone breakdowns
- Track progress across multiple timeframes (3 months to 2+ years)
- Edit and customize AI-generated plans
- Archive completed or abandoned goals

### Daily Check-ins
- Morning intention setting with action selection
- Evening reflection and accomplishment tracking
- Streak counting with celebration animations
- Integration with goal milestones

### Progress Visualization
- Real-time progress calculations
- Visual progress indicators
- Historical tracking and analytics
- Goal completion celebrations

## API Endpoints

### Goals
- `GET /api/goals` - Get user's goals
- `POST /api/goals` - Create new goal
- `PUT /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal

### Check-ins
- `GET /api/checkins/today` - Get today's check-in
- `POST /api/checkins` - Create check-in
- `PUT /api/checkins/:id` - Update check-in

### Journal
- `GET /api/journal/entries` - Get journal entries
- `POST /api/journal/entries` - Create journal entry

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Roadmap

### Phase 1 - Security & Polish
- [ ] Prompt injection protection
- [ ] Enhanced onboarding flow
- [ ] Mobile navigation improvements
- [ ] Goal editing capabilities

### Phase 2 - Enhanced Features
- [ ] Time estimation for actions
- [ ] Photo progress tracking
- [ ] Achievement system
- [ ] Social features

### Phase 3 - Scale & Optimization
- [ ] PWA conversion
- [ ] Advanced analytics
- [ ] Team collaboration features
- [ ] Mobile app development

## Support

For support, email support@northstar-app.com or open an issue in this repository.