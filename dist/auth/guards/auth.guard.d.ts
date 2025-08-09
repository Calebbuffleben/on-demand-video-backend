import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
export declare class AuthGuard implements CanActivate {
    private authService;
    private reflector;
    private prisma;
    constructor(authService: AuthService, reflector: Reflector, prisma: PrismaService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private extractToken;
}
