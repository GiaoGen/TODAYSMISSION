export type PackCarouselReturnState = {
  activeIndex?: number;
  count?: number;
  packId: string;
  position?: number;
};

let returnState: PackCarouselReturnState | null = null;

export function getPackCarouselReturnState() {
  return returnState;
}

export function setPackCarouselReturnState(state: PackCarouselReturnState) {
  returnState = state;
}
