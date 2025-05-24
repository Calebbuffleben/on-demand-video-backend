import { Visibility } from '@prisma/client';
export declare class CreateVideoDto {
    name: string;
    description?: string;
    tags?: string[];
    visibility?: Visibility;
    ctaText?: string;
    ctaButtonText?: string;
    ctaLink?: string;
    ctaStartTime?: number;
    ctaEndTime?: number;
}
