"use client";

import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, ViewTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import type { MissionExperience } from "@/data/contracts/mission-experience";
import { MissionCompleteSlider } from "@/features/missions/components/MissionCompleteSlider";
import { MissionCompletionConfetti } from "@/features/missions/components/MissionCompletionConfetti";
import { MissionCompletionProofChooser } from "@/features/missions/components/MissionCompletionProofChooser";
import { SplitMissionExperienceReveal } from "@/features/missions/components/SplitMissionExperienceReveal";
import { takeMissionAction, takePackAction } from "@/features/packs/actions";
import type {
  ExploreMissionArtwork,
  ExplorePackDetailData,
  ExplorePackPreviewData,
} from "@/features/packs/model/explore-pack-content";
import { advanceCarouselSpring } from "@/features/packs/model/carousel-spring";
import {
  createNativeScrollController,
  type NativeScrollController,
  type NativeScrollSelection,
} from "@/features/packs/model/native-scroll-controller";
import {
  getPackTransitionName,
  PACK_CLOSE_TRANSITION_TYPE,
} from "@/features/packs/model/pack-transition";
import { setExplorePackReturnSlug } from "@/features/packs/model/explore-pack-transition-state";
import { useDeckViewport } from "@/features/packs/model/use-deck-viewport";
import {
  addJoinedPack,
  addMissionCompletion,
  clearActiveMission,
  getSessionSnapshot,
  setActiveMission,
} from "@/features/navigation/model/session-snapshot";

import styles from "./ExplorePackPreview.module.css";

type ExplorePackPreviewProps = {
  loadMissionExperiences: (missionId: string) => Promise<
    | { ok: true; experiences: readonly MissionExperience[] }
    | { ok: false; error: string }
  >;
  pack: ExplorePackPreviewData | ExplorePackDetailData;
};

type PreviewStyle = CSSProperties & {
  "--preview-background": string;
  "--preview-foreground": string;
  "--take-background": string;
  "--take-foreground": string;
  "--experience-card-width": string;
};

type CompletionControlStyle = CSSProperties & {
  "--page-background": string;
  "--tm-accent": string;
  "--tm-capsule-height": string;
  "--tm-on-accent": string;
  "--tm-on-replacement": string;
  "--tm-replacement": string;
  "--tm-thumb-size": string;
  "--ui-text": string;
};

type ProxyStyle = CSSProperties & {
  "--proxy-delay": string;
  "--proxy-x": string;
};

type MissionCardStyle = CSSProperties & {
  "--mission-card-background": string;
  "--mission-card-copy-size": string;
  "--mission-card-foreground": string;
  "--mission-card-title-size": string;
  "--mission-card-title-width": string;
};

type DragState = {
  pointerId: number;
  startX: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  captured: boolean;
};

type PreviewPhase =
  | "collapsed"
  | "distributing"
  | "handoff"
  | "settled"
  | "take-collapse-ready"
  | "take-collapse"
  | "take-swap-ready"
  | "take-distributing"
  | "take-handoff"
  | "closing-ready"
  | "closing";

type GalleryMode = "artwork" | "mission-card";
type TakeActionPhase =
  | "pack"
  | "pack-closing"
  | "mission-opening"
  | "mission"
  | "mission-closing"
  | "hidden";
type MissionCompletionPhase =
  | "idle"
  | "flipping-out"
  | "flip-swap"
  | "flipping-in"
  | "slider"
  | "choice"
  | "audio"
  | "text"
  | "completing";
type MissionProofMode = "audio" | "text";

const COPY_COUNT = 3;
const PRIMARY_COPY = 1;
const PROXY_OFFSETS = [-3, -2, -1, 0, 1, 2, 3] as const;
const POINTER_THRESHOLD = 5;
const MAX_VELOCITY = 2600;
const COMMUNITY_EXPERIENCE_SCOPE = { kind: "community" } as const;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function wrapIndex(value: number, count: number) {
  return ((value % count) + count) % count;
}

type CardFlipStage = "out" | "swap" | "in";

