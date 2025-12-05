import * as esbuild from 'esbuild';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

// Find all Lambda function directories (exclude test directories)
const lambdaDir = './lambda';
const lambdaDirs = readdirSync(lambdaDir).filter(file => {
  const fullPath = join(lambdaDir, file);
  // Exclude test directories and non-directory files
  return statSync(fullPath).isDirectory() && !file.startsWith('__') && file !== '__tests__';
});

console.log(`Building Lambda functions: ${lambdaDirs.join(', ')}`);

// Build each Lambda function
const buildPromises = lambdaDirs.map(async (dir) => {
  const entryPoint = join(lambdaDir, dir, 'index.ts');
  const outfile = join('dist', dir, 'index.js');
  
  console.log(`Building ${dir}...`);
  
  await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    outfile: outfile,
    external: ['@aws-sdk/*'],
    sourcemap: true,
    minify: false,
    keepNames: true,
    logLevel: 'info'
  });
  
  console.log(`✓ Built ${dir}`);
});

try {
  await Promise.all(buildPromises);
  console.log('\n✓ All Lambda functions built successfully');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
