"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { localDateKey } from "@/features/calendar/model/calendar-month";
import { prefetchNavigationRoute, getCompletedDayRoute } from "@/features/navigation/model/navigation-prefetch";
import { completeMissionWithTextAction } from "@/features/missions/actions";
import { normalizeMissionTextProof } from "@/features/missions/model/mission-text-proof";
import styles from "./MissionActionLayer.module.css";
import { MissionProofRecorder } from "./MissionProofRecorder";

type MissionCompletionProofChooserProps = {
  audioPresentation?: "capsule" | "mission-card";
  audioTarget?: HTMLElement | null;
  initialMode?: Exclude<ProofMode, "chooser">;
  missionId: string;
  onCompleted: (completedLocalDate: string) => void;
  onInteractionLockChange: (locked: boolean) => void;
  onModeChange?: (mode: Exclude<ProofMode, "chooser">) => void;
  textTarget?: HTMLElement | null;
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

function MissionTextProofEditor({
  disabled,
  error,
  onChange,
  target,
  value,
}: {
  disabled: boolean;
  error?: string | null;
  onChange: (value: string) => void;
  target: HTMLElement;
  value: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || disabled) return;
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, [disabled]);

  return createPortal(
    <div className={styles.textProofInline} data-gallery-action onPointerDown={(event) => event.stopPropagation()}>
      <textarea
        aria-describedby={error ? "mission-text-proof-inline-error" : undefined}
        aria-label="What happened?"
        className={styles.textProofInlineInput}
        disabled={disabled}
        maxLength={1000}
        onChange={(event) => onChange(event.target.value)}
        ref={textareaRef}
        value={value}
      />
      {error ? <p className={styles.textProofInlineError} id="mission-text-proof-inline-error">{error}</p> : null}
    </div>,
    target,
  );
}

export function MissionCompletionProofChooser({
  audioPresentation = "capsule",
  audioTarget = null,
  initialMode,
  missionId,
  onCompleted,
  onInteractionLockChange,
  onModeChange,
  textTarget = null,
}: MissionCompletionProofChooserProps) {
  const router = useRouter();
  const [mode, setMode] = useState<ProofMode>(initialMode ?? "chooser");
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
        cardTarget={audioTarget}
        missionId={missionId}
        onCompleted={onCompleted}
        onInteractionLockChange={onInteractionLockChange}
        presentation={audioPresentation}
      />
    );
  }

  if (mode === "text" && textTarget) {
    const hasText = normalizeMissionTextProof(textDraft) !== null;
    return (
      <div aria-live="polite" className={styles.proof} onPointerDown={(event) => event.stopPropagation()}>
        <MissionTextProofEditor
          disabled={submitting}
          error={textError}
          onChange={(value) => {
            setTextDraft(value);
            if (textError) setTextError(null);
          }}
          target={textTarget}
          value={textDraft}
        />
        <button
          aria-label="Upload text experience"
          className={styles.textProofUpload}
          disabled={submitting || !hasText}
          onClick={() => void submitText()}
          type="button"
        >
          {submitting ? "uploading…" : "upload"}
        </button>
      </div>
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
            else {
              setMode("text");
              onModeChange?.("text");
            }
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
            onModeChange?.("audio");
          }}
          type="button"
        >
          <span>record</span>
        </button>
      </div>
    </div>
  );
}
