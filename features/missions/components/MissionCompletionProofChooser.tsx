"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { localDateKey } from "@/features/calendar/model/calendar-month";
import { prefetchNavigationRoute, getCompletedDayRoute } from "@/features/navigation/model/navigation-prefetch";
import { completeMissionWithTextAction } from "@/features/missions/actions";
import { normalizeMissionTextProof } from "@/features/missions/model/mission-text-proof";
import styles from "./MissionActionLayer.module.css";
import { MissionProofRecorder } from "./MissionProofRecorder";

type MissionCompletionProofChooserProps = {
  missionId: string;
  onCompleted: (completedLocalDate: string) => void;
  onInteractionLockChange: (locked: boolean) => void;
};

type ProofMode = "chooser" | "text" | "audio";

export function MissionTextProofCard({
  value,
  onChange,
  disabled,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  error?: string | null;
}) {
  return (
    <div className={styles.textProofFace} data-gallery-action>
      <section aria-label="Text experience" className={styles.textProofCard}>
        <div className={styles.textProofHeader}>
          <span>MISSION EXPERIENCE</span>
          <span>{value.length}/1000</span>
        </div>
        <textarea
          aria-describedby={error ? "mission-text-proof-error" : undefined}
          aria-label="What happened?"
          className={styles.textProofInput}
          disabled={disabled}
          maxLength={1000}
          onChange={(event) => onChange(event.target.value)}
          onPointerDown={(event) => event.stopPropagation()}
          placeholder="What happened?"
          value={value}
        />
        {error ? <p className={styles.textProofError} id="mission-text-proof-error">{error}</p> : null}
      </section>
    </div>
  );
}

export function MissionCompletionProofChooser({
  missionId,
  onCompleted,
  onInteractionLockChange,
}: MissionCompletionProofChooserProps) {
  const router = useRouter();
  const [mode, setMode] = useState<ProofMode>("chooser");
  const [textDraft, setTextDraft] = useState("");
  const [textError, setTextError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (mode !== "text") return;
    onInteractionLockChange(true);
    return () => onInteractionLockChange(false);
  }, [mode, onInteractionLockChange]);

  const submitText = async () => {
    if (submitting) return;
    const proofText = normalizeMissionTextProof(textDraft);
    if (!proofText) {
      setTextError("Write a short note before uploading.");
      return;
    }

    setSubmitting(true);
    setTextError(null);
    const completion = await completeMissionWithTextAction(missionId, proofText, localDateKey(new Date()));
    if (!completion.ok) {
      setTextError(completion.error);
      setSubmitting(false);
      return;
    }

    const completedRoute = getCompletedDayRoute(completion.completedLocalDate);
    if (completedRoute) prefetchNavigationRoute(router, completedRoute);
    onCompleted(completion.completedLocalDate);
  };

  if (mode === "audio") {
    return (
      <MissionProofRecorder
        missionId={missionId}
        onCompleted={onCompleted}
        onInteractionLockChange={onInteractionLockChange}
      />
    );
  }

  return (
    <div aria-live="polite" className={styles.proof} onPointerDown={(event) => event.stopPropagation()}>
      {mode === "text" ? (
        <MissionTextProofCard
          disabled={submitting}
          error={textError}
          onChange={(value) => {
            setTextDraft(value);
            if (textError) setTextError(null);
          }}
          value={textDraft}
        />
      ) : null}
      <div aria-label="Choose completion experience" className={styles.proofChooserCapsule}>
        <button
          aria-label={mode === "text" ? "Upload text experience" : "Type experience"}
          className={`${styles.proofChooserOption} ${styles.proofChooserType}`}
          disabled={submitting || (mode === "text" && normalizeMissionTextProof(textDraft) === null)}
          onClick={() => {
            if (mode === "text") void submitText();
            else setMode("text");
          }}
          type="button"
        >
          <span>{mode === "text" ? "upload" : "type"}</span>
        </button>
        <button
          aria-label="Record audio experience"
          className={`${styles.proofChooserOption} ${styles.proofChooserRecord}`}
          disabled={submitting}
          onClick={() => {
            setTextError(null);
            setMode("audio");
          }}
          type="button"
        >
          <span>record</span>
        </button>
      </div>
    </div>
  );
}
