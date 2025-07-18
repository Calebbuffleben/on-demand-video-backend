import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Test endpoint to verify API is running' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns a test message',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    }
  })
  getHello() {
    return { message: this.appService.getHello() };
  }

  @Public()
  @Get('cors-test')
  @ApiOperation({ summary: 'Test CORS configuration' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns CORS test data',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        timestamp: { type: 'string' },
        cors: { type: 'boolean' }
      }
    }
  })
  corsTest() {
    return { 
      message: 'CORS is working!', 
      timestamp: new Date().toISOString(),
      cors: true
    };
  }
}
