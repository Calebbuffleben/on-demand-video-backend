#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  const prisma = new PrismaClient({
    log: ['error'],
  });

  try {
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Test a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database query successful:', result);

    // Test if we can access the database schema
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('✅ Database schema accessible, tables found:', tables.length);

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('✅ Database connection closed');
  }
}

testDatabaseConnection().catch((error) => {
  console.error('❌ Database test failed:', error);
  process.exit(1);
});
