# NestJS Backend with Clerk Authentication

A comprehensive NestJS backend API with multi-tenant architecture, integrated with Clerk for secure authentication and user management.

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Authentication System](#authentication-system)
- [Design Patterns](#design-patterns)
- [Project Structure](#project-structure)
- [Key Components](#key-components)
- [Setup & Installation](#setup--installation)
- [Environment Configuration](#environment-configuration)
- [API Endpoints](#api-endpoints)
- [Testing the Authentication](#testing-the-authentication)
- [Frontend Integration](#frontend-integration)
- [Security Considerations](#security-considerations)
- [Known Issues and Limitations](#known-issues-and-limitations)

## Project Overview

This backend service provides a secure API for videos on-demand with multi-tenant (organization-based) architecture. It uses Clerk for authentication, Stripe for payment processing, and Prisma ORM for database interaction. The API follows RESTful principles and is fully documented with Swagger.

### Key Features

- **Secure Authentication**: JWT-based authentication with Clerk
- **Multi-tenant Architecture**: Organization-based data isolation
- **Role-based Access Control**: Differentiated permissions based on user roles
- **RESTful API**: Well-structured endpoints following REST principles
- **API Documentation**: Auto-generated with Swagger
- **Database Integration**: Using Prisma ORM with PostgreSQL
- **Stripe Integration**: Payment processing for subscriptions

## Architecture

This application follows a modular, layered architecture based on NestJS best practices:

1. **Controller Layer**: Handles HTTP requests and responses
2. **Service Layer**: Contains business logic
3. **Repository Layer**: Handles data access (via Prisma)
4. **Guard Layer**: Manages authentication and authorization
5. **Module Layer**: Organizes related components

### High-Level Flow

1. Client sends a request with a Clerk JWT token in the Authorization header
2. Auth Guard intercepts the request and verifies the token with Clerk
3. Upon verification, user information is attached to the request
4. The request proceeds to the appropriate controller
5. Controller delegates to services for business logic
6. Service layer interacts with the database via Prisma
7. Response is returned to the client 

## Authentication System

The authentication system uses Clerk for token verification and user management, with Passport.js for authentication strategies integration. It follows these principles:

### Authentication Flow

1. **Frontend Authentication**: Users authenticate via Clerk on the frontend
2. **Token Transmission**: Frontend sends the JWT in the Authorization header
3. **Token Verification**: Backend verifies the token with Clerk
4. **User Retrieval**: After verification, user data is fetched from database
5. **Request Enhancement**: User and organization data are attached to the request
6. **Access Control**: Guards ensure proper authorization for protected resources

### Implementation Details

#### Clerk Strategy (`src/auth/strategies/clerk.strategy.ts`)

The `ClerkStrategy` extends Passport's `Strategy` to verify tokens with Clerk:

```typescript
@Injectable()
export class ClerkStrategy extends PassportStrategy(Strategy, 'clerk') {
  constructor(
    @Inject('ClerkClient')
    private readonly clerkClient: ClerkClient,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async validate(req: any): Promise<any> {
    // Extract token from Authorization header
    const token = req.headers.authorization?.split(' ').pop();

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Verify token with Clerk
      const tokenPayload = await verifyToken(token, {
        secretKey: this.configService.get('CLERK_SECRET_KEY'),
      });

      // Get user details from Clerk
      const user = await this.clerkClient.users.getUser(tokenPayload.sub);
      
      // Return structured user object
      return {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: tokenPayload.org_id,
        claims: tokenPayload,
      };
    } catch (error) {
      console.error('Token verification failed:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
```

#### Auth Service (`src/auth/auth.service.ts`)

The `AuthService` provides methods for token verification and user/organization management:

```typescript
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Inject('ClerkClient') private clerkClient: ClerkClient,
  ) {}

  async verifyToken(token: string): Promise<ClerkVerificationResponse | null> {
    try {
      // Verify token with Clerk API
      const tokenPayload = await verifyToken(token, {
        secretKey: this.configService.get('CLERK_SECRET_KEY'),
      });

      // Get user details from Clerk
      const clerkUser = await this.clerkClient.users.getUser(tokenPayload.sub);

      // Extract organization info if available
      let organizationId, organizationName, role;
      if (tokenPayload.org_id) {
        organizationId = tokenPayload.org_id;
        
        try {
          const org = await this.clerkClient.organizations.getOrganization({
            organizationId: tokenPayload.org_id,
          });
          organizationName = org.name;
          
          // Get the user's role in the organization
          const membershipsResponse = await this.clerkClient.organizations.getOrganizationMembershipList({
            organizationId: tokenPayload.org_id,
          });
          
          const userMembership = membershipsResponse.data.find(
            membership => membership.publicUserData?.userId === tokenPayload.sub
          );
          role = userMembership?.role;
        } catch (error) {
          console.error('Error fetching organization details:', error);
        }
      }

      return {
        userId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        organizationId,
        organizationName,
        role,
      };
    } catch (error) {
      console.error('Error verifying token:', error);
      return null;
    }
  }

  // Methods for user and organization management
  async getOrCreateUser(clerkId: string, email: string): Promise<User> {
    let user = await this.prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          clerkId,
          email,
        },
      });
    }

    return user;
  }

  async getOrCreateOrganization(
    clerkOrgId: string, 
    name: string, 
    userId: string, 
    role: string
  ): Promise<Organization> {
    // Implementation details for organization management
  }
}
```

#### Auth Guard (`src/auth/guards/auth.guard.ts`)

The `AuthGuard` protects routes and handles token verification:

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Extract and verify token
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token is missing');
    }

    try {
      // Verify token and get user data
      const verificationResult = await this.authService.verifyToken(token);
      
      if (!verificationResult) {
        throw new UnauthorizedException('Invalid authentication token');
      }

      // Get or create user in database
      const user = await this.authService.getOrCreateUser(
        verificationResult.userId,
        verificationResult.email,
      );

      // Handle organization data if present
      if (verificationResult.organizationId && verificationResult.organizationName) {
        const organization = await this.authService.getOrCreateOrganization(
          verificationResult.organizationId,
          verificationResult.organizationName,
          user.id,
          verificationResult.role || 'member',
        );

        // Set organization context for the request
        request['organization'] = organization;
      }

      // Set user context for the request
      request['user'] = user;
      
      return true;
    } catch (error) {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

#### Public Decorator (`src/auth/decorators/public.decorator.ts`)

The `Public` decorator marks routes as publicly accessible:

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

#### Clerk Client Provider (`src/providers/clerk-client.provider.ts`)

The `ClerkClientProvider` initializes the Clerk client:

```typescript
import { ClerkClient, createClerkClient } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';

export const ClerkClientProvider = {
  provide: 'ClerkClient',
  useFactory: (configService: ConfigService) => {
    const secretKey = configService.get<string>('CLERK_SECRET_KEY');
    
    if (!secretKey) {
      throw new Error('CLERK_SECRET_KEY is not defined in environment variables');
    }
    
    return createClerkClient({
      secretKey,
    });
  },
  inject: [ConfigService],
};
```

## Design Patterns

This project implements several design patterns and architectural principles:

### 1. Dependency Injection

NestJS uses a robust dependency injection system that helps with:
- Loose coupling between components
- Better testability through mocking
- Simplified management of component lifecycles

Example:

```typescript
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Inject('ClerkClient') private clerkClient: ClerkClient,
  ) {}
}
```

### 2. Repository Pattern

The application uses Prisma as an implementation of the repository pattern, which:
- Abstracts data access logic
- Provides a clean interface for database operations
- Allows for easy switching of data sources

Example:

```typescript
async getOrCreateUser(clerkId: string, email: string): Promise<User> {
  let user = await this.prisma.user.findUnique({
    where: { clerkId },
  });

  if (!user) {
    user = await this.prisma.user.create({
      data: { clerkId, email },
    });
  }

  return user;
}
```

### 3. Strategy Pattern

The authentication system uses the Strategy pattern via Passport.js, which:
- Encapsulates authentication algorithms
- Makes authentication methods interchangeable
- Allows for adding new strategies without changing existing code

Example:

```typescript
export class ClerkStrategy extends PassportStrategy(Strategy, 'clerk') {
  // Implementation details
}
```

### 4. Factory Pattern

The Clerk client is created using a factory pattern, which:
- Centralizes complex object creation
- Handles initialization logic and error handling
- Makes configuration changes easier to implement

Example:

```typescript
export const ClerkClientProvider = {
  provide: 'ClerkClient',
  useFactory: (configService: ConfigService) => {
    const secretKey = configService.get<string>('CLERK_SECRET_KEY');
    
    if (!secretKey) {
      throw new Error('CLERK_SECRET_KEY is not defined');
    }
    
    return createClerkClient({ secretKey });
  },
  inject: [ConfigService],
};
```

### 5. Decorator Pattern

Custom decorators are used for route protection, which:
- Adds functionality to routes without modifying their code
- Makes code more readable and maintainable
- Encourages reuse of cross-cutting concerns

Example:

```typescript
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Usage
@Public()
@Get('health')
healthCheck() {
  return { status: 'ok' };
}
```

### 6. Guard Pattern

Guards protect routes based on conditions, which:
- Centralizes authorization logic
- Separates business logic from authorization concerns
- Provides a consistent approach to route protection

Example:

```typescript
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Implementation details
  }
}
```

### 7. Module Pattern

The application is organized into cohesive modules, which:
- Encapsulates related functionality
- Makes the codebase more maintainable
- Facilitates code reuse and testing

Example:

```typescript
@Module({
  imports: [PassportModule, ConfigModule],
  providers: [
    AuthService,
    ClerkStrategy,
    ClerkClientProvider,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

### 8. Middleware Pattern

Middleware functions process requests before they reach route handlers:
- Helps chain request processing
- Allows for cross-cutting concerns like logging
- Can short-circuit request handling

Example:

```typescript
@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`Request to ${req.url}`);
    next();
  }
}
```

## Project Structure

```
src/
├── auth/                  # Authentication module
│   ├── controllers/       # Auth-related controllers
│   ├── decorators/        # Custom decorators (e.g., @Public())
│   ├── dto/               # Data Transfer Objects
│   ├── guards/            # Authentication guards
│   ├── interfaces/        # TypeScript interfaces
│   ├── strategies/        # Passport strategies
│   ├── auth.module.ts     # Auth module definition
│   └── auth.service.ts    # Auth business logic
├── providers/             # Custom providers
│   └── clerk-client.provider.ts  # Clerk client provider
├── prisma/                # Prisma ORM configuration
│   ├── schema.prisma      # Database schema
│   └── prisma.service.ts  # Prisma service
├── products/              # Products module
├── subscriptions/         # Subscriptions module with Stripe integration
├── app.module.ts          # Root application module
└── main.ts                # Application entry point
```

## Key Components

### Auth Module (`src/auth/auth.module.ts`)

The Auth module organizes authentication-related components:

```typescript
@Module({
  imports: [
    PassportModule,
    ConfigModule,
  ],
  providers: [
    AuthService,
    ClerkStrategy,
    ClerkClientProvider,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
```

### Auth Controller (`src/auth/auth.controller.ts`)

The Auth controller exposes authentication endpoints:

```typescript
@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('verify')
  @ApiOperation({ summary: 'Verify a Clerk JWT token' })
  async verifyToken(@Body() verifyTokenDto: VerifyTokenDto) {
    const verification = await this.authService.verifyToken(verifyTokenDto.token);
    
    if (!verification) {
      return { success: false, message: 'Invalid token' };
    }

    return {
      success: true,
      user: {
        id: verification.userId,
        email: verification.email,
      },
      organization: verification.organizationId
        ? {
            id: verification.organizationId,
            name: verification.organizationName,
          }
        : null,
      role: verification.role,
    };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authenticated user profile' })
  async getProfile(@Req() request) {
    return {
      user: request.user,
      organization: request.organization || null,
      message: 'You are authenticated',
    };
  }
}
```

## Setup & Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd <project-folder>
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the project root (see [Environment Configuration](#environment-configuration))

4. **Generate Prisma client**

```bash
npx prisma generate
```

5. **Run migrations**

```bash
npx prisma migrate dev
```

6. **Start the development server**

```bash
npm run start:dev
```

## Environment Configuration

Create a `.env` file with these variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/db_name?schema=public"

# Clerk
CLERK_SECRET_KEY="your_clerk_secret_key"
CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"

# Stripe
STRIPE_SECRET_KEY="your_stripe_secret_key"
STRIPE_WEBHOOK_SECRET="your_stripe_webhook_secret"

# Server
PORT=3000
NODE_ENV=development

# Frontend (for CORS)
FRONTEND_URL="http://localhost:3000"
```

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| POST | `/api/auth/verify` | Verify a Clerk JWT token | No |
| GET | `/api/auth/me` | Get authenticated user profile | Yes |

### Products Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| GET | `/api/products` | List all products | Yes |
| POST | `/api/products` | Create a new product | Yes |
| GET | `/api/products/:id` | Get a product by ID | Yes |
| PUT | `/api/products/:id` | Update a product | Yes |
| DELETE | `/api/products/:id` | Delete a product | Yes |

### Subscriptions Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|--------------|
| POST | `/api/subscriptions/create-checkout` | Create a Stripe checkout session | Yes |
| GET | `/api/subscriptions` | List user subscriptions | Yes |
| POST | `/api/subscriptions/webhook` | Stripe webhook handler | No |

## Testing the Authentication

### Manual Testing

1. Get a JWT token from Clerk (via the frontend application)
2. Send a request to a protected endpoint with the token:

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Automated Testing

You can write Jest tests to verify the authentication flow:

```typescript
describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            verifyToken: jest.fn(),
          },
        },
      ],
    }).compile();

    authController = moduleRef.get<AuthController>(AuthController);
    authService = moduleRef.get<AuthService>(AuthService);
  });

  it('should return user profile when authenticated', async () => {
    const mockRequest = {
      user: { id: 'user-123', email: 'test@example.com' },
      organization: { id: 'org-123', name: 'Test Org' },
    };
    
    const result = await authController.getProfile(mockRequest);
    
    expect(result).toEqual({
      user: mockRequest.user,
      organization: mockRequest.organization,
      message: 'You are authenticated',
    });
  });
});
```

## Frontend Integration

To integrate with a frontend (e.g., Next.js) using Clerk:

1. Install Clerk frontend SDK:

```bash
npm install @clerk/nextjs
```

2. Configure Clerk in the frontend:

```typescript
// .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
CLERK_SECRET_KEY=your_secret_key
```

3. Set up Clerk provider:

```typescript
// _app.tsx or layout.tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      {children}
    </ClerkProvider>
  );
}
```

4. Use Clerk's hooks to get the token:

```typescript
import { useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';

export function useProtectedApi() {
  const { getToken } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = await getToken();
        
        const response = await fetch('http://localhost:3000/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('Authentication failed');
        }
        
        const data = await response.json();
        setUserData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [getToken]);

  return { userData, loading, error };
}
```

5. Create an API client with authentication:

```typescript
// api-client.ts
import { getAuth } from '@clerk/nextjs/server';

export class ApiClient {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  async get(path: string, headers = {}) {
    const token = await getAuth().getToken();
    
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...headers,
      },
    });
    
    return response.json();
  }
  
  // Implement post, put, delete methods similarly
}
```

## Security Considerations

1. **Token Validation**: Always validate tokens on the server-side, never rely solely on client-side validation.

2. **Environment Variables**: Keep sensitive keys in environment variables, never commit them to version control.

3. **CORS Configuration**: Configure CORS properly to restrict which domains can access your API.

4. **Rate Limiting**: Implement rate limiting to prevent brute force attacks.

5. **Error Handling**: Implement proper error handling without leaking sensitive information.

6. **Input Validation**: Validate all input data using DTOs and ValidationPipe.

7. **HTTPS**: Always use HTTPS in production to encrypt data in transit.

8. **Auditing and Logging**: Implement logging for authentication attempts and sensitive operations.

## Known Issues and Limitations

1. **Organization Role Management**: The current implementation has basic organization role management. For more complex scenarios, consider implementing a more robust role-based access control system.

2. **Token Refresh**: The current implementation doesn't handle token refresh explicitly, as Clerk's frontend SDK handles this automatically.

3. **Local Development**: For local development without valid SSL certificates, you may need to disable certain security checks.

4. **Testing**: The authentication system can be challenging to test. Consider using mock authentication for testing purposes.

5. **Multiple Strategies**: If you need multiple authentication strategies, you'll need to implement a more complex guard system.

## License

[MIT](LICENSE)
