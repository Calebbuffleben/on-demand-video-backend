import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Request } from 'express';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAll(req: Request): Promise<{
        description: string | null;
        organizationId: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        price: number;
        currency: string;
    }[]>;
    findOne(id: string, req: Request): Promise<{
        description: string | null;
        organizationId: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        price: number;
        currency: string;
    }>;
    create(createProductDto: CreateProductDto, req: Request): Promise<{
        description: string | null;
        organizationId: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        price: number;
        currency: string;
    }>;
    update(id: string, updateProductDto: UpdateProductDto, req: Request): Promise<{
        description: string | null;
        organizationId: string;
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        price: number;
        currency: string;
    }>;
    remove(id: string, req: Request): Promise<{
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
