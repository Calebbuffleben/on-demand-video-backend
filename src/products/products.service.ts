import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.product.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (product.organizationId !== organizationId) {
      throw new ForbiddenException('You do not have access to this product');
    }

    return product;
  }

  async create(createProductDto: CreateProductDto, organizationId: string) {
    return this.prisma.product.create({
      data: {
        ...createProductDto,
        organizationId,
      },
    });
  }

  async update(id: string, updateProductDto: UpdateProductDto, organizationId: string) {
    // Check if product exists and belongs to organization
    await this.findOne(id, organizationId);

    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });
  }

  async remove(id: string, organizationId: string) {
    // Check if product exists and belongs to organization
    await this.findOne(id, organizationId);

    return this.prisma.product.delete({
      where: { id },
    });
  }
} 