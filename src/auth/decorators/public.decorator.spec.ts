import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY, Public } from './public.decorator';

jest.mock('@nestjs/common', () => ({
  SetMetadata: jest.fn(),
}));

describe('Public Decorator', () => {
  it('should call SetMetadata with the correct parameters', () => {
    // Act
    Public();

    // Assert
    expect(SetMetadata).toHaveBeenCalledWith(IS_PUBLIC_KEY, true);
  });
}); 