import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiProperty, getSchemaPath } from '@nestjs/swagger';

export interface ApiResponseOptions {
  type: Type<any>;
  description?: string;
  isArray?: boolean;
}

export const ApiStandardResponse = <TModel extends Type<any>>(
  options: ApiResponseOptions,
) => {
  const { type, description = 'Successful operation', isArray = false } = options;

  class StandardResponseDto {
    @ApiProperty({ type: Boolean, example: true })
    success: boolean;

    @ApiProperty({ type: Number, example: 200 })
    status: number;

    @ApiProperty({ type: String, example: 'Operation successful' })
    message: string;

    @ApiProperty({ 
      description: 'Response data',
      type: 'object',
      additionalProperties: {}
    })
    data: Record<string, any>;
  }

  return applyDecorators(
    ApiExtraModels(type, StandardResponseDto),
    ApiOkResponse({
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(StandardResponseDto) },
          {
            properties: {
              data: {
                type: 'object',
                properties: {
                  result: isArray 
                    ? { 
                        type: 'array', 
                        items: { $ref: getSchemaPath(type) } 
                      }
                    : { $ref: getSchemaPath(type) }
                }
              }
            }
          }
        ]
      },
    }),
  );
}; 