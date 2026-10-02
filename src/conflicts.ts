export interface LineConflict {
  path: string;
  baseStartLine: number;
  baseEndLine: number;
  base: string[];
  candidateA: string[];
  candidateB: string[];
}

interface Hunk {
  start: number;
  end: number;
  replacement: string[];
}

function hunks(baseText: string, changedText: string): Hunk[] {
  const base = baseText.split("\n");
  const changed = changedText.split("\n");
  if (base.length > 1_000 || changed.length > 1_000) throw new Error("Conflict comparison exceeds 1,000 lines per file");

  const rows = base.length + 1;
  const columns = changed.length + 1;
  const table = Array.from({ length: rows }, () => new Uint16Array(columns));
  for (let i = base.length - 1; i >= 0; i -= 1) {
    for (let j = changed.length - 1; j >= 0; j -= 1) {
      table[i][j] = base[i] === changed[j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const result: Hunk[] = [];
  let i = 0;
  let j = 0;
  let baseLine = 0;
  let current: Hunk | null = null;
  const begin = () => {
    current ??= { start: baseLine, end: baseLine, replacement: [] };
  };
  const finish = () => {
    if (current) result.push(current);
    current = null;
  };

  while (i < base.length || j < changed.length) {
    if (i < base.length && j < changed.length && base[i] === changed[j]) {
      finish();
      i += 1;
      j += 1;
      baseLine += 1;
    } else if (i < base.length && (j === changed.length || table[i + 1][j] >= table[i][j + 1])) {
      begin();
      i += 1;
      baseLine += 1;
      current!.end = baseLine;
    } else {
      begin();
      current!.replacement.push(changed[j]);
      j += 1;
    }
  }
  finish();
  return result;
}

function overlaps(a: Hunk, b: Hunk): boolean {
  if (a.start === a.end && b.start === b.end) return a.start === b.start;
  if (a.start === a.end) return a.start >= b.start && a.start <= b.end;
  if (b.start === b.end) return b.start >= a.start && b.start <= a.end;
  return Math.max(a.start, b.start) < Math.min(a.end, b.end);
}

export function detectLineConflicts(
  path: string,
  baseText: string,
  candidateAText: string,
  candidateBText: string,
): LineConflict[] {
  const base = baseText.split("\n");
  const a = hunks(baseText, candidateAText);
  const b = hunks(baseText, candidateBText);
  const conflicts: LineConflict[] = [];

  for (const left of a) {
    for (const right of b) {
      if (!overlaps(left, right)) continue;
      if (left.start === right.start && left.end === right.end &&
          left.replacement.join("\n") === right.replacement.join("\n")) continue;
      const start = Math.min(left.start, right.start);
      const end = Math.max(left.end, right.end);
      conflicts.push({
        path,
        baseStartLine: start + 1,
        baseEndLine: end,
        base: base.slice(start, end),
        candidateA: left.replacement,
        candidateB: right.replacement,
      });
    }
  }
  return conflicts;
}
