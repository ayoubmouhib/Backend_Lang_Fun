# Lang Fun — Backend API

Backend API for **Lang Fun**, a language-exchange and learning platform. It connects learners who speak different native languages, matches them for live conversation practice (text, audio, and video), and gamifies the learning process with vocabulary, quizzes, and word games.

Built with [NestJS](https://nestjs.com/), [TypeORM](https://typeorm.io/) (MySQL), WebSockets, and [LiveKit](https://livekit.io/) for real-time audio/video.

## Features

- **Authentication** — email/password signup & login, email verification, password reset, refresh tokens, and Google OAuth login (JWT-based).
- **User profiles** — profile pictures, interests, languages spoken/learning, public profiles, search, and leaderboard.
- **Language exchange matching** — a compatibility-scoring algorithm that pairs users based on native/learning languages, proficiency level, mutual benefit, shared interests, timezone, and ratings. Supports active search, pending requests, accept/reject, and matching preferences.
- **Conversations & messaging** — 1:1 conversations created from matches, with messages, edits, deletions, reactions, pinned messages, read/unread tracking, and online presence.
- **Audio/video calls** — call initiation, accept/reject/end, quality metrics, and call history, powered by LiveKit room tokens.
- **Real-time gateway** — WebSocket gateway (JWT-authenticated) for live notifications, conversation rooms, and presence.
- **Follow system** — follow requests, accept/decline, followers/following lists.
- **Vocabulary builder** — personal vocabulary entries with translations, examples, and audio attachments.
- **Quizzes & games** — language quizzes (with question bank, instances, answers, and results) and word games with session tracking and history.
- **Blocking & reporting** — block/unblock users, list blockers/blocked users, and report conversations.
- **Seed data** — languages, interests, game words, and quiz content are seeded automatically on startup.

## Tech Stack

- [NestJS 11](https://nestjs.com/) (Express platform)
- [TypeORM](https://typeorm.io/) with MySQL (`mysql2`)
- [JWT](https://github.com/nestjs/jwt) authentication + [Passport](http://www.passportjs.org/) (Google OAuth 2.0)
- WebSockets via `@nestjs/platform-ws`
- [LiveKit Server SDK](https://docs.livekit.io/) for audio/video calls
- [Nodemailer](https://nodemailer.com/) for transactional emails
- [class-validator](https://github.com/typestack/class-validator) / [class-transformer](https://github.com/typestack/class-transformer) for request validation
- [Jest](https://jestjs.io/) for unit and e2e testing

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- A running [MySQL](https://www.mysql.com/) server
- (Optional) A [LiveKit](https://livekit.io/) server for audio/video calls
- (Optional) Google OAuth credentials for Google login

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
# JWT
JWT_SECRET=your-strong-jwt-secret
JWT_EXPIRATION=24h

# Mail (used for verification & password reset emails)
MAIL_USER=your-mail-user
MAIL_PASS=your-mail-password

# Google OAuth (for "Sign in with Google")
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_SECRET=your-google-client-secret

# LiveKit (for audio/video calls)
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret
LIVEKIT_URL=ws://localhost:7880

# Server
PORT=3000
```

### 3. Configure the database

Database connection settings (host, port, username, password, database name) are currently defined in [`src/app.module.ts`](src/app.module.ts). By default it expects a local MySQL instance:

- Host: `localhost`
- Port: `3306`
- Username: `root`
- Password: *(empty)*
- Database: `FlutterProject`

Create the database (the schema is auto-synced on startup via TypeORM `synchronize: true`, which is intended for development only):

```sql
CREATE DATABASE FlutterProject;
```

### 4. Run the project

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run build
npm run start:prod
```

On startup, the app automatically seeds languages, interests, game words, and quiz content.

## Running Tests

```bash
# unit tests
npm run test

# end-to-end tests
npm run test:e2e

# test coverage
npm run test:cov
```

There's also a manual end-to-end matching flow script:

```bash
./test-matching.sh
```

This script signs up two users with complementary native/learning languages and walks through the full matching flow against a locally running server (`http://localhost:3000`).

## API Overview

All endpoints are prefixed with their module's base route. Most routes require a `Bearer <jwt>` access token (obtained via `/auth/login` or `/auth/signup`).

| Module | Base route | Description |
|---|---|---|
| Auth | `/auth` | Signup, login, refresh, password reset, email verification, Google login |
| Users | `/user` | Profiles, languages, search, leaderboard, profile pictures |
| Languages | `/languages` | CRUD for supported languages |
| Interests | `/interests` | Browse and manage user interests |
| Matching | `/matching` | Find exchange partners, manage requests & sessions, ratings |
| Conversations | `/conversations` | Messages, reactions, pinned messages, calls |
| Follows | `/follows` | Follow requests, followers/following |
| Vocabulary | `/vocabulary` | Personal vocabulary entries with audio |
| Quiz | `/quiz` | Language quizzes and results |
| Games | `/games` | Word games, sessions, and history |
| Blocked users | `/blocked-users` | Block/unblock users |

A WebSocket gateway (JWT-authenticated via `?token=` query param) handles real-time events such as conversation room join/leave and presence updates.

## Project Structure

```
src/
├── auth/           # Authentication (JWT, Google OAuth, email verification)
├── user/           # User profiles & language progress
├── languages/      # Supported languages
├── interests/      # User interests
├── matching/       # Matching algorithm, requests, sessions, ratings, blocking
├── conversation/    # Conversations, messages, calls
├── follows/        # Follow/follower system
├── vocabulary/     # Personal vocabulary entries
├── quiz/           # Quizzes, question bank, results
├── games/          # Word games & sessions
├── gateway/        # WebSocket gateway for real-time events
├── livekit/        # LiveKit token generation for audio/video calls
├── services/       # Shared services (mail, etc.)
├── seeds/          # Startup seed data (languages, interests, quiz, games)
└── config/         # App configuration
```

## License

This project is [MIT licensed](LICENSE).
