"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  COLLECTION_LABELS,
  getCarouselAssignments,
  type PackCollection,
} from "@/features/packs/model/home-carousel-state";
import type { HomePreferences } from "@/features/packs/model/home-preferences";

import styles from "./HomeUserMenu.module.css";

type HomeUserMenuProps = {
  busy: boolean;
  loginName: string;
  theme: HomePreferences["theme"];
  topCollection: PackCollection;
  onMenuChange: (open: boolean) => boolean;
  onSwap: () => void;
  onThemeChange: () => void;
  onLogout: () => void;
};

export function HomeUserMenu({
  busy,
  loginName,
  theme,
  topCollection,
  onMenuChange,
  onSwap,
  onThemeChange,
  onLogout,
}: HomeUserMenuProps) {
  const [phase, setPhase] = useState<"closed" | "open" | "closing">("closed");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstActionRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const outsidePointerRef = useRef(false);
  const assignments = getCarouselAssignments(topCollection);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (phase === "open" && !dialog.open) {
      dialog.showModal();
      wasOpenRef.current = true;
      firstActionRef.current?.focus({ preventScroll: true });
    } else if (phase === "closed" && wasOpenRef.current) {
      dialog.close();
      wasOpenRef.current = false;
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [phase]);

  const requestClose = () => {
    if (phase === "open") setPhase("closing");
  };

  const isOutside = (clientX: number, clientY: number) => {
    const rect = dialogRef.current?.getBoundingClientRect();
    return !!rect && (
      clientX < rect.left || clientX > rect.right ||
      clientY < rect.top || clientY > rect.bottom
    );
  };

  return (
    <div className={styles.layer} data-menu-open={phase !== "closed"}>
      <div className={styles.identity}>
        <span className={styles.loginName}>{loginName}</span>
        <button
          aria-label="打开用户菜单 / Open user menu"
          aria-haspopup="dialog"
          aria-expanded={phase !== "closed"}
          className={styles.trigger}
          disabled={busy || phase !== "closed"}
          onClick={() => {
            if (onMenuChange(true)) setPhase("open");
          }}
          ref={triggerRef}
          type="button"
        >
          <span aria-hidden="true" className={styles.chevron} />
        </button>
      </div>

      <dialog
        aria-label="用户菜单 / User menu"
        aria-busy={busy}
        className={styles.dialog}
        data-phase={phase}
        ref={dialogRef}
        onCancel={(event) => {
          event.preventDefault();
          requestClose();
        }}
        onPointerDown={(event) => {
          outsidePointerRef.current = event.target === event.currentTarget && isOutside(event.clientX, event.clientY);
        }}
        onClick={(event) => {
          if (
            outsidePointerRef.current && event.target === event.currentTarget &&
            isOutside(event.clientX, event.clientY)
          ) requestClose();
          outsidePointerRef.current = false;
        }}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && phase === "closing") {
            onMenuChange(false);
            setPhase("closed");
          }
        }}
      >
        <button
          className={styles.row}
          disabled={busy || phase === "closing"}
          onClick={onSwap}
          ref={firstActionRef}
          type="button"
          aria-label={`上轮盘：${COLLECTION_LABELS[assignments.top]}，点击与下轮盘交换 / Swap top carousel`}
        >
          <span>上轮盘</span>
          <span className={styles.value}>{COLLECTION_LABELS[assignments.top]}</span>
          <span aria-hidden="true" className={styles.chevron} />
        </button>
        <button
          className={styles.row}
          disabled={busy || phase === "closing"}
          onClick={onSwap}
          type="button"
          aria-label={`下轮盘：${COLLECTION_LABELS[assignments.bottom]}，点击与上轮盘交换 / Swap bottom carousel`}
        >
          <span>下轮盘</span>
          <span className={styles.value}>{COLLECTION_LABELS[assignments.bottom]}</span>
          <span aria-hidden="true" className={styles.chevron} />
        </button>
        <button
          aria-label="深色模式 / Dark mode"
          aria-checked={theme === "dark"}
          className={styles.row}
          disabled={phase === "closing"}
          onClick={onThemeChange}
          role="switch"
          type="button"
        >
          <span>深色 / 浅色</span>
          <span className={styles.value}>{theme === "dark" ? "深色" : "浅色"}</span>
        </button>
        <button
          className={styles.row}
          disabled={phase === "closing"}
          onClick={() => {
            onLogout();
            requestClose();
          }}
          type="button"
        >
          Logout
        </button>
      </dialog>
    </div>
  );
}
