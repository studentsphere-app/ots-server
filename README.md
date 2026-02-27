<div align="center">
  <img src="../ots-core/.github/assets/logo.png" alt="OTS Logo" width="350" />
  <h1>Open Timetable Scraper Server</h1>
</div>

The official server implementation for the Open Timetable Scraper (OTS).

This application serves as both the backend API and the frontend dashboard. It manages authentication, schedules scraping jobs via providers, stores timetable data, and exposes an API for other applications to consume.

## Features

- **Multi-Provider Support**: Seamlessly integrates with any OTS-compliant provider (like `@studentsphere/ots-provider-wigor`).
- **Automated Scraping**: Uses BullMQ and Redis to schedule and execute timetable scraping jobs in the background.
- **User Authentication**: Secure authentication via Better Auth.
- **Modern Dashboard**: React + Vite frontend for managing your schedules and settings.
- **REST API**: Exposes timetable data for third-party integrations.

## Development

### Prerequisites

- Node.js 20+
- pnpm
- Redis (required for job queues)

### Installation

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone https://github.com/studentsphere-app/ots-server.git
   cd ots-server
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure Environment**:
   Copy the example environment file and fill in your details:
   ```bash
   cp .env.example .env
   ```

   Make sure your Redis instance is running and reachable via `REDIS_URL`.

4. **Run the Development Server**:
   This command starts both the Express API and the Vite frontend dev server.
   ```bash
   pnpm run dev
   ```

## Self-Hosting

You can easily host your own instance of the OTS Server using Docker and Docker Compose. This is the recommended method for production.

### Prerequisites

- Docker
- Docker Compose

### Quick Start with Docker Compose

1. **Create a directory** for your instance and create a `docker-compose.yml` file:

   ```yaml
   services:
     app:
       image: ghcr.io/studentsphere-app/ots-server:latest # Or build locally
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
         - DATABASE_URL=file:/data/database.db
         - REDIS_URL=redis://redis:6379
         # Security Secrets (Generate strong random strings for these!)
         - BETTER_AUTH_SECRET=your_super_secure_random_string
         - ENCRYPTION_KEY=32_byte_long_random_string_exactly
         
         # URLs (Change these to your domain in production)
         - BETTER_AUTH_URL=http://localhost:3000
         - FRONTEND_URL=http://localhost:3000
         
         # Email Configuration (Optional but recommended)
         - SMTP_HOST=smtp.example.com
         - SMTP_PORT=587
         - SMTP_USER=your_user
         - SMTP_PASS=your_password
         - EMAIL_FROM="OTS Server <noreply@example.com>"
       volumes:
         - ots_data:/data
       depends_on:
         - redis
       restart: unless-stopped

     redis:
       image: redis:alpine
       volumes:
         - redis_data:/data
       restart: unless-stopped

   volumes:
     ots_data:
     redis_data:
   ```

   > **Note**: If you are building from source, you can use the `docker-compose.yml` provided in this repository.

2. **Start the services**:
   ```bash
   docker-compose up -d
   ```

3. **Access the Dashboard**:
   Open your browser and navigate to `http://localhost:3000` (or your configured domain).

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | The port the server listens on | `3000` |
| `DATABASE_URL` | Connection string for the database (SQLite by default) | `file:/data/database.db` |
| `REDIS_URL` | Connection string for Redis | `redis://redis:6379` |
| `BETTER_AUTH_SECRET` | **Required**. Secret key for session signing | - |
| `ENCRYPTION_KEY` | **Required**. 32-byte key for encrypting credentials | - |
| `BETTER_AUTH_URL` | The full URL where the auth server is reachable | `http://localhost:3000` |
| `FRONTEND_URL` | The full URL where the frontend is reachable | `http://localhost:3000` |
| `SMTP_HOST` | SMTP server host for sending emails | `localhost` |
| `SMTP_PORT` | SMTP server port | `1025` |
| `SMTP_USER` | SMTP username | - |
| `SMTP_PASS` | SMTP password | - |

## License

MIT
