import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
export declare class ProductsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(organizationId: string): Promise<{
        description: string | null;
        organizationId: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        price: number;
        currency: string;
    }[]>;
    findOne(id: string, organizationId: string): Promise<{
        description: string | null;
        organizationId: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        price: number;
        currency: string;
    }>;
    create(createProductDto: CreateProductDto, organizationId: string): Promise<{
        description: string | null;
        organizationId: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        price: number;
        currency: string;
    }>;
    update(id: string, updateProductDto: UpdateProductDto, organizationId: string): Promise<{
        description: string | null;
        organizationId: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        price: number;
        currency: string;
    }>;
    remove(id: string, organizationId: string): Promise<{
        description: string | null;
        organizationId: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        price: number;
        currency: string;
    }>;
}
