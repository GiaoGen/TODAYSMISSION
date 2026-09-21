"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { clearSessionSnapshot } from "@/features/navigation/model/session-snapshot";
import { createClient } from "@/lib/supabase/client";

import styles from "./ExploreAccountControl.module.css";

type ExploreAccountControlProps = {
  authenticated: boolean | null;
};

function AccountIcon() {
  return (
    <svg aria-hidden="true" className={styles.icon} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5.75 19c.55-3.25 2.72-5 6.25-5s5.7 1.75 6.25 5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </svg>
  );
}

export function ExploreAccountControl({ authenticated }: ExploreAccountControlProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const logOut = async () => {
    if (pending) return;
    setPending(true);
    setError(false);
    const { error: logoutError } = await createClient().auth.signOut();
    if (logoutError) {
      setError(true);
      setPending(false);
      return;
    }
    clearSessionSnapshot();
    setOpen(false);
    router.refresh();
  };

  if (authenticated === false) {
    return (
      <div className={styles.root} onPointerDown={(event) => event.stopPropagation()}>
        <Link aria-label="Log in" className={styles.trigger} href="/login?next=/explore">
          <AccountIcon />
        </Link>
      </div>
    );
  }

  return (
    <div
      className={styles.root}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      ref={rootRef}
    >
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={authenticated === null ? "Loading account" : "Open account menu"}
        className={styles.trigger}
        disabled={authenticated === null}
        onClick={() => setOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <AccountIcon />
      </button>
      {open ? (
        <div aria-label="Account menu" className={styles.tray} role="menu">
          <button
            className={styles.action}
            disabled={pending}
            onClick={() => { void logOut(); }}
            role="menuitem"
            type="button"
          >
            {pending ? "Logging out…" : error ? "Try log out again" : "Log out"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
