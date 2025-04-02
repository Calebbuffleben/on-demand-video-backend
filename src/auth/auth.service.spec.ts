import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { User, Organization } from '@prisma/client';
import { ClerkVerificationResponse } from './interfaces/clerk-verification.interface';
import { verifyToken } from '@clerk/backend';

// Mock dependencies
jest.mock('@clerk/backend', () => ({
  verifyToken: jest.fn(),
  createClerkClient: jest.fn().mockImplementation(() => ({
    users: {
      getUser: jest.fn(),
    },
    organizations: {
      getOrganization: jest.fn(),
      getOrganizationMembershipList: jest.fn(),
    },
  })),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let clerkClient: any;
  
  const mockClerkClient = {
    users: {
      getUser: jest.fn(),
    },
    organizations: {
      getOrganization: jest.fn(),
      getOrganizationMembershipList: jest.fn(),
    },
  };
  
  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'CLERK_SECRET_KEY') return 'test_secret_key';
      return null;
    }),
  };
  
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    userOrganization: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: 'ClerkClient', useValue: mockClerkClient },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    clerkClient = module.get('ClerkClient');
    
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('verifyToken', () => {
    it('should successfully verify a valid token', async () => {
      // Arrange
      const token = 'valid_token';
      const sub = 'user_123';
      const mockTokenPayload = { sub, org_id: 'org_123' };
      const mockUser = { 
        id: sub, 
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        firstName: 'Test',
        lastName: 'User'
      };
      const mockOrg = { name: 'Test Org' };
      const mockMemberships = { 
        data: [{ 
          publicUserData: { userId: sub }, 
          role: 'admin' 
        }] 
      };
      
      (verifyToken as jest.Mock).mockResolvedValue(mockTokenPayload);
      clerkClient.users.getUser.mockResolvedValue(mockUser);
      clerkClient.organizations.getOrganization.mockResolvedValue(mockOrg);
      clerkClient.organizations.getOrganizationMembershipList.mockResolvedValue(mockMemberships);

      // Act
      const result = await service.verifyToken(token);

      // Assert
      expect(verifyToken).toHaveBeenCalledWith(token, { 
        secretKey: 'test_secret_key' 
      });
      expect(clerkClient.users.getUser).toHaveBeenCalledWith(sub);
      expect(result).toEqual({
        userId: sub,
        email: 'test@example.com',
        organizationId: 'org_123',
        organizationName: 'Test Org',
        role: 'admin',
      });
    });

    it('should return null when token verification fails', async () => {
      // Arrange
      const token = 'invalid_token';
      (verifyToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      // Act
      const result = await service.verifyToken(token);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getOrCreateUser', () => {
    it('should return existing user when found', async () => {
      // Arrange
      const clerkId = 'user_123';
      const email = 'test@example.com';
      const mockUser = { id: 'db_user_1', clerkId, email };
      
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.getOrCreateUser(clerkId, email);

      // Assert
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { clerkId },
      });
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should create a new user when not found', async () => {
      // Arrange
      const clerkId = 'user_123';
      const email = 'test@example.com';
      const mockUser = { id: 'db_user_1', clerkId, email };
      
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      // Act
      const result = await service.getOrCreateUser(clerkId, email);

      // Assert
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { clerkId },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: { clerkId, email },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('getOrCreateOrganization', () => {
    it('should return existing organization when found', async () => {
      // Arrange
      const clerkOrgId = 'org_123';
      const name = 'Test Org';
      const userId = 'user_123';
      const role = 'admin';
      const mockOrg = { id: 'db_org_1', clerkId: clerkOrgId, name };
      
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrismaService.userOrganization.findUnique.mockResolvedValue({ userId, organizationId: mockOrg.id, role: 'ADMIN' });

      // Act
      const result = await service.getOrCreateOrganization(clerkOrgId, name, userId, role);

      // Assert
      expect(mockPrismaService.organization.findUnique).toHaveBeenCalledWith({
        where: { clerkId: clerkOrgId },
      });
      expect(mockPrismaService.organization.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockOrg);
    });

    it('should create a new organization when not found', async () => {
      // Arrange
      const clerkOrgId = 'org_123';
      const name = 'Test Org';
      const userId = 'user_123';
      const role = 'admin';
      const mockOrg = { id: 'db_org_1', clerkId: clerkOrgId, name };
      
      mockPrismaService.organization.findUnique.mockResolvedValue(null);
      mockPrismaService.organization.create.mockResolvedValue(mockOrg);

      // Act
      const result = await service.getOrCreateOrganization(clerkOrgId, name, userId, role);

      // Assert
      expect(mockPrismaService.organization.findUnique).toHaveBeenCalledWith({
        where: { clerkId: clerkOrgId },
      });
      expect(mockPrismaService.organization.create).toHaveBeenCalledWith({
        data: {
          name,
          clerkId: clerkOrgId,
          users: {
            create: {
              role: 'ADMIN',
              user: {
                connect: { id: userId },
              },
            },
          },
        },
      });
      expect(result).toEqual(mockOrg);
    });

    it('should add user to existing organization when user not in org', async () => {
      // Arrange
      const clerkOrgId = 'org_123';
      const name = 'Test Org';
      const userId = 'user_123';
      const role = 'admin';
      const mockOrg = { id: 'db_org_1', clerkId: clerkOrgId, name };
      
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrismaService.userOrganization.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.getOrCreateOrganization(clerkOrgId, name, userId, role);

      // Assert
      expect(mockPrismaService.userOrganization.create).toHaveBeenCalledWith({
        data: {
          role: 'ADMIN',
          user: {
            connect: { id: userId },
          },
          organization: {
            connect: { id: mockOrg.id },
          },
        },
      });
      expect(result).toEqual(mockOrg);
    });
  });
}); 