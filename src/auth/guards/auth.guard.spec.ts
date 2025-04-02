import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../auth.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: AuthService;
  let reflector: Reflector;
  
  const mockAuthService = {
    verifyToken: jest.fn(),
    getOrCreateUser: jest.fn(),
    getOrCreateOrganization: jest.fn(),
  };
  
  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: mockAuthService },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    authService = module.get<AuthService>(AuthService);
    reflector = module.get<Reflector>(Reflector);
    
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  function createMockExecutionContext(isPublic: boolean, token?: string): ExecutionContext {
    mockReflector.getAllAndOverride.mockReturnValue(isPublic);
    
    const request = {
      headers: {} as Record<string, string>,
    };
    
    if (token) {
      request.headers.authorization = `Bearer ${token}`;
    }
    
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  }

  describe('canActivate', () => {
    it('should allow access to public routes', async () => {
      // Arrange
      const context = createMockExecutionContext(true);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      expect(mockAuthService.verifyToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when no token is provided', async () => {
      // Arrange
      const context = createMockExecutionContext(false);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Authentication token is missing');
    });

    it('should throw UnauthorizedException when token verification fails', async () => {
      // Arrange
      const context = createMockExecutionContext(false, 'invalid_token');
      mockAuthService.verifyToken.mockResolvedValue(null);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(context)).rejects.toThrow('Invalid authentication token');
    });

    it('should allow access and attach user data when token is valid', async () => {
      // Arrange
      const token = 'valid_token';
      const userId = 'user_123';
      const orgId = 'org_123';
      const context = createMockExecutionContext(false, token);
      const request = context.switchToHttp().getRequest();
      
      const mockVerificationResult = {
        userId,
        email: 'test@example.com',
        organizationId: orgId,
        organizationName: 'Test Org',
        role: 'admin',
      };
      
      const mockUser = { id: 'db_user_1', clerkId: userId, email: 'test@example.com' };
      const mockOrg = { id: 'db_org_1', clerkId: orgId, name: 'Test Org' };
      
      mockAuthService.verifyToken.mockResolvedValue(mockVerificationResult);
      mockAuthService.getOrCreateUser.mockResolvedValue(mockUser);
      mockAuthService.getOrCreateOrganization.mockResolvedValue(mockOrg);

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith(token);
      expect(mockAuthService.getOrCreateUser).toHaveBeenCalledWith(
        mockVerificationResult.userId,
        mockVerificationResult.email,
      );
      expect(mockAuthService.getOrCreateOrganization).toHaveBeenCalledWith(
        mockVerificationResult.organizationId,
        mockVerificationResult.organizationName,
        mockUser.id,
        mockVerificationResult.role,
      );
      expect(request.user).toEqual(mockUser);
      expect(request.organization).toEqual(mockOrg);
    });
  });
}); 