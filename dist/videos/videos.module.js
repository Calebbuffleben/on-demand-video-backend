"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideosModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const videos_service_1 = require("./videos.service");
const videos_controller_1 = require("./videos.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const transform_interceptor_1 = require("../common/interceptors/transform.interceptor");
const mux_module_1 = require("../providers/mux/mux.module");
const upload_service_1 = require("./upload.service");
const config_1 = require("@nestjs/config");
const r2_service_1 = require("../storage/r2.service");
const content_cache_service_1 = require("../storage/content-cache.service");
const transcode_queue_1 = require("../queue/transcode.queue");
const jwt_playback_service_1 = require("./jwt-playback.service");
const video_provider_factory_1 = require("./providers/video-provider.factory");
const internal_provider_1 = require("./providers/internal.provider");
const mux_provider_1 = require("./providers/mux.provider");
const limits_service_1 = require("../common/limits.service");
let VideosModule = class VideosModule {
};
exports.VideosModule = VideosModule;
exports.VideosModule = VideosModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            mux_module_1.MuxModule,
            config_1.ConfigModule
        ],
        controllers: [videos_controller_1.VideosController],
        providers: [
            videos_service_1.VideosService,
            upload_service_1.UploadService,
            r2_service_1.R2Service,
            content_cache_service_1.ContentCacheService,
            transcode_queue_1.TranscodeQueue,
            jwt_playback_service_1.JwtPlaybackService,
            video_provider_factory_1.VideoProviderFactory,
            internal_provider_1.InternalProvider,
            mux_provider_1.MuxProvider,
            limits_service_1.LimitsService,
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: transform_interceptor_1.TransformInterceptor,
            },
        ],
        exports: [videos_service_1.VideosService, upload_service_1.UploadService],
    })
], VideosModule);
//# sourceMappingURL=videos.module.js.map