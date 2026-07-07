const SMO_PREFIX = "SMO-";

export function toSmoCode(sequence: number): string {
  return `${SMO_PREFIX}${String(sequence).padStart(3, "0")}`;
}
