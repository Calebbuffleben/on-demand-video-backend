import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClerkStrategy } from './clerk.strategy';
import { verifyToken } from '@clerk/backend';

// Mock dependencies
jest.mock('@clerk/backend', () => ({
  verifyToken: jest.fn(),
}));

describe('ClerkStrategy', () => {
  let strategy: ClerkStrategy;
  let clerkClient: any;
  
  const mockClerkClient = {
    users: {
      getUser: jest.fn(),
    },
  };
  
  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'CLERK_SECRET_KEY') return 'test_secret_key';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClerkStrategy,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: 'ClerkClient', useValue: mockClerkClient },
      ],
    }).compile();

    strategy = module.get<ClerkStrategy>(ClerkStrategy);
    clerkClient = module.get('ClerkClient');
    
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should throw UnauthorizedException when no token is provided', async () => {
      // Arrange
      const request = { headers: {} };

      // Act & Assert
      await expect(strategy.validate(request)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(request)).rejects.toThrow('No token provided');
    });

    it('should throw UnauthorizedException when token verification fails', async () => {
      // Arrange
      const request = { headers: { authorization: 'Bearer invalid_token' } };
      (verifyToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      // Act & Assert
      await expect(strategy.validate(request)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(request)).rejects.toThrow('Invalid token');
    });

    it('should return user data when token is valid', async () => {
      // Arrange
      const token = 'valid_token';
      const request = { headers: { authorization: `Bearer ${token}` } };
      const sub = 'user_123';
      const org_id = 'org_123';
      const mockTokenPayload = { sub, org_id };
      const mockUser = { 
        id: sub, 
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        firstName: 'Test',
        lastName: 'User'
      };
      
      (verifyToken as jest.Mock).mockResolvedValue(mockTokenPayload);
      mockClerkClient.users.getUser.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(request);

      // Assert
      expect(verifyToken).toHaveBeenCalledWith(token, { 
        secretKey: 'test_secret_key' 
      });
      expect(mockClerkClient.users.getUser).toHaveBeenCalledWith(sub);
      expect(result).toEqual({
        id: sub,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        organizationId: org_id,
        claims: mockTokenPayload,
      });
    });
  });
}); 