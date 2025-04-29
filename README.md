# NestJS Backend for Video Streaming and Subscription Service

A NestJS backend application that provides an API for managing video uploads, playback, user authentication, and subscription management.

## Features

- **Authentication & Authorization**
  - Integration with Clerk for user management
  - Protected routes and role-based access control

- **Video Management**
  - Generating one-time upload URLs from Cloudflare Stream's Direct Creator Upload API
  - Checking the status of uploaded videos
  - Managing videos for organizations
  - Handling Cloudflare Stream webhooks
  - **Organization-specific Cloudflare integration** - Each organization can use their own Cloudflare account

- **Subscription Management**
  - Integration with Stripe for payment processing
  - Subscription plans and billing management
  - Webhook handling for subscription events

- **Database Integration**
  - Prisma ORM for database operations
  - Type-safe database queries and migrations

## Technical Stack

- **Framework**: NestJS
- **Authentication**: Clerk
- **Video Streaming**: Cloudflare Stream
- **Payments**: Stripe
- **Database**: Prisma ORM
- **API Documentation**: Swagger/OpenAPI
- **Testing**: Jest
- **Code Quality**: ESLint, Prettier

## API Endpoints

### Authentication Endpoints
- User registration and login (handled by Clerk)
- Protected route verification

### Video API Endpoints
1. **Get Upload URL**: `POST /api/videos/get-upload-url`
   - Generates a direct upload URL from Cloudflare
   - Allows client-side uploading without going through your server

2. **Check Video Status**: `GET /api/videos/status/:videoId`
   - Retrieves the processing status of a video
   - Returns playback URLs when the video is ready to stream

3. **Get All Videos**: `GET /api/videos`
   - Lists all videos in your Cloudflare Stream account

4. **Get Video by UID**: `GET /api/videos/:uid`
   - Gets detailed information about a specific video

### Subscription Endpoints
- Subscription plan management
- Payment processing
- Subscription status checking
- Webhook handling for subscription events

## Configuration

The backend requires the following environment variables:

```
# Authentication
CLERK_SECRET_KEY=your_clerk_secret_key

# Video Streaming
CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token

# Payments
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Database
DATABASE_URL=your_database_url
```

## Development

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Docker (for local database)

### Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables
4. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```
5. Start the development server:
   ```bash
   npm run start:dev
   ```

### Available Scripts
- `npm run build`: Build the application
- `npm run start`: Start the application
- `npm run start:dev`: Start the application in development mode
- `npm run test`: Run tests
- `npm run test:watch`: Run tests in watch mode
- `npm run lint`: Run linter
- `npm run format`: Format code with Prettier

## Security Considerations

1. **Authentication**: Using Clerk for secure user authentication
2. **Direct Upload Security**: Cloudflare's direct upload URLs expire automatically
3. **Payment Security**: Stripe integration with webhook signature verification
4. **Rate Limiting**: Implementation includes rate limiting to prevent API abuse
5. **CORS Configuration**: CORS is properly configured to allow only specific origins

## Multi-tenant Cloudflare Integration

This application supports multi-tenant Cloudflare Stream integration, allowing each organization to use their own Cloudflare account:

### How It Works

1. **Default Credentials**: The application uses the default Cloudflare credentials from environment variables if an organization hasn't set up their own.

2. **Organization-specific Credentials**: Organizations can configure their own Cloudflare account ID and API token, which will be used for all their video operations.

3. **Credential Management API**: The following endpoints are available for managing organization Cloudflare credentials:
   - `POST /api/videos/organization/cloudflare-settings` - Update Cloudflare credentials
   - `GET /api/videos/organization/cloudflare-settings` - Get current Cloudflare settings
   - `POST /api/videos/organization/test-cloudflare` - Test Cloudflare connection

### Setting Up Organization Credentials

1. Create a Cloudflare account and obtain your Account ID
2. Create an API token with Stream permissions
3. Use the `/api/videos/organization/cloudflare-settings` endpoint to save your credentials
4. Test the connection with the `/api/videos/organization/test-cloudflare` endpoint

### Security Considerations

- API tokens are stored in the database and should be properly secured
- The API only returns masked account IDs to prevent sensitive information leaks
- Failed credential tests automatically clear invalid credentials

## Next Steps and Future Improvements

1. Implement comprehensive test coverage
2. Add support for video transformations through Cloudflare's API
3. Implement analytics for video views and user engagement
4. Add support for video playlists and categories
5. Implement caching for frequently accessed data
6. Add support for multiple payment gateways
7. Implement advanced subscription features (trial periods, coupons, etc.)
