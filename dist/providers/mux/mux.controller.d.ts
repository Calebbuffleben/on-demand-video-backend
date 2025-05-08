import { MuxService } from './mux.service';
import { UpdateOrgMuxDto, MuxSettingsResponseDto } from './dto/update-org-mux.dto';
import { PrismaService } from '../../prisma/prisma.service';
interface AuthenticatedRequest extends Request {
    organization: any;
    user: any;
}
export declare class MuxController {
    private readonly muxService;
    private readonly prismaService;
    constructor(muxService: MuxService, prismaService: PrismaService);
    testConnection(): Promise<any>;
    updateOrgMuxSettings(updateOrgMuxDto: UpdateOrgMuxDto, req: AuthenticatedRequest): Promise<MuxSettingsResponseDto>;
    getOrgMuxSettings(req: AuthenticatedRequest): Promise<MuxSettingsResponseDto>;
    testOrgConnection(req: AuthenticatedRequest): Promise<any>;
    private maskString;
}
export {};
