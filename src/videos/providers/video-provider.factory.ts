import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VideoProvider } from './video-provider.interface';
import { InternalProvider } from './internal.provider';
import { MuxProvider } from './mux.provider';

export type ProviderType = 'INTERNAL' | 'MUX';

interface OrganizationSettings {
  defaultProvider: ProviderType;
  allowProviderOverride: boolean;
  providers: {
    mux?: {
      tokenId: string;
      tokenSecret: string;
      enabled: boolean;
    };
    internal?: {
      enabled: boolean;
    };
  };
}

@Injectable()
export class VideoProviderFactory {
  private readonly logger = new Logger(VideoProviderFactory.name);
  
  constructor(
    private prisma: PrismaService,
    private internalProvider: InternalProvider,
    private muxProvider: MuxProvider,
  ) {}

  /**
   * Get the appropriate video provider for an organization
   */
  async getProvider(organizationId: string, preferredProvider?: ProviderType): Promise<VideoProvider> {
    try {
      const settings = await this.getOrganizationSettings(organizationId);
      
      // Determine which provider to use
      let providerType: ProviderType;
      
      if (preferredProvider && settings.allowProviderOverride) {
        providerType = preferredProvider;
      } else {
        providerType = settings.defaultProvider;
      }

      // Validate provider is enabled for this organization
      if (providerType === 'MUX' && !settings.providers.mux?.enabled) {
        this.logger.warn(`MUX provider requested but not enabled for org ${organizationId}, falling back to INTERNAL`);
        providerType = 'INTERNAL';
      }

      if (providerType === 'INTERNAL' && !settings.providers.internal?.enabled) {
        throw new BadRequestException('Internal provider not enabled for this organization');
      }

      // Return the appropriate provider instance
      switch (providerType) {
        case 'INTERNAL':
          return this.internalProvider;
        case 'MUX':
          return this.muxProvider;
        default:
          throw new BadRequestException(`Unknown provider type: ${providerType}`);
      }
    } catch (error) {
      this.logger.error(`Error getting provider for org ${organizationId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get organization provider settings
   */
  private async getOrganizationSettings(organizationId: string): Promise<OrganizationSettings> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        muxTokenId: true,
        muxTokenSecret: true,
        // Add any provider-related fields here
      },
    });

    if (!organization) {
      throw new BadRequestException(`Organization ${organizationId} not found`);
    }

    // Determine settings based on organization configuration
    const hasMuxCredentials = !!(organization.muxTokenId && organization.muxTokenSecret);
    
    // Default to INTERNAL provider for new organizations
    // Organizations with MUX credentials can use MUX as fallback
    const defaultProvider: ProviderType = 'INTERNAL';
    
    return {
      defaultProvider,
      allowProviderOverride: true, // Allow switching between providers
      providers: {
        internal: {
          enabled: true, // Always enabled
        },
        mux: {
          tokenId: organization.muxTokenId || '',
          tokenSecret: organization.muxTokenSecret || '',
          enabled: hasMuxCredentials,
        },
      },
    };
  }

  /**
   * List available providers for an organization
   */
  async getAvailableProviders(organizationId: string): Promise<{
    default: ProviderType;
    available: Array<{
      type: ProviderType;
      name: string;
      enabled: boolean;
      supportsDirectUpload: boolean;
      supportsSignedPlayback: boolean;
    }>;
  }> {
    const settings = await this.getOrganizationSettings(organizationId);
    
    return {
      default: settings.defaultProvider,
      available: [
        {
          type: 'INTERNAL',
          name: 'Internal (R2 + FFmpeg)',
          enabled: settings.providers.internal?.enabled || false,
          supportsDirectUpload: this.internalProvider.supportsDirectUpload,
          supportsSignedPlayback: this.internalProvider.supportsSignedPlayback,
        },
        {
          type: 'MUX',
          name: 'Mux Video',
          enabled: settings.providers.mux?.enabled || false,
          supportsDirectUpload: this.muxProvider.supportsDirectUpload,
          supportsSignedPlayback: this.muxProvider.supportsSignedPlayback,
        },
      ],
    };
  }

  /**
   * Test connection for all enabled providers
   */
  async testAllProviders(organizationId: string): Promise<{
    [key in ProviderType]?: { success: boolean; message?: string };
  }> {
    const settings = await this.getOrganizationSettings(organizationId);
    const results: { [key in ProviderType]?: { success: boolean; message?: string } } = {};

    // Test internal provider if enabled
    if (settings.providers.internal?.enabled) {
      try {
        results.INTERNAL = await this.internalProvider.testConnection(organizationId);
      } catch (error) {
        results.INTERNAL = { success: false, message: error.message };
      }
    }

    // Test MUX provider if enabled
    if (settings.providers.mux?.enabled) {
      try {
        results.MUX = await this.muxProvider.testConnection(organizationId);
      } catch (error) {
        results.MUX = { success: false, message: error.message };
      }
    }

    return results;
  }
}
