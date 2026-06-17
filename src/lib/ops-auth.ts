/** Private ops gate — set MERIDIAN_OPS_KEY on Vercel Production. */
export function opsKeyFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  return url.searchParams.get("key") ?? request.headers.get("x-meridian-ops-key");
}

export function isOpsAuthorized(request: Request): boolean {
  const secret = process.env.MERIDIAN_OPS_KEY?.trim();
  if (!secret) return false;
  const key = opsKeyFromRequest(request);
  return Boolean(key && key === secret);
}
