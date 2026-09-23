type PackPlacement = "top" | "bottom";

export const PACK_OPEN_TRANSITION_TYPE = "pack-open";
export const PACK_CLOSE_TRANSITION_TYPE = "pack-close";

export function getPackTransitionName(packId: string, placement: PackPlacement) {
  return `pack-${placement}-${packId}`;
}
