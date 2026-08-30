import type { CarouselSnapshot } from "./home-carousel-state";

export type CarouselHandle = {
  freezeAndSnapshot: () => CarouselSnapshot | null;
  resume: () => void;
  getElement: () => HTMLElement | null;
};