function MissionVisual({ accessible, audioTargetRef, backVisible, eager, interactive, mission, mode, onProofChoice, prepareCompletionArtwork, proofMode, renderBack, textTargetRef }: {
  accessible: boolean;
  audioTargetRef?: (element: HTMLDivElement | null) => void;
  backVisible?: boolean;
  eager: boolean;
  interactive?: boolean;
  mission: ExploreMissionArtwork;
  mode: GalleryMode;
  onProofChoice?: (mode: MissionProofMode) => void;
  prepareCompletionArtwork?: boolean;
  proofMode?: MissionProofMode | "completing";
  renderBack?: boolean;
  textTargetRef?: (element: HTMLDivElement | null) => void;
}) {
  const imageArtwork = mode === "artwork" ? mission.previewArtwork : undefined;
  if (imageArtwork || !mission.card) {
    return (
      <Image
        alt={accessible ? `${mission.title} Mission artwork` : ""}
        aria-hidden={!accessible}
        className={styles.image}
        draggable={false}
        fill
        loading={eager ? "eager" : "lazy"}
        sizes="(max-width: 640px) 74vw, 300px"
        src={imageArtwork ?? mission.artwork}
      />
    );
  }

  const style: MissionCardStyle = {
    "--mission-card-background": mission.card.background,
    "--mission-card-copy-size": mission.card.description.length > 220
      ? "6.15cqw"
      : mission.card.description.length > 175 ? "6.65cqw" : "7.15cqw",
    "--mission-card-foreground": mission.card.foreground,
    "--mission-card-title-size": mission.card.titleSize,
    "--mission-card-title-width": mission.card.titleWidth,
  };

  return (
    <span className={styles.missionCardVisual} style={style}>
      {interactive ? <span aria-hidden="true" className={styles.missionCardThickness} /> : null}
      <span className={styles.missionCardFront}>
        <Image
          alt=""
          aria-hidden="true"
          className={styles.missionCardCharacter}
          draggable={false}
          fill
          loading={eager ? "eager" : "lazy"}
          sizes="(max-width: 640px) 74vw, 300px"
          src={mission.artwork}
        />
        <span aria-hidden="true" className={styles.missionCardBrand}>TODAYSMISSION</span>
        <span aria-hidden="true" className={styles.missionCardPack}>Fear of Rejection</span>
        <span aria-hidden="true" className={styles.missionCardTitle}>
          {mission.card.titleLines.map((line, index) => (
            <span key={`${mission.id}-${index}`}>{line}</span>
          ))}
        </span>
      </span>
      {renderBack ? (
        <span
          aria-label={accessible && backVisible ? `${mission.title}. ${mission.card.description}` : undefined}
          className={styles.missionCardBack}
          role={accessible && backVisible ? "img" : undefined}
        >
          {prepareCompletionArtwork && mission.previewArtwork ? (
            <Image
              alt=""
              aria-hidden="true"
              className={styles.missionCompletionArtwork}
              draggable={false}
              fill
              loading="eager"
              sizes="(max-width: 640px) 74vw, 300px"
              src={mission.previewArtwork}
            />
          ) : null}
          <span aria-hidden="true" className={styles.missionCardBackTitle}>
            {mission.card.titleLines.map((line, index) => (
              <span key={`${mission.id}-back-${index}`}>{line}</span>
            ))}
          </span>
          <span className={styles.missionCardDescription}>{mission.card.description}</span>
          <div
            className={`${styles.missionChoiceCard} ${styles.missionChoiceRecord}`}
            ref={audioTargetRef}
          >
            {proofMode !== "audio" ? (
              <button
                aria-label="Record mission completion"
                className={styles.missionChoiceTrigger}
                disabled={!onProofChoice}
                onClick={(event) => {
                  event.stopPropagation();
                  onProofChoice?.("audio");
                }}
                tabIndex={accessible && backVisible ? 0 : -1}
                type="button"
              >
                <span className={styles.missionChoiceContent}>
                  <svg aria-hidden="true" className={styles.missionChoiceIcon} fill="none" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="25" />
                    <circle className={styles.missionRecordDot} cx="32" cy="32" r="11" />
                  </svg>
                  <span>RECORD</span>
                </span>
              </button>
            ) : null}
          </div>
          <div
            className={`${styles.missionChoiceCard} ${styles.missionChoiceText}`}
            ref={textTargetRef}
          >
            {proofMode !== "text" ? (
              <button
                aria-label="Type mission completion"
                className={styles.missionChoiceTrigger}
                disabled={!onProofChoice}
                onClick={(event) => {
                  event.stopPropagation();
                  onProofChoice?.("text");
                }}
                tabIndex={accessible && backVisible ? 0 : -1}
                type="button"
              >
                <span className={styles.missionChoiceContent}>
                  <svg aria-hidden="true" className={styles.missionChoiceIcon} fill="none" viewBox="0 0 64 64">
                    <path d="M15 48h34" />
                    <path d="M18 39 42.5 14.5a5 5 0 0 1 7 7L25 46l-10 2 3-9Z" />
                    <path d="m39 18 7 7" />
                  </svg>
                  <span>TYPE</span>
                </span>
              </button>
            ) : null}
          </div>
        </span>
      ) : null}
    </span>
  );
}

function GalleryCard({ audioTargetRef, backVisible, choiceRevealed, copyIndex, eager, flipStage, mission, mode, onProofChoice, prepared, proofMode, setRef, textTargetRef }: {
  audioTargetRef?: (element: HTMLDivElement | null) => void;
  backVisible: boolean;
  choiceRevealed: boolean;
  copyIndex: number;
  eager: boolean;
  flipStage?: CardFlipStage;
  mission: ExploreMissionArtwork;
  mode: GalleryMode;
  onProofChoice?: (mode: MissionProofMode) => void;
  prepared: boolean;
  proofMode?: MissionProofMode | "completing";
  setRef: (element: HTMLLIElement | null) => void;
  textTargetRef?: (element: HTMLDivElement | null) => void;
}) {
  return (
    <li
      aria-hidden={copyIndex !== PRIMARY_COPY}
      className={styles.galleryCard}
      data-completion-choice={choiceRevealed || undefined}
      data-completing={proofMode === "completing" || undefined}
      data-3d-prepared={prepared || undefined}
      data-back-visible={backVisible || undefined}
      data-flip-stage={flipStage}
      data-experience-mission-id={mode === "mission-card" ? mission.id : undefined}
      data-mission-card={mode === "mission-card" ? mission.id : undefined}
      data-preview-card
      data-proof-mode={proofMode}
      ref={setRef}
    >
      <span className={styles.cardSurface} data-flip-shell={prepared || undefined}>
        <MissionVisual
          accessible={copyIndex === PRIMARY_COPY}
          audioTargetRef={audioTargetRef}
          backVisible={backVisible}
          eager={eager}
          interactive={prepared}
          mission={mission}
          mode={mode}
          onProofChoice={onProofChoice}
          prepareCompletionArtwork={backVisible}
          proofMode={proofMode}
          renderBack={prepared}
          textTargetRef={textTargetRef}
        />
      </span>
    </li>
  );
}

function DistributionCard({ mission, mode, offset, setRef }: {
  mission: ExploreMissionArtwork;
  mode: GalleryMode;
  offset: number;
  setRef: (element: HTMLLIElement | null) => void;
}) {
  const style: ProxyStyle = {
    "--proxy-delay": `${Math.abs(offset) * 48}ms`,
    "--proxy-x": "0px",
  };

  return (
    <li
      aria-hidden="true"
      className={styles.proxyCard}
      data-center={offset === 0}
      ref={setRef}
      style={style}
    >
      <span className={styles.cardSurface}>
        <MissionVisual accessible={false} eager mission={mission} mode={mode} />
      </span>
    </li>
  );
}

