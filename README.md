# Natural Products Management System Backend

This is a NestJS backend service for a multi-tenant product management system that integrates with Stripe for payments and Clerk for authentication.

## Features

- Multi-tenant architecture with organization-based data isolation
- Product management (CRUD operations)
- Stripe subscription and payment processing
- Authentication verification using Clerk tokens
- Role-based access control
- RESTful API endpoints
- PostgreSQL database with Prisma ORM
- API documentation with Swagger

## Tech Stack

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Stripe API
- Clerk Authentication
- Swagger for API documentation

## Prerequisites

- Node.js (v16+)
- PostgreSQL database
- Stripe account
- Clerk account

## Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start the development server
npm run start:dev
```

## API Documentation

Once the server is running, you can access the Swagger API documentation at:

```
http://localhost:3000/api/docs
```

## API Endpoints

### Authentication

- `POST /api/auth/verify` - Verify Clerk token and return user/organization info

### Products

- `GET /api/products` - Get all products for an organization
- `GET /api/products/:id` - Get a specific product
- `POST /api/products` - Create a new product
- `PUT /api/products/:id` - Update a product
- `DELETE /api/products/:id` - Delete a product

### Subscriptions

- `POST /api/subscriptions/create-checkout` - Create a Stripe checkout session
- `GET /api/subscriptions/:organizationId` - Get subscription details for an organization
- `POST /api/subscriptions/webhook` - Handle Stripe webhooks

## Stripe Webhook Setup

For local development with Stripe webhooks, you can use the Stripe CLI:

```bash
stripe listen --forward-to http://localhost:3000/api/subscriptions/webhook
```

## Testing

```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Run test coverage
npm run test:cov
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
