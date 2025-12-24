export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function choice<T>(arr: T[]): T | undefined {
  if (!arr.length) return undefined;
  const index = Math.floor(Math.random() * arr.length);
  return arr[index];
}
