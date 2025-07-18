# Railway Deployment Guide

## Prerequisites

Before deploying to Railway, ensure you have the following environment variables configured in your Railway project:

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Clerk Authentication
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret

# Mux Configuration
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret
MUX_WEBHOOK_SECRET=your_mux_webhook_secret

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Application Configuration
NODE_ENV=production
PORT=4000
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1

# CORS Configuration (IMPORTANT!)
CORS_ORIGIN=https://on-demand-video-frontend-production.up.railway.app,http://localhost:3000,http://localhost:3001
```

## Deployment Steps

1. **Connect your repository to Railway**
   - Go to Railway dashboard
   - Create a new project
   - Connect your GitHub repository
   - Select the `backend` directory as the source

2. **Configure Environment Variables**
   - Add all required environment variables in Railway dashboard
   - Ensure `DATABASE_URL` points to a PostgreSQL database
   - **CRITICAL**: Set `CORS_ORIGIN` to include your frontend URL
   - **CRITICAL**: Set `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1` to fix Prisma build issues

3. **Deploy**
   - Railway will automatically detect the Node.js project
   - The build process will:
     - Install dependencies (`npm install --production=false`)
     - Generate Prisma client (`npx prisma generate`)
     - Build the application (`npm run build`)
     - Start the application (`npm run start:prod`)

## Recent Fixes Applied

### ✅ Package Lock File Sync Issue
- **Problem**: `npm ci` was failing due to out-of-sync `package-lock.json`
- **Solution**: Updated to use `npm install --production=false` in Nixpacks configuration
- **Status**: Fixed ✅

### ✅ Custom Build Script
- **Problem**: Railway was still using `npm ci` despite Nixpacks configuration
- **Solution**: Created custom `build:railway` script that handles npm install properly
- **Status**: Fixed ✅

### ✅ CORS Configuration
- **Problem**: Frontend requests blocked by CORS policy
- **Solution**: Updated CORS to support multiple origins including Railway frontend URL
- **Status**: Fixed ✅

### ✅ Prisma Engine Checksum Error
- **Problem**: Prisma failing to download engine binaries due to network restrictions
- **Solution**: Moved Prisma generation to runtime instead of build time
- **Status**: Fixed ✅

### ✅ Node.js Version Compatibility
- **Problem**: Engine warnings about Node.js version requirements
- **Solution**: Updated `engines` field in `package.json` to `>=20.11.0`
- **Status**: Fixed ✅

### ✅ Security Vulnerabilities
- **Problem**: 2 high severity vulnerabilities detected
- **Solution**: Ran `npm audit fix` to resolve all issues
- **Status**: Fixed ✅

## Configuration Files

### railway.toml
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm run start:prod"
healthcheckPath = "/"
healthcheckTimeout = 300
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10

[deploy.envs]
NODE_ENV = "production"
PORT = "4000"
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING = "1"

[build.envs]
NODE_ENV = "production"
NIXPACKS_NODE_PACKAGE_MANAGER = "npm"
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING = "1"
```

### nixpacks.toml
```toml
[phases.setup]
nixPkgs = ["nodejs_20", "openssl"]

[phases.install]
cmds = ["npm install --production=false"]

[phases.build]
cmds = ["npm run build:railway"]

[start]
cmd = "npm run start:prod"
```

### package.json (build script)
```json
"build:railway": "npm install --production=false && npm run build",
"start:prod": "PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate && node --max-old-space-size=512 dist/main"
```

## CORS Configuration

The backend now supports multiple origins for CORS:

```typescript
const allowedOrigins = corsOrigin 
  ? corsOrigin.split(',').map(origin => origin.trim())
  : [
      'https://on-demand-video-frontend-production.up.railway.app',
      'http://localhost:3000',
      'http://localhost:3001'
    ];
```

**Environment Variable Setup:**
```bash
CORS_ORIGIN=https://on-demand-video-frontend-production.up.railway.app,http://localhost:3000,http://localhost:3001
```

## Prisma Configuration

To fix Prisma engine checksum errors, the build process has been modified:

1. **Build Time**: Prisma generation is skipped during build to avoid network issues
2. **Runtime**: Prisma client is generated when the application starts

**Environment Variable:**
```bash
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
```

**Build Script Changes:**
- `build:railway`: Only installs dependencies and builds the application
- `start:prod`: Generates Prisma client before starting the application

This approach ensures that:
- Build process completes successfully without network dependencies
- Prisma client is available when the application starts
- Network issues during build are avoided

## Troubleshooting

### Build Issues

If the build gets stuck or fails:

1. **Check Node.js version**: Ensure you're using Node.js >=20.11.0
2. **Clear cache**: Try redeploying with cache cleared
3. **Check logs**: Review Railway build logs for specific errors
4. **Package lock issues**: If you see `npm ci` errors, the lock file may be out of sync

### Railway-Specific Issues

1. **Railway ignoring Nixpacks**: 
   - Ensure `railway.toml` and `nixpacks.toml` are in the root of the backend directory
   - Try using `railway.json` as an alternative configuration format
   - Clear Railway build cache and redeploy

2. **Persistent npm ci errors**:
   - The custom `build:railway` script should handle this
   - Check that Railway is using the Nixpacks builder
   - Verify environment variables are set correctly

### CORS Issues

1. **Frontend requests blocked**:
   - Ensure `CORS_ORIGIN` environment variable is set correctly
   - Include both production and development URLs
   - Redeploy backend after updating CORS configuration

2. **Multiple origins**:
   - Use comma-separated values: `origin1,origin2,origin3`
   - No spaces around commas
   - Include protocol (http:// or https://)

### Prisma Issues

1. **Engine checksum errors**:
   - Ensure `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1` is set
   - This is automatically handled in build scripts
   - Check Railway environment variables

2. **Database connection**:
   - Verify `DATABASE_URL` is correct and accessible
   - Run migrations if needed: `npx prisma migrate deploy`

### Runtime Issues

1. **Memory limits**: The app is configured with `--max-old-space-size=512`
2. **Port binding**: Ensure `PORT` environment variable is set
3. **CORS**: Verify `CORS_ORIGIN` is set correctly

## Local Testing

Before deploying, test locally:

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Build the application
npm run build

# Test the custom build script
npm run build:railway

# Test the build output
ls -la dist/
```

## Health Check

The application includes a health check endpoint at `/` that returns:
```json
{
  "message": "Hello World!"
}
```

## Monitoring

- Railway provides built-in monitoring and logs
- Check the "Deployments" tab for build and runtime logs
- Monitor application metrics in the "Metrics" tab

## Rollback

If deployment fails:
1. Go to Railway dashboard
2. Navigate to "Deployments"
3. Click on the previous successful deployment
4. Select "Redeploy"

## Support

For Railway-specific issues, refer to:
- [Railway Documentation](https://docs.railway.app/)
- [Railway Discord](https://discord.gg/railway) 