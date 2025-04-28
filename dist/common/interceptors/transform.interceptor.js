"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransformInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
let TransformInterceptor = class TransformInterceptor {
    intercept(context, next) {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;
        return next.handle().pipe((0, operators_1.map)((data) => {
            if (data && typeof data === 'object' && 'success' in data) {
                return data;
            }
            const request = context.switchToHttp().getRequest();
            const path = request.path;
            const method = request.method;
            let message = 'Operation successful';
            if (method === 'GET') {
                message = path.includes('/status/')
                    ? 'Video status retrieved successfully'
                    : path.endsWith('/videos')
                        ? 'Videos retrieved successfully'
                        : path.match(/\/videos\/[a-zA-Z0-9-]+$/)
                            ? 'Video retrieved successfully'
                            : 'Data retrieved successfully';
            }
            else if (method === 'POST') {
                message = path.includes('/get-upload-url')
                    ? 'Upload URL generated successfully'
                    : 'Resource created successfully';
            }
            return {
                success: true,
                status: statusCode,
                message,
                data,
            };
        }));
    }
};
exports.TransformInterceptor = TransformInterceptor;
exports.TransformInterceptor = TransformInterceptor = __decorate([
    (0, common_1.Injectable)()
], TransformInterceptor);
//# sourceMappingURL=transform.interceptor.js.map