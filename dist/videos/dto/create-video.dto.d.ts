import { Visibility } from '@prisma/client';
export declare class CreateVideoDto {
    name: string;
    description?: string;
    tags?: string[];
    visibility?: Visibility;
}
