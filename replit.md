# Northstar Goal Achievement App

## Overview

Northstar is a goal management and achievement tracking application designed to help users set meaningful goals and create actionable roadmaps to achieve them. The application combines AI-powered planning with daily check-ins and progress tracking to guide users through their goal achievement journey.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with custom design system
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript throughout the entire stack
- **API**: RESTful API design with JSON responses
- **Authentication**: Replit Auth with OpenID Connect (OIDC)
- **Session Management**: Express sessions with PostgreSQL storage

### Database Architecture
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema changes
- **Connection**: Connection pooling via @neondatabase/serverless

## Key Components

### Authentication System
- Implements Replit Auth for seamless authentication in the Replit environment
- Uses Passport.js strategy for OIDC integration
- Session-based authentication with PostgreSQL session storage
- User profile management with Stripe integration for subscriptions

### Goal Management System
- Goal creation with AI-assisted planning
- Milestone breakdown for complex goals
- Action item tracking for detailed progress
- Timeline management (3 months, 6 months, 1 year, custom)
- Goal status tracking (active, completed, paused)

### AI Planning Integration
- OpenAI GPT integration for intelligent goal planning
- Automated milestone and action generation
- Context-aware suggestions based on goal content
- Custom prompting for different goal types

### Daily Check-in System
- Morning intention setting with timezone-aware 10am reminders
- Action selection for daily focus
- Evening reflection and accomplishment tracking with 8pm reminders
- Progress visualization and habit building
- Celebration animations with streak tracking
- Enhanced daily journal for goal review

### Payment Integration
- Stripe integration for subscription management
- Premium feature gating
- Customer and subscription tracking
- Payment processing with Stripe Elements

## Data Flow

### Goal Creation Flow
1. User inputs goal description
2. AI processes goal and suggests milestones
3. User reviews and customizes the plan
4. System creates goal, milestones, and actions in database
5. User can begin tracking progress

### Daily Check-in Flow
1. Morning: User sets intention and selects focus action
2. System tracks selected action for the day
3. Evening: User reflects on accomplishment
4. Progress is updated across related milestones and goals

### Progress Tracking Flow
1. Users mark actions and milestones as complete
2. System calculates goal progress percentages
3. Progress is visualized across different views
4. Completion triggers celebration and next milestone focus

## External Dependencies

### Core Infrastructure
- **Replit Environment**: Hosting and development platform
- **Neon Database**: Serverless PostgreSQL hosting
- **OpenAI API**: GPT-4 for AI planning features
- **Stripe**: Payment processing and subscription management

### Third-party Services
- **Replit Auth**: Authentication provider
- **Vite**: Build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives

### Key Libraries
- **TanStack Query**: Server state management
- **Drizzle ORM**: Type-safe database operations
- **Zod**: Runtime type validation
- **React Hook Form**: Form handling
- **Wouter**: Lightweight routing

## Deployment Strategy

### Development Environment
- Runs on Replit with hot module replacement
- Vite dev server for frontend with Express backend
- PostgreSQL database provisioned through Replit
- Environment variables managed through Replit secrets

### Production Deployment
- **Build Process**: Vite builds frontend, esbuild bundles backend
- **Deployment Target**: Replit Autoscale for automatic scaling
- **Static Assets**: Served through Express with proper caching
- **Database**: Production PostgreSQL through Neon
- **Environment**: Production-specific configuration

### Build Configuration
- Frontend builds to `dist/public` directory
- Backend bundles to `dist/index.js` as ESM module
- Static file serving configured for production
- Source maps and development tools excluded from production builds

## Changelog

```
Changelog:
- June 17, 2025. Initial setup
- June 17, 2025. Added celebration animation system with streak tracking for daily check-ins
- June 17, 2025. Implemented timezone-aware notification system for 10am and 8pm reminders
- June 17, 2025. Added daily journal tracking with goal review capabilities and progress metrics
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
Color scheme: Wellness & Mindfulness theme with soft indigo primary (#5C7AEA), sky blue accent (#A3D5FF), and light background (#F1F5F9) for a soothing, calming interface.
```