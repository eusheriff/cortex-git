CREATE TABLE agents (
  account_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  name TEXT NOT NULL,
  model TEXT NOT NULL,
  public_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (account_id, agent_id)
);

CREATE TABLE tasks (
  account_id TEXT NOT NULL,
  namespace TEXT NOT NULL,
  task_id TEXT NOT NULL,
  source_repo TEXT NOT NULL,
  base_commit_sha TEXT NOT NULL,
  description TEXT NOT NULL,
  expected_agents INTEGER NOT NULL CHECK (expected_agents > 0),
  status TEXT NOT NULL DEFAULT 'OPEN',
  resolution_conflict_id TEXT,
  created_at TEXT NOT NULL,
  PRIMARY KEY (account_id, namespace, task_id)
);

CREATE TABLE workspaces (
  account_id TEXT NOT NULL,
  namespace TEXT NOT NULL,
  repository TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  remote TEXT NOT NULL,
  token_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  token_expires_at TEXT NOT NULL,
  base_commit_sha TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'candidate',
  created_at TEXT NOT NULL,
  PRIMARY KEY (account_id, namespace, repository),
  FOREIGN KEY (account_id, agent_id) REFERENCES agents(account_id, agent_id),
  FOREIGN KEY (account_id, namespace, task_id) REFERENCES tasks(account_id, namespace, task_id)
);

CREATE TABLE governance_events (
  event_key TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  namespace TEXT NOT NULL,
  repository TEXT NOT NULL,
  ref TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  anomaly_json TEXT,
  received_at TEXT NOT NULL,
  processing_started_at TEXT,
  processed_at TEXT,
  UNIQUE (account_id, namespace, repository, ref, commit_sha)
);

CREATE TABLE attestations (
  account_id TEXT NOT NULL,
  namespace TEXT NOT NULL,
  repository TEXT NOT NULL,
  ref TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  signature_hex TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (account_id, namespace, repository, ref, commit_sha),
  FOREIGN KEY (account_id, agent_id) REFERENCES agents(account_id, agent_id)
);

CREATE TABLE commits (
  event_key TEXT PRIMARY KEY,
  parent_sha TEXT NOT NULL,
  agent_id TEXT,
  task_id TEXT,
  commit_metadata_json TEXT NOT NULL,
  changed_paths_json TEXT NOT NULL,
  content_sha256 TEXT NOT NULL,
  evaluation_status TEXT NOT NULL,
  retrieved_at TEXT NOT NULL,
  FOREIGN KEY (event_key) REFERENCES governance_events(event_key)
);

CREATE TABLE decisions (
  event_key TEXT PRIMARY KEY,
  decision TEXT NOT NULL CHECK (decision IN ('ALLOW', 'DENY', 'ESCALATE')),
  outcome_json TEXT NOT NULL,
  decided_at TEXT NOT NULL,
  FOREIGN KEY (event_key) REFERENCES governance_events(event_key)
);

CREATE TABLE promotions (
  event_key TEXT PRIMARY KEY,
  state TEXT NOT NULL CHECK (state IN ('PENDING', 'AUTHORIZED', 'BLOCKED', 'FROZEN', 'CONFLICT', 'RESOLVED')),
  updated_at TEXT NOT NULL,
  FOREIGN KEY (event_key) REFERENCES governance_events(event_key)
);

CREATE TABLE promotion_transitions (
  transition_id TEXT PRIMARY KEY,
  event_key TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (event_key) REFERENCES governance_events(event_key)
);

CREATE TABLE approvals (
  approval_id TEXT PRIMARY KEY,
  event_key TEXT NOT NULL UNIQUE,
  account_id TEXT NOT NULL,
  namespace TEXT NOT NULL,
  repository TEXT NOT NULL,
  ref TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  required_approvals INTEGER NOT NULL CHECK (required_approvals > 0),
  received_approvals INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('PENDING_HUMAN_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED')),
  FOREIGN KEY (event_key) REFERENCES governance_events(event_key)
);

CREATE TABLE approval_votes (
  approval_id TEXT NOT NULL,
  approver_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED')),
  signed_at TEXT NOT NULL,
  PRIMARY KEY (approval_id, approver_id),
  FOREIGN KEY (approval_id) REFERENCES approvals(approval_id)
);

CREATE TABLE approvers (
  account_id TEXT NOT NULL,
  approver_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT,
  PRIMARY KEY (account_id, approver_id),
  UNIQUE (account_id, token_hash)
);

CREATE TABLE conflicts (
  conflict_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  namespace TEXT NOT NULL,
  task_id TEXT NOT NULL,
  base_commit_sha TEXT NOT NULL,
  candidate_a_sha TEXT NOT NULL,
  candidate_b_sha TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('CONFLICT_DETECTED', 'RESOLUTION_PENDING', 'RESOLVED')),
  resolution_event_key TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  UNIQUE (account_id, namespace, task_id),
  FOREIGN KEY (account_id, namespace, task_id) REFERENCES tasks(account_id, namespace, task_id)
);

CREATE TABLE conflict_transitions (
  transition_id TEXT PRIMARY KEY,
  conflict_id TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (conflict_id) REFERENCES conflicts(conflict_id)
);

CREATE INDEX governance_events_by_commit ON governance_events(commit_sha);
CREATE INDEX governance_events_by_identity ON governance_events(account_id, namespace, repository, ref, commit_sha);
CREATE INDEX approvals_pending ON approvals(status, expires_at);
CREATE INDEX conflicts_unresolved ON conflicts(status, created_at);
CREATE INDEX promotions_by_state ON promotions(state, updated_at);
