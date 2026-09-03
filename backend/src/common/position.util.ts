const POSITION_GAP = 1000;

/**
 * Computes a fractional position for an item being inserted between two
 * existing items (either may be undefined for "at the start"/"at the end").
 * This is the classic fractional-indexing trick: moving/reordering an item
 * only ever touches that one row, never its siblings, so concurrent moves
 * can't conflict or require a cascading renumber.
 */
export function computePosition(prev?: number | null, next?: number | null): number {
  if (prev == null && next == null) return POSITION_GAP;
  if (prev == null && next != null) return next - POSITION_GAP;
  if (prev != null && next == null) return prev + POSITION_GAP;
  return (prev! + next!) / 2;
}
