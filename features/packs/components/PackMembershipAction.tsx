"use client";

import { useRef, useState, useTransition } from "react";

import type { PackSummary } from "@/data/contracts/pack-summary";
import { takePackAction } from "@/features/packs/actions";
import { getPackLoginDestination } from "@/features/packs/model/pack-action-state";
import styles from "./PackMembershipAction.module.css";

type PackMembershipActionProps = {
  pack: PackSummary;
  authenticated: boolean;
  joined: boolean;
  onJoined: () => void;
};

export function PackMembershipAction({ pack, authenticated, joined, onJoined }: PackMembershipActionProps) {
  const [isTaking, startTaking] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const takingRef = useRef(false);

  if (joined) {
    return <p aria-live="polite" className={styles.joined}><span aria-hidden="true">✓</span> Joined</p>;
  }

  const handleTake = () => {
    if (!authenticated) {
      window.location.assign(getPackLoginDestination(pack.slug));
      return;
    }
    if (takingRef.current) return;

    takingRef.current = true;
    setError(null);
    startTaking(async () => {
      try {
        const result = await takePackAction(pack.id);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        onJoined();
      } finally {
        takingRef.current = false;
      }
    });
  };

  return (
    <div className={styles.action}>
      <button aria-busy={isTaking} className={styles.primary} disabled={isTaking} onClick={handleTake} type="button">
        {isTaking ? "taking…" : "take this"}
      </button>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  );
}
