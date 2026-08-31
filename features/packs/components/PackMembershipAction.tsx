"use client";

import { useState, useTransition } from "react";

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

  if (joined) {
    return <p aria-live="polite" className={styles.joined}><span aria-hidden="true">✓</span> Joined</p>;
  }

  const handleTake = () => {
    if (!authenticated) {
      window.location.assign(getPackLoginDestination(pack.slug));
      return;
    }
    if (isTaking) return;

    setError(null);
    startTaking(async () => {
      const result = await takePackAction(pack.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onJoined();
    });
  };

  return (
    <div className={styles.action}>
      <button className={styles.primary} disabled={isTaking} onClick={handleTake} type="button">
        {isTaking ? "Taking…" : "Take this Pack"}
      </button>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  );
}
