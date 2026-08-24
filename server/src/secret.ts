export function internalSecret() {
  return (process.env.GAME_JWT_SECRET ?? process.env.INTERNAL_API_SECRET ?? '').trim();
}

export function webUrl() {
  return (
    process.env.WEB_APP_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    'http://localhost:3000'
  );
}
