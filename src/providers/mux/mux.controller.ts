import { Controller, Get, Post, Body, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MuxService } from './mux.service';
import { UpdateOrgMuxDto, MuxSettingsResponseDto } from './dto/update-org-mux.dto';
import { PrismaService } from '../../prisma/prisma.service';

interface AuthenticatedRequest extends Request {
  organization: any;
  user: any;
}

@ApiTags('mux')
@ApiBearerAuth()
@Controller('api/mux')
export class MuxController {
  constructor(
    private readonly muxService: MuxService,
    private readonly prismaService: PrismaService,
  ) {}

  @Get('test-connection')
  @ApiOperation({ summary: 'Test the connection to MUX API' })
  @ApiResponse({ status: 200, description: 'Returns the MUX API response.' })
  async testConnection() {
    try {
      return await this.muxService.testMuxConnection();
    } catch (error) {
      throw new BadRequestException(`Failed to connect to MUX API: ${error.message}`);
    }
  }

  @Post('organization/settings')
  @ApiOperation({ summary: 'Update MUX settings for the organization' })
  @ApiResponse({ status: 200, description: 'Settings updated.' })
  async updateOrgMuxSettings(
    @Body() updateOrgMuxDto: UpdateOrgMuxDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<MuxSettingsResponseDto> {
    const organizationId = req['organization'].id;
    
    try {
      // Update organization with new MUX credentials
      await this.prismaService.organization.update({
        where: { id: organizationId },
        data: {
          muxTokenId: updateOrgMuxDto.muxTokenId,
          muxTokenSecret: updateOrgMuxDto.muxTokenSecret,
        },
      });
      
      // Test connection with new credentials
      await this.muxService.testMuxConnection(organizationId);
      
      // Mask credentials for response
      return {
        success: true,
        muxTokenId: this.maskString(updateOrgMuxDto.muxTokenId),
        muxTokenSecret: this.maskString(updateOrgMuxDto.muxTokenSecret),
      };
    } catch (error) {
      throw new BadRequestException(`Failed to update MUX settings: ${error.message}`);
    }
  }

  @Get('organization/settings')
  @ApiOperation({ summary: 'Get MUX settings for the organization' })
  @ApiResponse({ status: 200, description: 'Settings retrieved.' })
  async getOrgMuxSettings(@Req() req: AuthenticatedRequest): Promise<MuxSettingsResponseDto> {
    const organizationId = req['organization'].id;
    
    try {
      // Get organization with MUX credentials
      const organization = await this.prismaService.organization.findUnique({
        where: { id: organizationId },
        select: {
          muxTokenId: true,
          muxTokenSecret: true,
        },
      });
      
      if (!organization || !organization.muxTokenId || !organization.muxTokenSecret) {
        return {
          success: false,
          muxTokenId: '',
          muxTokenSecret: '',
        };
      }
      
      // Mask credentials for response
      return {
        success: true,
        muxTokenId: this.maskString(organization.muxTokenId),
        muxTokenSecret: this.maskString(organization.muxTokenSecret),
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get MUX settings: ${error.message}`);
    }
  }

  @Post('organization/test-connection')
  @ApiOperation({ summary: 'Test MUX API connection for the organization' })
  @ApiResponse({ status: 200, description: 'Connection successful.' })
  @ApiResponse({ status: 400, description: 'Connection failed.' })
  async testOrgConnection(@Req() req: AuthenticatedRequest) {
    const organizationId = req['organization'].id;
    return this.muxService.testMuxConnection(organizationId);
  }

  /**
   * Utility method to mask sensitive strings
   */
  private maskString(input: string): string {
    if (!input || input.length < 4) {
      return input;
    }
    
    const visiblePrefixLength = 2;
    const visibleSuffixLength = 2;
    
    return (
      input.substring(0, visiblePrefixLength) +
      '***' +
      input.substring(input.length - visibleSuffixLength)
    );
  }
} 