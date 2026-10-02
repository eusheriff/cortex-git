import { CortexCrypto } from "./crypto.js";

const MAX_TREE_ENTRIES = 5_000;
const MAX_CHANGED_CONTENT_BYTES = 4 * 1024 * 1024;

export interface CommitEvidence {
  commit: ArtifactsCommitMetadata;
  parent: ArtifactsCommitMetadata | null;
  changedPaths: string[];
  changedFileContent: string;
  contentSha256: string;
  baseFiles: Map<string, string>;
  changedFiles: Map<string, string>;
}

async function flattenTree(repo: ArtifactsRepo, treeHash: string): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  const pending: Array<{ hash: string; prefix: string }> = [{ hash: treeHash, prefix: "" }];
  let visited = 0;

  while (pending.length) {
    const current = pending.pop()!;
    const entries = await repo.readTree(current.hash);
    if (entries === null) throw new Error(`Artifacts tree ${current.hash} is missing`);
    for (const entry of entries) {
      visited += 1;
      if (visited > MAX_TREE_ENTRIES) throw new Error("Commit tree exceeds governance scan limit");
      const path = current.prefix ? `${current.prefix}/${entry.name}` : entry.name;
      if (entry.type === "tree") pending.push({ hash: entry.hash, prefix: path });
      else files.set(path, entry.hash);
    }
  }
  return files;
}

async function readTextBlob(repo: ArtifactsRepo, objectId: string): Promise<{ text: string; bytes: number }> {
  const blob = await repo.readBlob(objectId);
  if (blob === null) throw new Error(`Artifacts blob ${objectId} is missing`);
  const bytes = await blob.arrayBuffer();
  return { text: new TextDecoder("utf-8", { fatal: false }).decode(bytes), bytes: bytes.byteLength };
}

export async function readCommitEvidence(repo: ArtifactsRepo, commitSha: string): Promise<CommitEvidence> {
  const commit = await repo.readCommit(commitSha);
  if (!commit || commit.hash !== commitSha) throw new Error(`Artifacts commit ${commitSha} is unavailable`);
  const parent = commit.parents.length ? await repo.readCommit(commit.parents[0]) : null;
  if (commit.parents.length && !parent) throw new Error(`Artifacts parent ${commit.parents[0]} is unavailable`);

  const [currentFiles, baseFiles] = await Promise.all([
    flattenTree(repo, commit.treeHash),
    parent ? flattenTree(repo, parent.treeHash) : Promise.resolve(new Map<string, string>()),
  ]);
  const changedPaths = [...new Set([...currentFiles.keys(), ...baseFiles.keys()])]
    .filter((path) => currentFiles.get(path) !== baseFiles.get(path))
    .sort();

  const changedFileContentParts: string[] = [];
  let contentBytes = 0;
  const changedFiles = new Map<string, string>();
  for (const path of changedPaths) {
    const objectId = currentFiles.get(path);
    if (!objectId) {
      changedFileContentParts.push(`--- ${path} (deleted)`);
      continue;
    }
    const content = await readTextBlob(repo, objectId);
    contentBytes += content.bytes;
    if (contentBytes > MAX_CHANGED_CONTENT_BYTES) throw new Error("Changed content exceeds governance scan limit");
    changedFiles.set(path, content.text);
    changedFileContentParts.push(`+++ ${path}\n${content.text}`);
  }

  const changedFileContent = changedFileContentParts.join("\n");
  return {
    commit,
    parent,
    changedPaths,
    changedFileContent,
    contentSha256: await CortexCrypto.sha256(changedFileContent),
    baseFiles,
    changedFiles,
  };
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function eventIdentity(input: {
  accountId: string;
  namespace: string;
  repository: string;
  ref: string;
  commitSha: string;
}): string {
  return [input.accountId, input.namespace, input.repository, input.ref, input.commitSha].join(":");
}
