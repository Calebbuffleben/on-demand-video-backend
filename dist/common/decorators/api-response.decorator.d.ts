import { Type } from '@nestjs/common';
export interface ApiResponseOptions {
    type: Type<any>;
    description?: string;
    isArray?: boolean;
}
export declare const ApiStandardResponse: <TModel extends Type<any>>(options: ApiResponseOptions) => <TFunction extends Function, Y>(target: TFunction | object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void;
