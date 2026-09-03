"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";

import styles from "./MissionActionLayer.module.css";

type MissionCompletionConfettiProps = {
  eventId: string | null;
  onFinished: (eventId: string) => void;
};

type ConfettiParticle = {
  color: string;
  height: number;
  phase: number;
  rotation: number;
  rotationSpeed: number;
  vx: number;
  vy: number;
  width: number;
  x: number;
  y: number;
};

type ConfettiRun = {
  eventId: string;
  particles: ConfettiParticle[];
  reducedMotion: boolean;
  startedAt: number;
};

const CONFETTI_COLORS = ["#e5392d", "#1457c9", "#f1c933", "#111111", "#f3e8c8", "#37a66b"];
const CONFETTI_DURATION_MS = 2_000;
const REDUCED_CONFETTI_DURATION_MS = 250;

function createParticles(width: number, height: number, reducedMotion: boolean): ConfettiParticle[] {
  const count = width < 700 ? 80 : 120;
  return Array.from({ length: count }, (_, index) => {
    if (reducedMotion) {
      return {
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        height: 5 + Math.random() * 7,
        phase: Math.random() * Math.PI * 2,
        rotation: Math.random() * Math.PI,
        rotationSpeed: 0,
        vx: 0,
        vy: 0,
        width: 3 + Math.random() * 5,
        x: width * (0.1 + Math.random() * 0.8),
        y: height * (0.2 + Math.random() * 0.6),
      };
    }

    const direction = Math.random() < 0.5 ? -1 : 1;
    return {
      color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
      height: 5 + Math.random() * 8,
      phase: Math.random() * Math.PI * 2,
      rotation: Math.random() * Math.PI,
      rotationSpeed: (Math.random() - 0.5) * 11,
      vx: direction * width * (0.22 + Math.random() * 0.42),
      vy: -height * (0.18 + Math.random() * 0.38),
      width: 3 + Math.random() * 6,
      x: width / 2,
      y: height / 2,
    };
  });
}

export function MissionCompletionConfetti({ eventId, onFinished }: MissionCompletionConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const runRef = useRef<ConfettiRun | null>(null);
  const finishedEventRef = useRef<string | null>(null);
  const onFinishedRef = useRef(onFinished);

  useLayoutEffect(() => {
    onFinishedRef.current = onFinished;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !eventId) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (runRef.current?.eventId !== eventId) {
      runRef.current = {
        eventId,
        particles: createParticles(window.innerWidth, window.innerHeight, reducedMotion),
        reducedMotion,
        startedAt: performance.now(),
      };
      finishedEventRef.current = null;
    }
    const run = runRef.current;
    let disposed = false;

    const resizeCanvas = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(window.innerWidth * ratio);
      canvas.height = Math.round(window.innerHeight * ratio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas, { passive: true });

    const draw = (now: number) => {
      if (disposed) return;
      const context = canvas.getContext("2d");
      if (!context) return;
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const duration = run.reducedMotion ? REDUCED_CONFETTI_DURATION_MS : CONFETTI_DURATION_MS;
      const elapsedMs = Math.max(0, now - run.startedAt);
      const progress = Math.min(1, elapsedMs / duration);
      const elapsedSeconds = elapsedMs / 1_000;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      context.globalAlpha = run.reducedMotion
        ? Math.sin(progress * Math.PI)
        : Math.min(1, elapsedMs / 110) * Math.pow(1 - progress, 0.72);

      for (const particle of run.particles) {
        const drag = (1 - Math.exp(-1.55 * elapsedSeconds)) / 1.55;
        const x = run.reducedMotion
          ? particle.x
          : particle.x + particle.vx * drag + Math.sin(particle.phase + elapsedSeconds * 8) * 4;
        const y = run.reducedMotion
          ? particle.y
          : particle.y + particle.vy * elapsedSeconds + window.innerHeight * 0.34 * elapsedSeconds * elapsedSeconds;
        const rotation = particle.rotation + particle.rotationSpeed * elapsedSeconds;
        context.save();
        context.translate(x, y);
        context.rotate(rotation);
        context.fillStyle = particle.color;
        context.fillRect(-particle.width / 2, -particle.height / 2, particle.width, particle.height);
        context.restore();
      }
      context.globalAlpha = 1;

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(draw);
        return;
      }
      frameRef.current = 0;
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      if (finishedEventRef.current !== eventId) {
        finishedEventRef.current = eventId;
        onFinishedRef.current(eventId);
      }
    };
    frameRef.current = requestAnimationFrame(draw);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      window.removeEventListener("resize", resizeCanvas);
      canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [eventId]);

  if (!eventId || typeof document === "undefined") return null;
  return createPortal(
    <canvas aria-hidden="true" className={styles.confettiCanvas} ref={canvasRef} />,
    document.body,
  );
}
