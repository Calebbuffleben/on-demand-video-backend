import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  status: number;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((data) => {
        // Skip transformation if response is already formatted
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Get request path for the message
        const request = context.switchToHttp().getRequest();
        const path = request.path;
        const method = request.method;

        // Create a message based on the HTTP method and path
        let message = 'Operation successful';
        if (method === 'GET') {
          message = path.includes('/status/')
            ? 'Video status retrieved successfully'
            : path.endsWith('/videos')
            ? 'Videos retrieved successfully'
            : path.match(/\/videos\/[a-zA-Z0-9-]+$/)
            ? 'Video retrieved successfully'
            : 'Data retrieved successfully';
        } else if (method === 'POST') {
          message = path.includes('/get-upload-url')
            ? 'Upload URL generated successfully'
            : 'Resource created successfully';
        }

        return {
          success: true,
          status: statusCode,
          message,
          data,
        };
      }),
    );
  }
} 