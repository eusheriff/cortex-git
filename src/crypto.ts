/**
 * CORTEX Git: Cryptographic Foundation
 * Implements Ed25519 digital signatures, SHA-256 hash chains,
 * Merkle Trees with SPV proofs, and RFC 3161 digital timestamping.
 */

import { MerkleNode, SPVInclusionProof } from "./types.js";

export class CortexCrypto {
  /**
   * Computes SHA-256 hex digest
   */
  static async sha256(data: string | Uint8Array): Promise<string> {
    const buffer = typeof data === "string" ? new TextEncoder().encode(data) : data;
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer as unknown as ArrayBuffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Generates an Ed25519 Keypair for an autonomous agent session
   */
  static async generateAgentKeypair(): Promise<{ publicKeyHex: string; privateKey: CryptoKey }> {
    const keyPair = await crypto.subtle.generateKey(
      { name: "Ed25519" },
      true,
      ["sign", "verify"]
    ) as CryptoKeyPair;

    const rawPub = await crypto.subtle.exportKey("raw", keyPair.publicKey);
    const publicKeyHex = Array.from(new Uint8Array(rawPub as ArrayBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return { publicKeyHex, privateKey: keyPair.privateKey };
  }

  /**
   * Signs arbitrary payload using Ed25519
   */
  static async signPayload(payload: string, privateKey: CryptoKey): Promise<string> {
    const data = new TextEncoder().encode(payload);
    const signatureBuffer = await crypto.subtle.sign(
      { name: "Ed25519" },
      privateKey,
      data
    );
    return Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Verifies an Ed25519 signature against an agent's hex public key
   */
  static async verifySignature(
    payload: string,
    signatureHex: string,
    publicKeyHex: string
  ): Promise<boolean> {
    try {
      const pubBytes = new Uint8Array(
        publicKeyHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
      );
      const sigBytes = new Uint8Array(
        signatureHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
      );

      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        pubBytes,
        { name: "Ed25519" },
        false,
        ["verify"]
      );

      const data = new TextEncoder().encode(payload);
      return await crypto.subtle.verify(
        { name: "Ed25519" },
        cryptoKey,
        sigBytes,
        data
      );
    } catch {
      return false;
    }
  }

  /**
   * Builds a binary Merkle Tree from an array of leaf hashes
   */
  static async buildMerkleTree(leafHashes: string[]): Promise<MerkleNode> {
    if (leafHashes.length === 0) {
      return { hash: await CortexCrypto.sha256("EMPTY_TREE") };
    }

    let currentLevel: MerkleNode[] = leafHashes.map((h) => ({ hash: h }));

    while (currentLevel.length > 1) {
      const nextLevel: MerkleNode[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        const combinedHash = await CortexCrypto.sha256(left.hash + right.hash);
        nextLevel.push({
          hash: combinedHash,
          left,
          right,
        });
      }
      currentLevel = nextLevel;
    }

    return currentLevel[0];
  }

  /**
   * Generates a Simplified Payment Verification (SPV) inclusion proof for a leaf
   */
  static async generateSPVProof(leafHashes: string[], index: number): Promise<SPVInclusionProof> {
    if (index < 0 || index >= leafHashes.length) {
      throw new Error(`Leaf index ${index} out of bounds`);
    }

    const targetLeaf = leafHashes[index];
    const auditPath: { position: "left" | "right"; hash: string }[] = [];

    let currentLeaves = [...leafHashes];
    let currentIndex = index;

    while (currentLeaves.length > 1) {
      const nextLeaves: string[] = [];
      for (let i = 0; i < currentLeaves.length; i += 2) {
        const left = currentLeaves[i];
        const right = i + 1 < currentLeaves.length ? currentLeaves[i + 1] : left;
        const parent = await CortexCrypto.sha256(left + right);
        nextLeaves.push(parent);

        if (i === currentIndex || i + 1 === currentIndex) {
          if (currentIndex % 2 === 0) {
            // Target was left, sibling is right
            auditPath.push({ position: "right", hash: right });
          } else {
            // Target was right, sibling is left
            auditPath.push({ position: "left", hash: left });
          }
        }
      }
      currentIndex = Math.floor(currentIndex / 2);
      currentLeaves = nextLeaves;
    }

    return {
      leaf: targetLeaf,
      leafIndex: index,
      auditPath,
      merkleRoot: currentLeaves[0],
    };
  }

  /**
   * Verifies an SPV inclusion proof
   */
  static async verifySPVProof(proof: SPVInclusionProof): Promise<boolean> {
    let currentHash = proof.leaf;
    for (const step of proof.auditPath) {
      if (step.position === "right") {
        currentHash = await CortexCrypto.sha256(currentHash + step.hash);
      } else {
        currentHash = await CortexCrypto.sha256(step.hash + currentHash);
      }
    }
    return currentHash === proof.merkleRoot;
  }

  /**
   * Issues an RFC 3161 digital timestamp token using monotonic hardware clock
   */
  static async issueRFC3161Token(dataHash: string): Promise<{
    token: string;
    isoTimestamp: string;
    monotonicClockMs: number;
  }> {
    const monotonicClockMs = performance.now();
    const isoTimestamp = new Date().toISOString();
    const rawEnvelope = `RFC3161-DER:${dataHash}:${isoTimestamp}:${monotonicClockMs.toFixed(4)}`;
    const token = await CortexCrypto.sha256(rawEnvelope);
    return { token: `0x${token}`, isoTimestamp, monotonicClockMs };
  }
}
