import test from "node:test";
import assert from "node:assert/strict";
import { controlAuthorized } from "../src/auth.js";
import { validateArtifactsPushEvent } from "../src/event-validation.js";

const accountId = "account-1";
const validPushEvent = {
  type: "cf.artifacts.repo.pushed",
  source: { type: "artifacts.repo", namespace: "cortex-git", repoName: "agent-repo" },
  payload: {
    ref: "refs/heads/main",
    before: "0".repeat(40),
    after: "a".repeat(40),
    commits: [],
    totalCommitsCount: 1,
    commitsTruncated: false,
  },
  metadata: { accountId },
};

test("control endpoint authorization rejects missing, wrong, and unconfigured keys", async () => {
  const request = (authorization?: string) => new Request("https://worker.example/api", {
    headers: authorization ? { authorization } : {},
  });

  assert.equal(await controlAuthorized(request(), { CORTEX_CONTROL_KEY: "secret" }), false);
  assert.equal(await controlAuthorized(request("Bearer wrong"), { CORTEX_CONTROL_KEY: "secret" }), false);
  assert.equal(await controlAuthorized(request("Bearer secret"), {}), false);
  assert.equal(await controlAuthorized(request("Bearer secret"), { CORTEX_CONTROL_KEY: "secret" }), true);
});

test("Artifacts push validation accepts the documented event shape", () => {
  const result = validateArtifactsPushEvent(validPushEvent, accountId);
  assert.equal(result.valid, true);
  if (result.valid) assert.equal(result.event.payload.after, "a".repeat(40));
});

test("Artifacts push validation accepts the runtime shape without source.type", () => {
  const { type: _sourceType, ...source } = validPushEvent.source;
  const result = validateArtifactsPushEvent({ ...validPushEvent, source }, accountId);
  assert.equal(result.valid, true);
});

test("Artifacts push validation classifies malformed events without throwing", () => {
  const malformed = { ...validPushEvent, payload: { ...validPushEvent.payload, after: "not-a-commit" } };
  assert.deepEqual(validateArtifactsPushEvent(malformed, accountId), {
    valid: false,
    code: "INVALID_PUSH_EVENT",
  });
  assert.deepEqual(validateArtifactsPushEvent(null, accountId), {
    valid: false,
    code: "INVALID_PUSH_EVENT",
  });
  assert.deepEqual(validateArtifactsPushEvent({
    ...validPushEvent,
    metadata: { accountId: "" },
  }, accountId), {
    valid: false,
    code: "INVALID_PUSH_EVENT",
  });
  assert.deepEqual(validateArtifactsPushEvent({
    ...validPushEvent,
    payload: { ...validPushEvent.payload, after: "A".repeat(40) },
  }, accountId), {
    valid: false,
    code: "INVALID_PUSH_EVENT",
  });
});

test("Artifacts push validation rejects events from a different Cloudflare account", () => {
  const mismatched = { ...validPushEvent, metadata: { accountId: "another-account" } };
  assert.deepEqual(validateArtifactsPushEvent(mismatched, accountId), {
    valid: false,
    code: "ACCOUNT_MISMATCH",
  });
});
