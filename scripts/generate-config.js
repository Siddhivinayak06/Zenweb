const fs = require('fs');
const path = require('path');

function parseEnv(envContent) {
  const env = {};
  const lines = envContent.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    // Remove matching quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function createConfigContent(values) {
  return [
    'globalThis.ZenWebConfig = {',
    `    SUPABASE_URL: ${JSON.stringify(values.SUPABASE_URL)},`,
    `    SUPABASE_KEY: ${JSON.stringify(values.SUPABASE_KEY)},`,
    `    STRIPE_PAYMENT_LINK: ${JSON.stringify(values.STRIPE_PAYMENT_LINK)},`,
    `    GEMINI_API_KEY: ${JSON.stringify(values.GEMINI_API_KEY)}`,
    '};',
    ''
  ].join('\n');
}

function createWebsiteConfigContent(values) {
  return [
    'globalThis.ZenWebConfig = {',
    `    SUPABASE_URL: ${JSON.stringify(values.SUPABASE_URL)},`,
    `    SUPABASE_KEY: ${JSON.stringify(values.SUPABASE_KEY)},`,
    `    STRIPE_PAYMENT_LINK: ${JSON.stringify(values.STRIPE_PAYMENT_LINK)}`,
    '};',
    ''
  ].join('\n');
}

function main() {
  const rootDir = path.resolve(__dirname, '..');
  const envPath = path.join(rootDir, '.env');
  const configPath = path.join(rootDir, 'config.js');
  const websiteConfigPath = path.join(rootDir, 'website', 'config.js');

  if (!fs.existsSync(envPath)) {
    throw new Error('Missing .env file at project root.');
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = parseEnv(envContent);

  const requiredKeys = [
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'STRIPE_PAYMENT_LINK',
    'GEMINI_API_KEY'
  ];

  const missing = requiredKeys.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required .env keys: ${missing.join(', ')}`);
  }

  fs.writeFileSync(configPath, createConfigContent(env), 'utf8');
  fs.writeFileSync(websiteConfigPath, createWebsiteConfigContent(env), 'utf8');

  console.log('Generated config.js and website/config.js from .env');
}

function runWatchMode() {
  const rootDir = path.resolve(__dirname, '..');
  const envPath = path.join(rootDir, '.env');

  if (!fs.existsSync(envPath)) {
    throw new Error('Missing .env file at project root.');
  }

  let debounceTimer = null;

  const regenerate = () => {
    try {
      main();
    } catch (error) {
      console.error(`Config generation failed: ${error.message}`);
    }
  };

  regenerate();
  console.log('Watching .env for changes...');

  fs.watch(envPath, () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(regenerate, 100);
  });
}

try {
  const watchMode = process.argv.includes('--watch');
  if (watchMode) {
    runWatchMode();
  } else {
    main();
  }
} catch (error) {
  console.error(`Config generation failed: ${error.message}`);
  process.exit(1);
}
