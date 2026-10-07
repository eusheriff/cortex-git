import type { ArtifactsPushEvent } from "./types.js";

export type PushEventValidation =
  | { valid: true; event: ArtifactsPushEvent }
  | { valid: false; code: "INVALID_PUSH_EVENT" | "ACCOUNT_MISMATCH" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Validate the identity fields needed before governance processing or D1 writes. */
export function validateArtifactsPushEvent(value: unknown, expectedAccountId: string): PushEventValidation {
  if (!isRecord(value) || value.type !== "cf.artifacts.repo.pushed" ||
      !isRecord(value.source) ||
      (value.source.type !== undefined && value.source.type !== "artifacts.repo") ||
      !nonEmptyString(value.source.namespace) || !nonEmptyString(value.source.repoName) ||
      !isRecord(value.payload) || !nonEmptyString(value.payload.ref) ||
      typeof value.payload.after !== "string" || !/^[0-9a-f]{40}$/.test(value.payload.after)) {
    return { valid: false, code: "INVALID_PUSH_EVENT" };
  }

  if (!expectedAccountId) return { valid: false, code: "INVALID_PUSH_EVENT" };
  if (value.metadata !== undefined) {
    if (!isRecord(value.metadata) ||
        (value.metadata.accountId !== undefined && !nonEmptyString(value.metadata.accountId))) {
      return { valid: false, code: "INVALID_PUSH_EVENT" };
    }
    if (value.metadata.accountId !== undefined && value.metadata.accountId !== expectedAccountId) {
      return { valid: false, code: "ACCOUNT_MISMATCH" };
    }
  }

  return { valid: true, event: value as unknown as ArtifactsPushEvent };
}
