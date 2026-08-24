interface Check {
  key: string;
  required: boolean;
  hint: string;
}

const CHECKS: Check[] = [
  { key: 'GAME_SERVER_PORT', required: false, hint: 'defaults to 4000' },
  { key: 'CORS_ORIGINS', required: false, hint: 'defaults to http://localhost:3000' },
  { key: 'WEB_APP_URL', required: false, hint: 'needed to save match results' },
  { key: 'GAME_JWT_SECRET', required: false, hint: 'sockets run open and nothing is saved' },
];

export function checkEnv() {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const check of CHECKS) {
    const value = process.env[check.key]?.trim();
    if (value) continue;

    if (check.required) missing.push(`${check.key} is required (${check.hint})`);
    else warnings.push(`${check.key} is not set, ${check.hint}`);
  }

  const uri = process.env.MONGODB_URI?.trim();
  if (uri && (uri.startsWith('MONGODB_URI=') || !/^mongodb(\+srv)?:\/\//.test(uri))) {
    warnings.push('MONGODB_URI does not look like a mongo url, check the .env file');
  }

  for (const warning of warnings) console.warn('config:', warning);

  if (missing.length > 0) {
    for (const problem of missing) console.error('config:', problem);
    process.exit(1);
  }

  const origins = (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean);
  if (process.env.NODE_ENV === 'production' && origins.some((origin) => origin.includes('localhost'))) {
    console.warn('config: CORS_ORIGINS still points at localhost in production');
  }
}
