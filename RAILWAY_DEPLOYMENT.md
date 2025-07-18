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
CORS_ORIGIN=https://your-frontend-domain.com
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

3. **Deploy**
   - Railway will automatically detect the Node.js project
   - The build process will:
     - Install dependencies (`npm ci`)
     - Generate Prisma client (`npx prisma generate`)
     - Build the application (`npm run build`)
     - Start the application (`npm run start:prod`)

## Troubleshooting

### Build Issues

If the build gets stuck or fails:

1. **Check Node.js version**: Ensure you're using Node.js 20.x
2. **Clear cache**: Try redeploying with cache cleared
3. **Check logs**: Review Railway build logs for specific errors

### Database Issues

1. **Prisma migrations**: Run migrations manually if needed:
   ```bash
   npx prisma migrate deploy
   ```

2. **Database connection**: Verify `DATABASE_URL` is correct and accessible

### Runtime Issues

1. **Memory limits**: The app is configured with `--max-old-space-size=512`
2. **Port binding**: Ensure `PORT` environment variable is set
3. **CORS**: Verify `CORS_ORIGIN` is set correctly

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