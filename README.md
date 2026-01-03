# Jokiwi - Task Management App

A Next.js-based task management application built with React and Tailwind CSS.

## Running on GitHub Codespaces

This repository is configured to run on GitHub Codespaces. To get started:

1. Click the "Code" button on the GitHub repository
2. Select the "Codespaces" tab
3. Click "Create codespace on main" (or your desired branch)
4. Wait for the container to build and dependencies to install automatically
5. Once ready, run the development server:
   ```bash
   npm run dev
   ```
6. The app will be available at `http://localhost:3000`

The Codespace will automatically forward port 3000 and notify you when the dev server is running.

## Local Development

If you prefer to run the project locally:

### Prerequisites

- Node.js 20.x or higher
- npm

### Installation

```bash
# Install dependencies
npm install

# Run the development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm start` - Start the production server
- `npm run lint` - Run ESLint
- `npm run seed` - Seed the database with initial data

## Tech Stack

- **Framework**: Next.js 14
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **Icons**: React Icons
- **Database**: LowDB (JSON-based database)

## Project Structure

```
.
├── app/              # Next.js app directory (pages and API routes)
├── components/       # React components
├── lib/              # Utility functions and helpers
├── scripts/          # Database seeding and utility scripts
├── styles/           # Global styles
└── db.json           # JSON database file
```
