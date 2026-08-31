"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  COLLECTION_LABELS,
  type PackCollection,
} from "@/features/packs/model/home-carousel-state";
import type { HomePreferences } from "@/features/packs/model/home-preferences";
import type { CurrentUser } from "@/data/contracts/current-user";

import styles from "./HomeUserMenu.module.css";

type HomeUserMenuProps = {
  busy: boolean;
  currentUser: CurrentUser | null;
  theme: HomePreferences["theme"];
  bottomCollection: PackCollection;
  onMenuChange: (open: boolean) => boolean;
  onSwitchPacks: () => void;
  onThemeChange: () => void;
  onLogout: () => void;
};

export function HomeUserMenu({
  busy,
  currentUser,
  theme,
  bottomCollection,
  onMenuChange,
  onSwitchPacks,
  onThemeChange,
  onLogout,
}: HomeUserMenuProps) {
  const [phase, setPhase] = useState<"closed" | "open" | "closing">("closed");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstActionRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const outsidePointerRef = useRef(false);
  const nextCollection = bottomCollection === "joined" ? "all" : "joined";

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
        <button
          aria-label={`当前${COLLECTION_LABELS[bottomCollection]}，切换为${COLLECTION_LABELS[nextCollection]} / Switch Pack collection`}
          className={`${styles.trigger} ${styles.switchTrigger}`}
          disabled={busy || phase !== "closed"}
          onClick={onSwitchPacks}
          type="button"
        >
          <svg aria-hidden="true" className={styles.switchIcon} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 5h11m-3-3 3 3-3 3M14 11H3m3-3-3 3 3 3" />
          </svg>
        </button>
        <span className={styles.loginName}>{currentUser?.email ?? "Guest"}</span>
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
          aria-label="深色模式 / Dark mode"
          aria-checked={theme === "dark"}
          className={styles.row}
          disabled={phase === "closing"}
          onClick={onThemeChange}
          ref={firstActionRef}
          role="switch"
          type="button"
        >
          <span>深色 / 浅色</span>
          <span className={styles.value}>{theme === "dark" ? "深色" : "浅色"}</span>
        </button>
        {currentUser ? (
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
        ) : (
          <Link className={styles.row} href="/login?next=/" onClick={requestClose}>Login</Link>
        )}
      </dialog>
    </div>
  );
}
