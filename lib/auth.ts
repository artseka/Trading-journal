const COOKIE_NAME = "tj_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

function base64Url(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signature(value: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return base64Url(new Uint8Array(signed));
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function credentialsAreValid(username: string, password: string) {
  const expectedUsername = process.env.APP_USERNAME || "";
  const expectedPassword = process.env.APP_PASSWORD || "";
  if (!expectedUsername || !expectedPassword) return false;
  const [supplied, expected] = await Promise.all([
    signature(`${username}\u0000${password}`),
    signature(`${expectedUsername}\u0000${expectedPassword}`),
  ]);
  return constantTimeEqual(supplied, expected);
}

export async function createSessionToken(username: string) {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `${username}.${expires}`;
  return `${payload}.${await signature(payload)}`;
}

export async function sessionIsValid(token?: string) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [username, expiresText, suppliedSignature] = parts;
  const expires = Number(expiresText);
  if (!username || !Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return false;
  if (username !== process.env.APP_USERNAME) return false;
  const expectedSignature = await signature(`${username}.${expiresText}`);
  return constantTimeEqual(suppliedSignature, expectedSignature);
}

export const authCookie = {
  name: COOKIE_NAME,
  maxAge: SESSION_SECONDS,
};
