import { ConfigService } from '@nestjs/config';
import { R2Service } from '../storage/r2.service';

async function readStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

async function main() {
  const config = new ConfigService();
  const r2 = new R2Service(config);

  const bucket = config.get<string>('R2_BUCKET');
  const key = `smoke/${Date.now()}-test.txt`;
  const body = Buffer.from(`hello r2 ${new Date().toISOString()}`);

  console.log('Bucket:', bucket);
  console.log('Uploading to key:', key);
  await r2.putObject(key, body, 'text/plain');
  console.log('Upload OK');

  const { stream, contentType, contentLength } = await r2.getObjectStream(key);
  const buf = await readStream(stream);
  console.log('Downloaded bytes:', buf.length, 'ContentType:', contentType, 'HeaderLength:', contentLength);
  console.log('First bytes:', buf.slice(0, Math.min(64, buf.length)).toString());

  const url = await r2.getPresignedGetUrl(key);
  console.log('Presigned GET URL (short-lived):', url.split('?')[0]);
}

main().catch((e) => {
  console.error('Smoke R2 failed:', e);
  process.exit(1);
});


