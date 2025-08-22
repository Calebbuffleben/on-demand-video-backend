const { ConfigService } = require('@nestjs/config');

// Simulate the config service to check environment variables
function debugEnvironment() {
  console.log('🔍 Environment Debug Information');
  console.log('================================');
  
  // Check critical environment variables
  const criticalVars = [
    'NODE_ENV',
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
    'FRONTEND_URL',
    'CORS_ORIGIN',
    'COOKIE_DOMAIN',
    'COOKIE_SAMESITE',
    'TRUST_PROXY',
    'TRUST_PROXY_HOPS',
    'DATABASE_URL'
  ];
  
  console.log('\n📋 Critical Environment Variables:');
  criticalVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      // Mask sensitive values
      if (varName.includes('SECRET') || varName.includes('PASSWORD') || varName.includes('KEY')) {
        console.log(`  ${varName}: ${value.substring(0, 10)}...`);
      } else {
        console.log(`  ${varName}: ${value}`);
      }
    } else {
      console.log(`  ${varName}: ❌ NOT SET`);
    }
  });
  
  // Check cookie configuration
  console.log('\n🍪 Cookie Configuration:');
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieDomain = process.env.COOKIE_DOMAIN;
  const cookieSameSite = process.env.COOKIE_SAMESITE;
  
  console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`  Is Production: ${isProduction}`);
  console.log(`  COOKIE_DOMAIN: ${cookieDomain || 'undefined'}`);
  console.log(`  COOKIE_SAMESITE: ${cookieSameSite || 'default'}`);
  console.log(`  Secure Cookies: ${isProduction}`);
  console.log(`  SameSite Default: ${isProduction ? 'none' : 'lax'}`);
  
  // Check CORS configuration
  console.log('\n🌐 CORS Configuration:');
  const corsOrigin = process.env.CORS_ORIGIN;
  const frontendUrl = process.env.FRONTEND_URL;
  
  console.log(`  CORS_ORIGIN: ${corsOrigin || 'default'}`);
  console.log(`  FRONTEND_URL: ${frontendUrl || 'NOT SET'}`);
  
  if (corsOrigin) {
    const origins = corsOrigin.split(',').map(o => o.trim());
    console.log(`  Allowed Origins: ${origins.join(', ')}`);
  } else {
    console.log(`  Default Origins: https://on-demand-video-frontend-production.up.railway.app, http://localhost:3000, http://localhost:3001`);
  }
  
  // Check proxy configuration
  console.log('\n🔄 Proxy Configuration:');
  const trustProxy = process.env.TRUST_PROXY;
  const trustProxyHops = process.env.TRUST_PROXY_HOPS;
  
  console.log(`  TRUST_PROXY: ${trustProxy || 'false'}`);
  console.log(`  TRUST_PROXY_HOPS: ${trustProxyHops || '0'}`);
  
  // Check JWT configuration
  console.log('\n🔑 JWT Configuration:');
  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN;
  
  console.log(`  JWT_SECRET: ${jwtSecret ? 'SET' : '❌ NOT SET'}`);
  console.log(`  JWT_EXPIRES_IN: ${jwtExpiresIn || '7d (default)'}`);
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  
  if (!jwtSecret) {
    console.log('  ❌ JWT_SECRET is required for authentication');
  }
  
  if (isProduction && !cookieDomain) {
    console.log('  ⚠️  COOKIE_DOMAIN should be set in production for proper cookie handling');
  }
  
  if (isProduction && !corsOrigin) {
    console.log('  ⚠️  CORS_ORIGIN should be set in production for security');
  }
  
  if (isProduction && trustProxy !== 'true') {
    console.log('  ⚠️  TRUST_PROXY should be set to true in production if behind a reverse proxy');
  }
  
  console.log('\n✅ Environment check complete');
}

// Run the debug function
debugEnvironment();
