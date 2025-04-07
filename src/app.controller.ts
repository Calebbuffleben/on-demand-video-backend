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
  @Get('debug-test')
  debugTest() {
    return {
      message: 'Debug test endpoint is working',
      timestamp: new Date().toISOString()
    };
  }
}
