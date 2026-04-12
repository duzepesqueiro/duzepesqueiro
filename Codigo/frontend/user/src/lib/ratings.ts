export type RatingSubjectType = "event" | "rental" | "product";

export interface RatingPrompt {
  id: number; // subject id
  type: RatingSubjectType;
  name: string;
}

const KEY = "duze_rating_prompts";

function readQueue(): RatingPrompt[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeQueue(q: RatingPrompt[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(q));
  } catch {}
}

export function enqueueRatingPrompt(prompt: RatingPrompt) {
  const q = readQueue();
  // avoid duplicates for same id/type
  if (!q.some((p) => p.id === prompt.id && p.type === prompt.type)) {
    q.push(prompt);
    writeQueue(q);
  }
}

export function peekRatingPrompt(): RatingPrompt | undefined {
  const q = readQueue();
  return q[0];
}

export function dequeueRatingPrompt(id: number) {
  const q = readQueue().filter((p) => p.id !== id);
  writeQueue(q);
}

export function clearRatingPrompts() {
  writeQueue([]);
}