interface Env {
  CORTEX_CONTROL_KEY?: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  DB: D1Database;
  ARTIFACTS: any;
  GOVERNANCE_WORKFLOW: any;
  CORTEX_KV?: KVNamespace;
}
