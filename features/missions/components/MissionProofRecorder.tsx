"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  completeMissionWithAudioAction,
  createMissionProofUploadTarget,
} from "@/features/missions/actions";
import {
  getMissionProofFormat,
  getSupportedMissionProofFormat,
  MISSION_PROOF_MAX_BYTES,
  MISSION_PROOF_MAX_DURATION_MS,
  MISSION_PROOF_MIN_DURATION_MS,
  type MissionProofFormat,
} from "@/features/missions/model/mission-proof";
import { createClient } from "@/lib/supabase/client";
import { localDateKey } from "@/features/calendar/model/calendar-month";
import styles from "./MissionActionLayer.module.css";

type MissionProofRecorderProps = {
  missionId: string;
  onCompleted: () => void;
};

type RecorderState = "idle" | "recording" | "recorded" | "submitting";

function recordingError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Microphone permission is required to record proof.";
    }
    if (error.name === "NotFoundError") {
      return "No microphone was found.";
    }
    if (error.name === "NotSupportedError") {
      return "Audio recording is not supported in this browser.";
    }
  }
  return "We couldn't start recording. Please try again.";
}

export function MissionProofRecorder({ missionId, onCompleted }: MissionProofRecorderProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const selectedFormatRef = useRef<MissionProofFormat | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationRef = useRef(0);
  const missionIdRef = useRef(missionId);

  const clearStopTimer = useCallback(() => {
    if (stopTimerRef.current !== null) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const revokePreview = useCallback(() => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    blobRef.current = null;
  }, []);

  const clearPreview = useCallback(() => {
    revokePreview();
    setAudioUrl(null);
  }, [revokePreview]);

  useEffect(() => {
    missionIdRef.current = missionId;
    generationRef.current += 1;

    return () => {
      generationRef.current += 1;
      clearStopTimer();
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      recorderRef.current = null;
      stopTracks();
      startedAtRef.current = null;
      revokePreview();
    };
  }, [clearStopTimer, missionId, revokePreview, stopTracks]);

  const startRecording = async () => {
    if (state !== "idle") return;
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Audio recording is not supported in this browser.");
      return;
    }

    const format = getSupportedMissionProofFormat((mimeType) => MediaRecorder.isTypeSupported(mimeType));
    if (!format) {
      setError("Audio recording is not supported in this browser.");
      return;
    }

    const generation = generationRef.current;
    const recordingMissionId = missionId;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (generationRef.current !== generation || missionIdRef.current !== recordingMissionId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      const recorder = new MediaRecorder(stream, { mimeType: format.mimeType });
      const chunks: Blob[] = [];
      selectedFormatRef.current = format;
      streamRef.current = stream;
      recorderRef.current = recorder;
      startedAtRef.current = performance.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        clearStopTimer();
        stopTracks();
        recorderRef.current = null;
        const elapsed = performance.now() - (startedAtRef.current ?? performance.now());
        startedAtRef.current = null;

        if (generationRef.current !== generation || missionIdRef.current !== recordingMissionId) return;

        const mimeType = recorder.mimeType || format.mimeType;
        const actualFormat = getMissionProofFormat(mimeType);
        const blob = new Blob(chunks, { type: mimeType });
        if (
          !actualFormat
          || blob.size === 0
          || blob.size > MISSION_PROOF_MAX_BYTES
          || elapsed < MISSION_PROOF_MIN_DURATION_MS
        ) {
          setState("idle");
          setError(blob.size > MISSION_PROOF_MAX_BYTES
            ? "That recording is too large. Please keep it shorter."
            : "Please record a little longer and try again.");
          return;
        }

        selectedFormatRef.current = actualFormat;
        blobRef.current = blob;
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
        const nextAudioUrl = URL.createObjectURL(blob);
        audioUrlRef.current = nextAudioUrl;
        setAudioUrl(nextAudioUrl);
        setState("recorded");
      };
      recorder.onerror = () => {
        clearStopTimer();
        stopTracks();
        recorderRef.current = null;
        startedAtRef.current = null;
        if (generationRef.current !== generation) return;
        setState("idle");
        setError("We couldn't record that proof. Please try again.");
      };

      recorder.start();
      setState("recording");
      stopTimerRef.current = setTimeout(() => {
        if (recorderRef.current === recorder && recorder.state !== "inactive") recorder.stop();
      }, MISSION_PROOF_MAX_DURATION_MS);
    } catch (caughtError) {
      stopTracks();
      recorderRef.current = null;
      startedAtRef.current = null;
      setState("idle");
      setError(recordingError(caughtError));
    }
  };

  const stopRecording = () => {
    if (state !== "recording") return;
    clearStopTimer();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  const rerecord = () => {
    if (state === "submitting") return;
    clearPreview();
    setError(null);
    setState("idle");
  };

  const submit = async () => {
    const blob = blobRef.current;
    const format = selectedFormatRef.current;
    if (state !== "recorded" || !blob || !format) return;

    const generation = generationRef.current;
    const submissionMissionId = missionId;
    setState("submitting");
    setError(null);

    try {
      const target = await createMissionProofUploadTarget(submissionMissionId);
      if (generationRef.current !== generation || missionIdRef.current !== submissionMissionId) return;
      if (!target.ok) {
        setState("recorded");
        setError(target.error);
        return;
      }

      const proofPath = `${target.pathBase}.${format.extension}`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("mission-proofs")
        .upload(proofPath, blob, { contentType: format.mimeType, upsert: false });

      if (generationRef.current !== generation || missionIdRef.current !== submissionMissionId) return;
      if (uploadError) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Mission proof upload failed.", uploadError);
        }
        setState("recorded");
        setError("We couldn't upload the audio proof. Please try again.");
        return;
      }

      const completion = await completeMissionWithAudioAction(
        submissionMissionId,
        proofPath,
        localDateKey(new Date()),
      );
      if (generationRef.current !== generation || missionIdRef.current !== submissionMissionId) return;
      if (!completion.ok) {
        setState("recorded");
        setError(completion.error);
        return;
      }

      clearPreview();
      setState("idle");
      onCompleted();
    } catch {
      if (generationRef.current !== generation || missionIdRef.current !== submissionMissionId) return;
      setState("recorded");
      setError("We couldn't complete this mission. Please try again.");
    }
  };

  return (
    <div aria-live="polite" className={styles.proof}>
      {state === "idle" && (
        <button className={styles.primary} onClick={startRecording} type="button">
          Record proof
        </button>
      )}

      {state === "recording" && (
        <div className={styles.proofRecording}>
          <span>Recording…</span>
          <button className={styles.secondary} onClick={stopRecording} type="button">
            Stop
          </button>
        </div>
      )}

      {(state === "recorded" || state === "submitting") && audioUrl && (
        <>
          <audio aria-label="Play audio proof" className={styles.proofAudio} controls src={audioUrl} />
          <div className={styles.proofActions}>
            <button className={styles.secondary} disabled={state === "submitting"} onClick={rerecord} type="button">
              Re-record
            </button>
            <button className={styles.primary} disabled={state === "submitting"} onClick={submit} type="button">
              {state === "submitting" ? "Submitting…" : "Submit & complete"}
            </button>
          </div>
        </>
      )}

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  );
}
