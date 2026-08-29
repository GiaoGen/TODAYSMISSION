export const PACK_OPEN_TRANSITION_TYPE = "pack-open";
export const PACK_CLOSE_TRANSITION_TYPE = "pack-close";

export function getPackTransitionName(packId: string) {
  return `pack-${packId}`;
}
