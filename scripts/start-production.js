#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting production application...');

// Check if dist directory exists
const distPath = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distPath)) {
  console.error('❌ Dist directory not found. Please run npm run build first.');
  process.exit(1);
}

// Check if main.js exists
const mainPath = path.join(distPath, 'main.js');
if (!fs.existsSync(mainPath)) {
  console.error('❌ main.js not found in dist directory.');
  process.exit(1);
}

console.log('✅ Build artifacts found');

// Set environment variables
process.env.NODE_ENV = 'production';

// Start the application
const app = spawn('node', ['--max-old-space-size=512', 'dist/main.js'], {
  stdio: 'inherit',
  env: process.env
});

app.on('error', (err) => {
  console.error('❌ Failed to start application:', err);
  process.exit(1);
});

app.on('exit', (code) => {
  console.log(`Application exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  app.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  app.kill('SIGINT');
});