export function ExplorePackPreview({ loadMissionExperiences, pack }: ExplorePackPreviewProps) {
  const router = useRouter();
  const viewport = useDeckViewport();
  const nativeScrolling = viewport.coarsePointer;
  const supportsTakeTransition = pack.missions.every((mission) => mission.card && mission.previewArtwork);
  const initialJoined = pack.joined === true;
  const initialActiveMissionId = "activeMissionId" in pack ? pack.activeMissionId : null;
  const initialActiveMissionIndex = initialActiveMissionId
    ? Math.max(0, pack.missions.findIndex((mission) => mission.id === initialActiveMissionId))
    : 0;
  const initialCompletedMissionIds = new Set(
    "completedMissionIds" in pack ? pack.completedMissionIds : [],
  );
  const initialLockedMissionId = initialJoined && initialActiveMissionId
    && !initialCompletedMissionIds.has(initialActiveMissionId)
    ? initialActiveMissionId
    : null;
  const rootRef = useRef<HTMLElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const nativeScrollControllerRef = useRef<NativeScrollController | null>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  const missionBackgroundRef = useRef<HTMLSpanElement>(null);
  const missionBackgroundOpacityRef = useRef(0);
  const pendingBackgroundMissionIdRef = useRef<string | null>(null);
  const galleryCardRefs = useRef<Array<HTMLLIElement | null>>([]);
  const proxyCardRefs = useRef<Array<HTMLLIElement | null>>([]);
  const positionRef = useRef(0);
  const activeMissionIndexRef = useRef(initialActiveMissionIndex);
  const backgroundMissionIdRef = useRef<string | null>(null);
  const flippedMissionIdRef = useRef<string | null>(null);
  const originRef = useRef(0);
  const strideRef = useRef(0);
  const cycleWidthRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const phaseRef = useRef<PreviewPhase>("collapsed");
  const suppressBlankClickRef = useRef(false);
  const navigationStartedRef = useRef(false);
  const restoredActiveMissionRef = useRef(false);
  const completionEventSequenceRef = useRef(0);
  const [phase, setPhaseState] = useState<PreviewPhase>("collapsed");
  const [proxyCenterIndex, setProxyCenterIndex] = useState(0);
  const [galleryMode, setGalleryMode] = useState<GalleryMode>(
    supportsTakeTransition && !initialJoined ? "artwork" : "mission-card",
  );
  const [takeActionPhase, setTakeActionPhase] = useState<TakeActionPhase>(
    initialJoined ? "mission" : "pack",
  );
  const [hasJoined, setHasJoined] = useState(initialJoined);
  const [takePending, setTakePending] = useState(false);
  const [takeError, setTakeError] = useState<string | null>(null);
  const [activeMissionIndex, setActiveMissionIndex] = useState(initialActiveMissionIndex);
  const [backgroundMissionId, setBackgroundMissionId] = useState<string | null>(null);
  const [completedMissionIds, setCompletedMissionIds] = useState<ReadonlySet<string>>(
    () => initialCompletedMissionIds,
  );
  const [flippedMissionId, setFlippedMissionId] = useState<string | null>(null);
  const [missionCompletionPhase, setMissionCompletionPhase] = useState<MissionCompletionPhase>("idle");
  const [selectedProofMode, setSelectedProofMode] = useState<MissionProofMode | null>(null);
  const [audioCardTarget, setAudioCardTarget] = useState<HTMLDivElement | null>(null);
  const [textCardTarget, setTextCardTarget] = useState<HTMLDivElement | null>(null);
  const [completionEventId, setCompletionEventId] = useState<string | null>(null);
  const activeMission = pack.missions[activeMissionIndex] ?? pack.missions[0];
  const activeMissionCompleted = activeMission ? completedMissionIds.has(activeMission.id) : false;
  const backgroundMission = backgroundMissionId
    ? pack.missions.find((mission) => mission.id === backgroundMissionId)
    : undefined;
  const activeCardTheme = activeMission?.card;
  const lockedMission = flippedMissionId
    ? pack.missions.find((mission) => mission.id === flippedMissionId)
    : undefined;
  const lockedCardTheme = lockedMission?.card;
  const handleProofInteractionLockChange = useCallback((locked: boolean) => {
    if (rootRef.current) {
      rootRef.current.dataset.proofInteractionLocked = String(locked);
    }
  }, []);
  useEffect(() => { activeMissionIndexRef.current = activeMissionIndex; }, [activeMissionIndex]);
  useEffect(() => { backgroundMissionIdRef.current = backgroundMissionId; }, [backgroundMissionId]);
  useEffect(() => { flippedMissionIdRef.current = flippedMissionId; }, [flippedMissionId]);
  useEffect(() => {
    if (
      phase !== "settled" ||
      !initialLockedMissionId ||
      restoredActiveMissionRef.current
    ) return;
    restoredActiveMissionRef.current = true;
    setBackgroundMissionId(initialLockedMissionId);
    setFlippedMissionId(initialLockedMissionId);
    setMissionCompletionPhase("slider");
  }, [initialLockedMissionId, phase]);
  const style: PreviewStyle = {
    "--preview-background": pack.background,
    "--preview-foreground": pack.foreground,
    "--take-background": activeCardTheme?.background ?? pack.foreground,
    "--take-foreground": activeCardTheme?.foreground ?? pack.background,
    "--experience-card-width": "var(--preview-card-width)",
  };
  const completionControlStyle: CompletionControlStyle = {
    "--page-background": lockedCardTheme?.background ?? pack.background,
    "--tm-accent": lockedCardTheme?.foreground ?? pack.foreground,
    "--tm-capsule-height": "58px",
    "--tm-on-accent": lockedCardTheme?.background ?? pack.background,
    "--tm-on-replacement": selectedProofMode === "audio" ? "#fff0df" : "#30291f",
    "--tm-replacement": selectedProofMode === "audio" ? "#d84f49" : "#ebc94b",
    "--tm-thumb-size": "46px",
    "--ui-text": lockedCardTheme?.foreground ?? pack.foreground,
  };

  const setPhase = useCallback((next: PreviewPhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const paintMissionBackground = useCallback((opacity: number) => {
    const bounded = clamp(opacity, 0, 1);
    missionBackgroundOpacityRef.current = bounded;
    if (missionBackgroundRef.current) {
      missionBackgroundRef.current.style.opacity = String(bounded);
    }
  }, []);

  const paint = useCallback(() => {
    if (nativeScrollControllerRef.current) return;
    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(${positionRef.current}px, -50%, 0)`;
    }
  }, []);

  const updateProxyPositions = useCallback((residual = 0) => {
    const stride = strideRef.current;
    proxyCardRefs.current.forEach((card, index) => {
      if (!card) return;
      card.style.setProperty("--proxy-x", `${PROXY_OFFSETS[index] * stride + residual}px`);
    });
  }, []);

  const normalizePosition = useCallback(() => {
    const cycleWidth = cycleWidthRef.current;
    if (cycleWidth <= 0) return 0;
    const halfCycle = cycleWidth / 2;
    let wrappedBy = 0;
    while (positionRef.current - originRef.current > halfCycle) {
      positionRef.current -= cycleWidth;
      wrappedBy -= cycleWidth;
    }
    while (positionRef.current - originRef.current < -halfCycle) {
      positionRef.current += cycleWidth;
      wrappedBy += cycleWidth;
    }
    return wrappedBy;
  }, []);

  const stopMotion = useCallback(() => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    if (rootRef.current) rootRef.current.dataset.moving = "false";
  }, []);

  const nearestMissionSnap = useCallback((value: number) => {
    const stride = strideRef.current;
    if (stride <= 0) return originRef.current;
    return originRef.current + Math.round((value - originRef.current) / stride) * stride;
  }, []);

  const syncActiveMission = useCallback(() => {
    const stride = strideRef.current;
    if (stride <= 0 || pack.missions.length < 1) return;
    const steps = Math.round((originRef.current - positionRef.current) / stride);
    const nextIndex = wrapIndex(steps, pack.missions.length);
    activeMissionIndexRef.current = nextIndex;
    setActiveMissionIndex(nextIndex);
  }, [pack.missions.length]);

  const syncNativeProgress = useCallback((selection: NativeScrollSelection) => {
    const count = pack.missions.length;
    if (count < 1) return;
    positionRef.current = originRef.current - selection.position * strideRef.current;

    if (selection.index !== activeMissionIndexRef.current) {
      activeMissionIndexRef.current = selection.index;
      setActiveMissionIndex(selection.index);
    }

    const backgroundId = backgroundMissionIdRef.current;
    if (!backgroundId || flippedMissionIdRef.current) return;
    const backgroundIndex = pack.missions.findIndex((mission) => mission.id === backgroundId);
    if (backgroundIndex < 0) return;
    const nearestBackgroundPosition = backgroundIndex
      + Math.round((selection.position - backgroundIndex) / count) * count;
    paintMissionBackground(1 - Math.min(1, Math.abs(selection.position - nearestBackgroundPosition)));
  }, [pack.missions, paintMissionBackground]);

  const syncNativeSettled = useCallback((selection: NativeScrollSelection) => {
    positionRef.current = originRef.current - selection.position * strideRef.current;
    if (selection.index !== activeMissionIndexRef.current) {
      activeMissionIndexRef.current = selection.index;
      setActiveMissionIndex(selection.index);
    }
  }, []);

  const settleAt = useCallback((requestedTarget: number, initialVelocity = 0) => {
    stopMotion();
    let target = requestedTarget;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      positionRef.current = target;
      normalizePosition();
      paint();
      syncActiveMission();
      return;
    }

    if (rootRef.current) rootRef.current.dataset.moving = "true";
    let velocity = clamp(initialVelocity, -MAX_VELOCITY, MAX_VELOCITY);
    let lastTime = performance.now();
    const tick = (time: number) => {
      const seconds = clamp((time - lastTime) / 1000, .001, .034);
      lastTime = time;
      const next = advanceCarouselSpring(positionRef.current, velocity, target, seconds);
      positionRef.current = next.position;
      velocity = next.velocity;
      const wrappedBy = normalizePosition();
      target += wrappedBy;
      paint();
      if (Math.abs(target - positionRef.current) < .25 && Math.abs(velocity) < 2) {
        positionRef.current = target;
        normalizePosition();
        paint();
        stopMotion();
        syncActiveMission();
      } else {
        frameRef.current = window.requestAnimationFrame(tick);
      }
    };
    frameRef.current = window.requestAnimationFrame(tick);
  }, [normalizePosition, paint, stopMotion, syncActiveMission]);

  const settleWithMomentum = useCallback((velocity: number) => {
    const predicted = positionRef.current + velocity * .15;
    settleAt(nearestMissionSnap(predicted), velocity);
  }, [nearestMissionSnap, settleAt]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const cards = galleryCardRefs.current;
    const count = pack.missions.length;
    if (!root || count < 1) return;

    const measure = () => {
      const primaryStart = PRIMARY_COPY * count;
      const first = cards[primaryStart];
      const second = cards[primaryStart + 1];
      const nextCopyFirst = cards[primaryStart + count];
      if (!first || !nextCopyFirst) return;

      const stride = second
        ? second.offsetLeft - first.offsetLeft
        : first.offsetWidth;
      const previousStride = strideRef.current;
      const logicalPosition = previousStride > 0
        ? (originRef.current - positionRef.current) / previousStride
        : activeMissionIndexRef.current;
      if (!nativeScrolling) stopMotion();
      strideRef.current = stride;
      cycleWidthRef.current = nextCopyFirst.offsetLeft - first.offsetLeft;
      originRef.current = nativeScrolling
        ? 0
        : root.clientWidth / 2 - first.offsetLeft - first.offsetWidth / 2;
      positionRef.current = originRef.current - logicalPosition * stride;
      if (nativeScrolling) {
        trackRef.current?.style.removeProperty("transform");
        nativeScrollControllerRef.current?.restore(
          { count, copies: COPY_COUNT, stride },
          logicalPosition,
        );
      } else {
        paint();
      }
      updateProxyPositions();
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [nativeScrolling, pack.missions.length, paint, stopMotion, updateProxyPositions]);

  useLayoutEffect(() => {
    const scrollViewport = scrollViewportRef.current;
    if (!nativeScrolling || !scrollViewport || strideRef.current <= 0 || pack.missions.length < 1) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const logicalPosition = (originRef.current - positionRef.current) / strideRef.current;
    const controller = createNativeScrollController(scrollViewport, {
      count: pack.missions.length,
      copies: COPY_COUNT,
      stride: strideRef.current,
      position: logicalPosition,
      disabled: phaseRef.current !== "settled" || Boolean(flippedMissionIdRef.current),
      reducedMotion,
      onProgress: syncNativeProgress,
      onSettled: syncNativeSettled,
    });
    nativeScrollControllerRef.current = controller;
    return () => {
      controller.destroy();
      if (nativeScrollControllerRef.current === controller) nativeScrollControllerRef.current = null;
    };
  }, [nativeScrolling, pack.missions.length, syncNativeProgress, syncNativeSettled]);

  useEffect(() => {
    nativeScrollControllerRef.current?.setInteractionLocked(
      phase !== "settled" || Boolean(flippedMissionId),
    );
  }, [flippedMissionId, phase]);

  useEffect(() => {
    router.prefetch("/explore");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => setPhase("distributing"), reducedMotion ? 0 : 560);
    return () => window.clearTimeout(timer);
  }, [pack.slug, router, setPhase]);

  useEffect(() => {
    if (phase !== "distributing" && phase !== "handoff") return;
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      const animations = root.getAnimations({ subtree: true });
      void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
        if (cancelled) return;
        setPhase(phase === "distributing" ? "handoff" : "settled");
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [phase, setPhase]);

  useEffect(() => {
    if (takeActionPhase === "pack-closing") {
      if (phase !== "settled" || galleryMode !== "mission-card") return;
      const frame = window.requestAnimationFrame(() => setTakeActionPhase("mission-opening"));
      return () => window.cancelAnimationFrame(frame);
    }
    if (takeActionPhase === "mission-opening") {
      const frame = window.requestAnimationFrame(() => setTakeActionPhase("mission"));
      return () => window.cancelAnimationFrame(frame);
    }
    if (takeActionPhase !== "mission-closing") return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(
      () => setTakeActionPhase("hidden"),
      reducedMotion ? 80 : 220,
    );
    return () => window.clearTimeout(timer);
  }, [galleryMode, phase, takeActionPhase]);

  useEffect(() => {
    if (missionCompletionPhase !== "flipping-out") return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(
      () => setMissionCompletionPhase("flip-swap"),
      reducedMotion ? 80 : 280,
    );
    return () => window.clearTimeout(timer);
  }, [missionCompletionPhase]);

  useEffect(() => {
    if (missionCompletionPhase !== "flip-swap") return;
    let enterFrame = 0;
    const swapFrame = window.requestAnimationFrame(() => {
      enterFrame = window.requestAnimationFrame(() => setMissionCompletionPhase("flipping-in"));
    });
    return () => {
      window.cancelAnimationFrame(swapFrame);
      window.cancelAnimationFrame(enterFrame);
    };
  }, [missionCompletionPhase]);

  useEffect(() => {
    if (missionCompletionPhase !== "flipping-in") return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(
      () => setMissionCompletionPhase("slider"),
      reducedMotion ? 80 : 300,
    );
    return () => window.clearTimeout(timer);
  }, [missionCompletionPhase]);

  useEffect(() => {
    if (flippedMissionId) return;
    const targetMissionId = activeMissionCompleted ? activeMission?.id ?? null : null;
    if (!targetMissionId) {
      pendingBackgroundMissionIdRef.current = null;
      paintMissionBackground(0);
      return;
    }
    if (targetMissionId === backgroundMissionId) {
      pendingBackgroundMissionIdRef.current = null;
      const frame = window.requestAnimationFrame(() => paintMissionBackground(1));
      return () => window.cancelAnimationFrame(frame);
    }
    if (missionBackgroundOpacityRef.current > 0.001) {
      pendingBackgroundMissionIdRef.current = targetMissionId;
      paintMissionBackground(0);
      return;
    }
    pendingBackgroundMissionIdRef.current = null;
    setBackgroundMissionId(targetMissionId);
  }, [
    activeMission?.id,
    activeMissionCompleted,
    backgroundMissionId,
    flippedMissionId,
    paintMissionBackground,
  ]);

  useEffect(() => {
    if (phase !== "take-collapse-ready" && phase !== "take-swap-ready") return;
    const frame = window.requestAnimationFrame(() => {
      setPhase(phase === "take-collapse-ready" ? "take-collapse" : "take-distributing");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [phase, setPhase]);

  useEffect(() => {
    if (phase !== "take-collapse" && phase !== "take-distributing" && phase !== "take-handoff") return;
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      const animations = root.getAnimations({ subtree: true });
      void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
        if (cancelled) return;
        if (phase === "take-collapse") {
          setGalleryMode("mission-card");
          setPhase("take-swap-ready");
        } else {
          setPhase(phase === "take-distributing" ? "take-handoff" : "settled");
        }
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [phase, setPhase]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || nativeScrolling || phase !== "settled") return;
    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || flippedMissionId) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(delta) < 2 || dragRef.current) return;
      event.preventDefault();
      stopMotion();
      positionRef.current -= delta;
      normalizePosition();
      paint();
      settleWithMomentum(clamp(-delta * 10, -MAX_VELOCITY, MAX_VELOCITY));
    };
    root.addEventListener("wheel", handleWheel, { passive: false });
    return () => root.removeEventListener("wheel", handleWheel);
  }, [flippedMissionId, nativeScrolling, normalizePosition, paint, phase, settleWithMomentum, stopMotion]);

  useEffect(() => {
    if (phase !== "closing-ready") return;
    const frame = window.requestAnimationFrame(() => setPhase("closing"));
    return () => window.cancelAnimationFrame(frame);
  }, [phase, setPhase]);

  useEffect(() => {
    if (phase !== "closing") return;
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    let fallbackTimer = 0;
    const frame = window.requestAnimationFrame(() => {
      const animations = root.getAnimations({ subtree: true });
      const animationsFinished = Promise.allSettled(animations.map((animation) => animation.finished));
      const fallback = new Promise<void>((resolve) => {
        fallbackTimer = window.setTimeout(resolve, 1000);
      });
      void Promise.race([animationsFinished, fallback]).then(() => {
        if (cancelled || navigationStartedRef.current) return;
        navigationStartedRef.current = true;
        setExplorePackReturnSlug(pack.slug);
        router.push("/explore", {
          scroll: false,
          transitionTypes: [PACK_CLOSE_TRANSITION_TYPE],
        });
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(fallbackTimer);
    };
  }, [pack.slug, phase, router]);

  useEffect(() => () => {
    stopMotion();
    const drag = dragRef.current;
    const root = rootRef.current;
    if (drag && root?.hasPointerCapture(drag.pointerId)) {
      root.releasePointerCapture(drag.pointerId);
    }
  }, [stopMotion]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    const experienceGesture = rootRef.current?.dataset.experienceGesture;
    if (
      nativeScrolling ||
      experienceGesture === "pending" ||
      experienceGesture === "vertical" ||
      rootRef.current?.dataset.proofInteractionLocked === "true" ||
      phaseRef.current !== "settled" ||
      !event.isPrimary ||
      event.button !== 0 ||
      dragRef.current ||
      flippedMissionId !== null
    ) return;
    stopMotion();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
      captured: false,
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (nativeScrolling) return;
    const experienceGesture = rootRef.current?.dataset.experienceGesture;
    if (experienceGesture === "pending" || experienceGesture === "vertical") return;
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const totalX = event.clientX - drag.startX;
    if (!drag.captured && Math.abs(totalX) > POINTER_THRESHOLD) {
      drag.captured = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.dragging = "true";
    }
    const deltaX = event.clientX - drag.lastX;
    const elapsed = Math.max(8, event.timeStamp - drag.lastTime) / 1000;
    drag.lastX = event.clientX;
    drag.lastTime = event.timeStamp;
    if (!drag.captured) return;
    drag.velocity = clamp(deltaX / elapsed, -MAX_VELOCITY, MAX_VELOCITY);
    positionRef.current += deltaX;
    normalizePosition();
    paint();
  };

  const finishPointer = (event: ReactPointerEvent<HTMLElement>) => {
    if (nativeScrolling) return;
    const experienceGesture = rootRef.current?.dataset.experienceGesture;
    if (experienceGesture === "pending" || experienceGesture === "vertical") {
      dragRef.current = null;
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    delete event.currentTarget.dataset.dragging;
    if (!drag.captured) return;
    suppressBlankClickRef.current = true;
    window.setTimeout(() => { suppressBlankClickRef.current = false; }, 180);
    const stale = event.timeStamp - drag.lastTime > 80;
    const velocity = event.type === "pointercancel" || stale ? 0 : drag.velocity;
    settleWithMomentum(velocity);
  };

  const takePack = async () => {
    if (
      !supportsTakeTransition ||
      galleryMode !== "artwork" ||
      takeActionPhase !== "pack" ||
      phaseRef.current !== "settled" ||
      takePending ||
      hasJoined
    ) {
      return;
    }

    if (!pack.id || ("authenticated" in pack && !pack.authenticated)) {
      router.push(`/login?next=${encodeURIComponent(`/pack/${pack.slug}`)}`);
      return;
    }

    setTakePending(true);
    setTakeError(null);
    let result;
    try {
      result = await takePackAction(pack.id);
    } catch {
      setTakePending(false);
      setTakeError("We couldn't take this Pack right now. Please try again.");
      return;
    }
    if (!result.ok) {
      setTakePending(false);
      setTakeError(result.error);
      return;
    }
    setHasJoined(true);
    const userId = getSessionSnapshot().currentUser?.id;
    if (userId) addJoinedPack(pack.id, userId);
    setTakePending(false);

    const nativeController = nativeScrollControllerRef.current;
    if (nativeController) {
      const logicalPosition = nativeController.freeze();
      positionRef.current = originRef.current - logicalPosition * strideRef.current;
    } else {
      stopMotion();
    }
    const stride = Math.max(1, strideRef.current);
    const steps = Math.round((originRef.current - positionRef.current) / stride);
    const snappedPosition = originRef.current - steps * stride;
    const residual = positionRef.current - snappedPosition;
    setProxyCenterIndex(wrapIndex(steps, pack.missions.length));
    updateProxyPositions(residual);
    setTakeActionPhase("pack-closing");
    setPhase("take-collapse-ready");
  };

  const takeMission = async () => {
    if (
      galleryMode !== "mission-card" ||
      takeActionPhase !== "mission" ||
      phaseRef.current !== "settled" ||
      takePending ||
      !hasJoined
    ) {
      return;
    }

    const nativeController = nativeScrollControllerRef.current;
    if (nativeController) {
      const logicalPosition = nativeController.freeze();
      positionRef.current = originRef.current - logicalPosition * strideRef.current;
    } else {
      stopMotion();
    }
    const stride = Math.max(1, strideRef.current);
    const steps = Math.round((originRef.current - positionRef.current) / stride);
    const mission = pack.missions[wrapIndex(steps, pack.missions.length)];
    if (completedMissionIds.has(mission.id) || !pack.id) return;

    if ("authenticated" in pack && !pack.authenticated) {
      router.push(`/login?next=${encodeURIComponent(`/pack/${pack.slug}`)}`);
      return;
    }

    setTakePending(true);
    setTakeError(null);
    let result;
    try {
      result = await takeMissionAction(pack.id, mission.id);
    } catch {
      setTakePending(false);
      setTakeError("We couldn't take this Mission right now. Please try again.");
      return;
    }
    if (!result.ok) {
      setTakePending(false);
      setTakeError(result.error);
      return;
    }
    if (result.activeMissionId !== mission.id) {
      setTakePending(false);
      setTakeError("Another Mission is already active for this Pack.");
      return;
    }
    setTakePending(false);
    const userId = getSessionSnapshot().currentUser?.id;
    if (userId) setActiveMission(pack.id, result.activeMissionId, userId);
    positionRef.current = originRef.current - steps * stride;
    normalizePosition();
    paint();
    setActiveMissionIndex(wrapIndex(steps, pack.missions.length));
    pendingBackgroundMissionIdRef.current = null;
    paintMissionBackground(0);
    setBackgroundMissionId(mission.id);
    setFlippedMissionId(mission.id);
    setSelectedProofMode(null);
    setMissionCompletionPhase("flipping-out");
    setTakeActionPhase("mission-closing");
  };

  const paintCompletionChoices = useCallback((progress: number) => {
    if (!flippedMissionId) return;
    const bounded = clamp(progress, 0, 1);
    const recordY = -100 + bounded * 50;
    const textY = 100 - bounded * 50;
    paintMissionBackground(bounded);
    galleryCardRefs.current.forEach((card) => {
      if (!card || card.dataset.missionCard !== flippedMissionId) return;
      card.style.setProperty("--mission-record-y", `${recordY}%`);
      card.style.setProperty("--mission-text-y", `${textY}%`);
    });
  }, [flippedMissionId, paintMissionBackground]);

  const handleMissionCompleted = useCallback((completedLocalDate: string) => {
    if (!flippedMissionId || !pack.id) return;
    const userId = getSessionSnapshot().currentUser?.id;
    if (userId) {
      addMissionCompletion({
        userId,
        missionId: flippedMissionId,
        packId: pack.id,
        completedLocalDate,
      });
      clearActiveMission(pack.id, userId, flippedMissionId);
    }
    completionEventSequenceRef.current += 1;
    setCompletionEventId(`${flippedMissionId}:${completionEventSequenceRef.current}`);
    setMissionCompletionPhase("completing");
  }, [flippedMissionId, pack.id]);

  useEffect(() => {
    if (missionCompletionPhase !== "completing" || !flippedMissionId) return;
    const completedMissionId = flippedMissionId;
    let cancelled = false;
    let settleFrame = 0;
    const exitFrame = window.requestAnimationFrame(() => {
      settleFrame = window.requestAnimationFrame(() => {
        const animations = rootRef.current?.getAnimations({ subtree: true }) ?? [];
        void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
          if (cancelled) return;
          setCompletedMissionIds((current) => {
            const next = new Set(current);
            next.add(completedMissionId);
            return next;
          });
          setFlippedMissionId(null);
          setSelectedProofMode(null);
          setMissionCompletionPhase("idle");
          setTakeActionPhase("mission");
        });
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(exitFrame);
      window.cancelAnimationFrame(settleFrame);
    };
  }, [flippedMissionId, missionCompletionPhase]);

  const closePreview = (target: EventTarget | null) => {
    const root = rootRef.current;
    const revealSuppressUntil = Number(root?.dataset.experienceSuppressClickUntil ?? 0);
    if (performance.now() < revealSuppressUntil) return;
    if (root?.dataset.experienceReveal && root.dataset.experienceReveal !== "closed") {
      root.dispatchEvent(new Event("mission-experience-reveal-close", { cancelable: true }));
      return;
    }
    if (
      phaseRef.current !== "settled" ||
      suppressBlankClickRef.current ||
      (target instanceof Element && target.closest("[data-preview-card], [data-preview-control]"))
    ) {
      return;
    }

    const nativeController = nativeScrollControllerRef.current;
    if (nativeController && !flippedMissionId && !nativeController.canActivate()) return;
    if (nativeController) {
      const logicalPosition = nativeController.freeze();
      positionRef.current = originRef.current - logicalPosition * strideRef.current;
    } else {
      stopMotion();
    }
    navigationStartedRef.current = false;
    const stride = Math.max(1, strideRef.current);
    const steps = Math.round((originRef.current - positionRef.current) / stride);
    const snappedPosition = originRef.current - steps * stride;
    const residual = positionRef.current - snappedPosition;
    setProxyCenterIndex(wrapIndex(steps, pack.missions.length));
    updateProxyPositions(residual);
    setPhase("closing-ready");
  };

  const proxyMissions = PROXY_OFFSETS.map((offset) =>
    pack.missions[wrapIndex(proxyCenterIndex + offset, pack.missions.length)],
  );

  return (
    <section
      aria-label={`${pack.title} Mission artwork preview`}
      className={styles.root}
      data-mission-completion={missionCompletionPhase}
      data-mission-locked={flippedMissionId ? "true" : undefined}
      data-pack-joined={hasJoined || undefined}
      data-experience-reveal="closed"
      data-moving="false"
      data-native-scroll={nativeScrolling || undefined}
      data-phase={phase}
      onClick={(event) => closePreview(event.target)}
      onKeyDown={(event) => {
        if (event.key === "Escape") closePreview(event.currentTarget);
        if (
          flippedMissionId ||
          phaseRef.current !== "settled" ||
          (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
        ) return;
        event.preventDefault();
        const nativeController = nativeScrollControllerRef.current;
        if (nativeController) {
          const direction = event.key === "ArrowRight" ? 1 : -1;
          const slot = PRIMARY_COPY * pack.missions.length
            + Math.round(nativeController.position())
            + direction;
          nativeController.selectSlot(slot);
        } else {
          const direction = event.key === "ArrowRight" ? -1 : 1;
          settleAt(nearestMissionSnap(positionRef.current) + direction * strideRef.current);
        }
      }}
      onPointerCancel={finishPointer}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishPointer}
      ref={rootRef}
      style={style}
      tabIndex={0}
    >
      {backgroundMission ? (
        <span
          aria-hidden="true"
          className={styles.missionArtworkBackground}
          onTransitionEnd={(event) => {
            if (
              event.currentTarget !== event.target ||
              event.propertyName !== "opacity" ||
              missionBackgroundOpacityRef.current > 0.001
            ) return;
            const pendingMissionId = pendingBackgroundMissionIdRef.current;
            if (!pendingMissionId) return;
            pendingBackgroundMissionIdRef.current = null;
            setBackgroundMissionId(pendingMissionId);
          }}
          ref={missionBackgroundRef}
        >
          <Image
            alt=""
            className={styles.missionArtworkBackgroundImage}
            draggable={false}
            fill
            sizes="60vw"
            src={backgroundMission.previewArtwork ?? backgroundMission.artwork}
          />
        </span>
      ) : null}
      {flippedMissionId && missionCompletionPhase === "slider" ? (
        <SplitMissionExperienceReveal
          activeMissionId={flippedMissionId}
          enabled
          experienceScope={COMMUNITY_EXPERIENCE_SCOPE}
          loadExperiences={loadMissionExperiences}
          rootRef={rootRef}
        />
      ) : null}
      <div className={styles.scrollViewport} ref={scrollViewportRef}>
        <ol
          aria-label={galleryMode === "artwork" ? "Mission artwork" : "Mission cards"}
          className={styles.track}
          ref={trackRef}
        >
          {Array.from({ length: COPY_COUNT }, (_, copyIndex) =>
            pack.missions.map((mission, slot) => {
              const refIndex = copyIndex * pack.missions.length + slot;
              const missionMode = galleryMode === "mission-card" && completedMissionIds.has(mission.id)
                ? "artwork"
                : galleryMode;
              const missionLocked = flippedMissionId === mission.id;
              const backVisible = missionLocked && missionCompletionPhase !== "flipping-out";
              const flipStage = missionLocked
                ? missionCompletionPhase === "flipping-out" ? "out"
                  : missionCompletionPhase === "flip-swap" ? "swap"
                    : missionCompletionPhase === "flipping-in" ? "in"
                      : undefined
                : undefined;
              return (
                <GalleryCard
                  audioTargetRef={
                    copyIndex === PRIMARY_COPY && missionLocked && selectedProofMode === "audio"
                      ? setAudioCardTarget
                      : undefined
                  }
                  backVisible={backVisible}
                  copyIndex={copyIndex}
                  choiceRevealed={
                    ["choice", "audio", "text"].includes(missionCompletionPhase) &&
                    flippedMissionId === mission.id
                  }
                  eager={
                    copyIndex === PRIMARY_COPY && (
                      slot === activeMissionIndex ||
                      slot === wrapIndex(activeMissionIndex - 1, pack.missions.length) ||
                      slot === wrapIndex(activeMissionIndex + 1, pack.missions.length)
                    )
                  }
                  flipStage={flipStage}
                  key={`${copyIndex}-${mission.id}`}
                  mission={mission}
                  mode={missionMode}
                  onProofChoice={
                    ["choice", "audio", "text"].includes(missionCompletionPhase) &&
                    flippedMissionId === mission.id
                      ? (mode) => {
                          setSelectedProofMode(mode);
                          setMissionCompletionPhase(mode);
                        }
                      : undefined
                  }
                  prepared={
                    galleryMode === "mission-card" && (
                      mission.id === activeMission?.id || mission.id === flippedMissionId
                    )
                  }
                  proofMode={flippedMissionId === mission.id
                    ? missionCompletionPhase === "completing" ? "completing" : selectedProofMode ?? undefined
                    : undefined}
                  setRef={(element) => { galleryCardRefs.current[refIndex] = element; }}
                  textTargetRef={
                    copyIndex === PRIMARY_COPY && missionLocked && selectedProofMode === "text"
                      ? setTextCardTarget
                      : undefined
                  }
                />
              );
            }),
          )}
        </ol>
      </div>
      <ol aria-hidden="true" className={styles.proxyLayer}>
        {PROXY_OFFSETS.map((offset, index) => (
          <DistributionCard
            key={offset}
            mission={proxyMissions[index]}
            mode={galleryMode === "mission-card" && completedMissionIds.has(proxyMissions[index].id)
              ? "artwork"
              : galleryMode}
            offset={offset}
            setRef={(element) => { proxyCardRefs.current[index] = element; }}
          />
        ))}
      </ol>
      {supportsTakeTransition &&
      takeActionPhase !== "hidden" &&
      !(takeActionPhase === "mission" && (activeMissionCompleted || Boolean(flippedMissionId))) ? (
        <div
          className={styles.takeControl}
          data-preview-control
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            className={styles.takeButton}
            data-action-state={takeActionPhase}
            aria-busy={takePending || undefined}
            disabled={
              takePending ||
              takeActionPhase === "pack-closing" ||
              takeActionPhase === "mission-opening" ||
              takeActionPhase === "mission-closing"
            }
            onClick={takeActionPhase === "pack" ? takePack : takeMission}
            type="button"
          >
            {takeActionPhase === "pack" || takeActionPhase === "pack-closing"
              ? "take this pack"
              : "take this mission"}
          </button>
          {takeError ? <p className={styles.error} role="alert">{takeError}</p> : null}
        </div>
      ) : null}
      {"visibleMissionCount" in pack && hasJoined ? (
        <p
          aria-label={`${completedMissionIds.size} of ${pack.visibleMissionCount} missions completed`}
          className={styles.packProgress}
        >
          {completedMissionIds.size}/{pack.visibleMissionCount}
        </p>
      ) : null}
      {[
        "slider",
        "choice",
        "audio",
        "text",
        "completing",
      ].includes(missionCompletionPhase) && lockedCardTheme ? (
        <div
          className={styles.completionControl}
          data-preview-control
          onPointerDown={(event) => event.stopPropagation()}
          style={completionControlStyle}
        >
          <div
            className={styles.completionSliderShell}
            data-hidden={Boolean(selectedProofMode)}
          >
            <MissionCompleteSlider
              onCompletionRequested={() => {
                paintCompletionChoices(1);
                setMissionCompletionPhase("choice");
              }}
              onProgressChange={paintCompletionChoices}
            />
          </div>
          {selectedProofMode && flippedMissionId && missionCompletionPhase !== "completing" ? (
            <MissionCompletionProofChooser
              audioPresentation="mission-card"
              audioTarget={audioCardTarget}
              initialMode={selectedProofMode}
              key={`${flippedMissionId}:${selectedProofMode}`}
              missionId={flippedMissionId}
              onCompleted={handleMissionCompleted}
              onInteractionLockChange={handleProofInteractionLockChange}
              onModeChange={(mode) => {
                setSelectedProofMode(mode);
                setMissionCompletionPhase(mode);
              }}
              textTarget={textCardTarget}
            />
          ) : null}
        </div>
      ) : null}
      <MissionCompletionConfetti
        eventId={completionEventId}
        onFinished={(eventId) => {
          setCompletionEventId((current) => current === eventId ? null : current);
        }}
      />
      <div className={styles.coverHero} data-preview-card>
        <ViewTransition
          default="none"
          name={getPackTransitionName(pack.slug, "bottom")}
          share="pack-card-morph"
        >
          <span className={styles.coverSurface}>
            <Image
              alt={`${pack.title} Pack cover`}
              className={styles.image}
              draggable={false}
              fill
              priority
              sizes="(max-width: 640px) 80vw, 340px"
              src={pack.cover}
            />
          </span>
        </ViewTransition>
      </div>
      <h1 className={styles.title}>{pack.title}</h1>
    </section>
  );
}
