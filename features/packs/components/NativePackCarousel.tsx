"use client";

import type { CSSProperties } from "react";
import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, ViewTransition } from "react";
import { useRouter } from "next/navigation";
import type { ArcCarouselProps } from "./ArcCarousel";
import { PackDeck } from "./PackDeck";
import { COLLECTION_LABELS } from "../model/home-carousel-state";
import { getDeckMetrics } from "../model/arc-carousel-geometry";
import { getInitialCarouselState, getPackCarouselReturnState } from "../model/pack-carousel-return-state";
import { getNativeCopyCount, wrapNativeIndex } from "../model/safari-scroll";
import { createNativeScrollController, type NativeScrollController } from "../model/native-scroll-controller";
import { useDeckViewport } from "../model/use-deck-viewport";
import { getPackTransitionName, PACK_CLOSE_TRANSITION_TYPE, PACK_OPEN_TRANSITION_TYPE } from "../model/pack-transition";
import styles from "./ArcCarousel.module.css";

export function NativePackCarousel({ packs, placement = "bottom", collection = placement === "top" ? "joined" : "all", initialCarouselState, interactionDisabled = false, swappingIn = false, onOpenPack, ref }: ArcCarouselProps) {
  const router = useRouter();
  const liveViewport = useDeckViewport();
  const [viewport, setViewport] = useState(liveViewport);
  const metrics = getDeckMetrics({ ...viewport, placement });
  const maximumCount = Math.min(24, packs.length);
  const [initial] = useState(() => initialCarouselState ?? getInitialCarouselState(packs, maximumCount, placement, getPackCarouselReturnState()));
  const [count, setCount] = useState(initial.count);
  const copies = getNativeCopyCount(count, viewport.width, metrics.gap, count >= 6);
  const primaryCopy = Math.floor(copies / 2);
  const [activeIndex, setActiveIndex] = useState(initial.activeIndex);
  const rootRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<NativeScrollController | null>(null);
  const positionRef = useRef(initial.position);
  const lockedRef = useRef(interactionDisabled);
  const slotRefs = useRef<Array<HTMLLIElement | null>>([]);
  const focusRef = useRef(-1);
  const nativeLayoutRef = useRef({ count, copies, stride: metrics.gap });

  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const paintSelection = ({ index, slot, position }: { index: number; slot: number; position: number }) => {
      positionRef.current = position;
      for (let current = Math.max(0, focusRef.current - 2); current <= focusRef.current + 2; current++) {
        if (slotRefs.current[current]) delete slotRefs.current[current]!.dataset.nativeDistance;
      }
      focusRef.current = slot;
      for (let current = Math.max(0, slot - 2); current <= slot + 2; current++) {
        if (slotRefs.current[current]) slotRefs.current[current]!.dataset.nativeDistance = String(Math.abs(current - slot));
      }
      setActiveIndex(previous => previous === index ? previous : index);
    };
    const controller = createNativeScrollController(scroller, {
      ...nativeLayoutRef.current, position: positionRef.current,
      disabled: lockedRef.current,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      onSettled: paintSelection,
    });
    controllerRef.current = controller;
    return () => {
      positionRef.current = controller.position();
      controller.destroy();
      controllerRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    if (liveViewport.width === viewport.width && liveViewport.height === viewport.height && liveViewport.coarsePointer === viewport.coarsePointer) return;
    controllerRef.current?.whenIdle(() => { setViewport(liveViewport); });
  }, [liveViewport, viewport]);

  useLayoutEffect(() => {
    const layout = { count, copies, stride: metrics.gap };
    const previous = nativeLayoutRef.current;
    if (previous.count === count && previous.copies === copies && previous.stride === metrics.gap) return;
    nativeLayoutRef.current = layout;
    controllerRef.current?.whenIdle(() => {
      controllerRef.current?.restore(layout, positionRef.current);
    });
  }, [count, copies, metrics.gap]);

  useImperativeHandle(ref, () => ({
    freezeAndSnapshot() {
      lockedRef.current = true;
      const position = controllerRef.current?.freeze() ?? positionRef.current;
      const index = wrapNativeIndex(Math.round(position), count);
      return count > 0 ? { count, position, activeIndex: index, packId: packs[index].id } : null;
    },
    resume() { lockedRef.current = false; controllerRef.current?.resume(); },
    getElement: () => rootRef.current,
  }), [count, packs]);

  useEffect(() => {
    if (packs[activeIndex] && count > 0) router.prefetch(`/pack/${encodeURIComponent(packs[activeIndex].slug)}`);
  }, [activeIndex, count, packs, router]);

  const changeCount = (delta: number) => {
    if (interactionDisabled || lockedRef.current || maximumCount === 0) return;
    const nextCount = Math.max(1, Math.min(maximumCount, count + delta));
    const position = controllerRef.current?.freeze() ?? activeIndex;
    positionRef.current = Math.min(wrapNativeIndex(Math.round(position), count), nextCount - 1);
    setCount(nextCount);
    controllerRef.current?.resume();
  };
  const openCard = (slot: number, index: number) => {
    const controller = controllerRef.current;
    if (interactionDisabled || lockedRef.current || !controller?.canActivate()) return;
    if (Math.abs(controller.position() + primaryCopy * count - slot) > .01) controller.selectSlot(slot);
    else onOpenPack(packs[index], placement);
  };
  const style = {
    "--card-width": `${metrics.cardWidth}px`, "--card-height": `${metrics.cardHeight}px`,
    "--deck-unit": `${metrics.unit}px`, "--deck-title-size": `${metrics.titleSize}px`,
    "--native-stride": `${metrics.gap}px`, "--native-edge": `${Math.max(0, (viewport.width - metrics.gap) / 2)}px`,
    "--native-center-y": `${metrics.centerY - (placement === "bottom" ? viewport.height / 2 : 0)}px`,
    "--native-direction": placement === "top" ? -1 : 1,
  } as CSSProperties;
  const enterClass = placement === "top" ? "pack-home-top-enter" : "pack-home-enter";
  const exitClass = placement === "top" ? "pack-home-top-exit" : "pack-home-exit";

  return (
    <ViewTransition default="none" enter={{ [PACK_CLOSE_TRANSITION_TYPE]: enterClass, default: enterClass }} exit={{ [PACK_OPEN_TRANSITION_TYPE]: exitClass, default: "none" }}>
      <section className={styles.root} data-native-scroll="true" data-placement={placement} data-swapping-in={swappingIn} inert={interactionDisabled} ref={rootRef} style={style}
        aria-label={`${placement === "top" ? "上轮盘" : "下轮盘"}：${COLLECTION_LABELS[collection]}（模拟数据）/ ${collection === "joined" ? "Joined" : "All"} packs (mock)`}>
        <div className={styles.nativeViewport} ref={scrollRef} role="group" tabIndex={count > 0 ? 0 : -1}
          onKeyDown={event => {
            if (interactionDisabled || lockedRef.current || count <= 1 || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
            event.preventDefault();
            const current = controllerRef.current;
            if (current) current.selectSlot(primaryCopy * count + Math.round(current.position()) + (event.key === "ArrowRight" ? 1 : -1));
          }}>
          <ol className={styles.nativeTrack}>
            {Array.from({ length: copies }, (_, copy) => packs.slice(0, count).map((pack, index) => {
              const slot = copy * count + index;
              const primary = copy === primaryCopy;
              const active = primary && index === activeIndex;
              const name = getPackTransitionName(pack.id, placement);
              return (
                <li className={styles.nativeSlot} key={`${copy}-${pack.id}`} aria-hidden={primary ? undefined : true} ref={element => { slotRefs.current[slot] = element; }}>
                  <button className={`${styles.card} ${styles.nativeCard}`} type="button" tabIndex={primary ? 0 : -1} aria-current={active ? "true" : undefined}
                    aria-label={`${pack.title}, ${index + 1} / ${count}`} onClick={() => openCard(slot, index)}>
                    <PackDeck pack={pack} active={active} placement={placement} native transitionName={primary ? name : undefined} />
                  </button>
                </li>
              );
            }))}
          </ol>
        </div>
        {placement === "bottom" && <div className={styles.countControl} aria-label="当前图片数量 / Current image count">
          <button aria-label="减少图片 / Decrease images" className={styles.countButton} disabled={count <= 1} onClick={() => changeCount(-1)} type="button"><span aria-hidden="true">−</span></button>
          <output className={styles.countValue} aria-live="polite">{count}</output>
          <button aria-label="增加图片 / Increase images" className={styles.countButton} disabled={count >= maximumCount} onClick={() => changeCount(1)} type="button"><span aria-hidden="true">+</span></button>
        </div>}
        <p className={styles.srOnly} aria-live="polite">{count > 0 ? activeIndex + 1 : 0} / {count}</p>
      </section>
    </ViewTransition>
  );
}
