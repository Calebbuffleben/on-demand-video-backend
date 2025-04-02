import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  
  const mockAuthService = {
    verifyToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('verifyToken', () => {
    it('should return success false when token verification fails', async () => {
      // Arrange
      const verifyTokenDto = { token: 'invalid_token' };
      mockAuthService.verifyToken.mockResolvedValue(null);

      // Act
      const result = await controller.verifyToken(verifyTokenDto);

      // Assert
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith(verifyTokenDto.token);
      expect(result).toEqual({
        success: false,
        message: 'Invalid token',
      });
    });

    it('should return user data when token verification succeeds', async () => {
      // Arrange
      const verifyTokenDto = { token: 'valid_token' };
      const mockVerification = {
        userId: 'user_123',
        email: 'test@example.com',
        organizationId: 'org_123',
        organizationName: 'Test Org',
        role: 'admin',
      };
      
      mockAuthService.verifyToken.mockResolvedValue(mockVerification);

      // Act
      const result = await controller.verifyToken(verifyTokenDto);

      // Assert
      expect(mockAuthService.verifyToken).toHaveBeenCalledWith(verifyTokenDto.token);
      expect(result).toEqual({
        success: true,
        user: {
          id: mockVerification.userId,
          email: mockVerification.email,
        },
        organization: {
          id: mockVerification.organizationId,
          name: mockVerification.organizationName,
        },
        role: mockVerification.role,
      });
    });
  });

  describe('getProfile', () => {
    it('should return user and organization data from request', async () => {
      // Arrange
      const mockRequest = {
        user: { id: 'user_123', email: 'test@example.com' },
        organization: { id: 'org_123', name: 'Test Org' },
      };

      // Act
      const result = await controller.getProfile(mockRequest);

      // Assert
      expect(result).toEqual({
        user: mockRequest.user,
        organization: mockRequest.organization,
        message: 'You are authenticated',
      });
    });

    it('should handle missing organization in request', async () => {
      // Arrange
      const mockRequest = {
        user: { id: 'user_123', email: 'test@example.com' },
      };

      // Act
      const result = await controller.getProfile(mockRequest);

      // Assert
      expect(result).toEqual({
        user: mockRequest.user,
        organization: null,
        message: 'You are authenticated',
      });
    });
  });
}); 