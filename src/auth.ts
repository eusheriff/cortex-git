import { timingSafeEqual as nodeTimingSafeEqual } from "node:crypto";

interface ControlKeyEnv {
  CORTEX_CONTROL_KEY?: string;
}

async function equalSecret(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  const subtle = crypto.subtle as SubtleCrypto & {
    timingSafeEqual?: (a: ArrayBuffer, b: ArrayBuffer) => boolean;
  };
  return subtle.timingSafeEqual
    ? subtle.timingSafeEqual(left, right)
    : nodeTimingSafeEqual(new Uint8Array(left), new Uint8Array(right));
}

export async function controlAuthorized(request: Request, env: ControlKeyEnv): Promise<boolean> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return Boolean(env.CORTEX_CONTROL_KEY && await equalSecret(token, env.CORTEX_CONTROL_KEY));
}
