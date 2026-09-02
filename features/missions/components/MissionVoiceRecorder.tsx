"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createMissionVoiceUploadTarget,
  submitMissionVoiceAction,
} from "@/features/missions/actions";
import {
  getMissionAudioFormat,
  getSupportedMissionAudioFormat,
  MISSION_AUDIO_MAX_BYTES,
  MISSION_AUDIO_MAX_DURATION_MS,
  MISSION_AUDIO_MIN_DURATION_MS,
  type MissionAudioFormat,
} from "@/features/missions/model/mission-audio";
import { createClient } from "@/lib/supabase/client";
import styles from "./MissionActionLayer.module.css";

type MissionVoiceRecorderProps = {
  missionId: string;
  onSubmitted: () => void;
};

type RecorderState = "idle" | "recording" | "recorded" | "submitting" | "submitted";

function recordingError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Microphone permission is required to share an experience.";
    }
    if (error.name === "NotFoundError") return "No microphone was found.";
    if (error.name === "NotSupportedError") return "Audio recording is not supported in this browser.";
  }
  return "We couldn't start recording. Please try again.";
}

export function MissionVoiceRecorder({ missionId, onSubmitted }: MissionVoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const selectedFormatRef = useRef<MissionAudioFormat | null>(null);
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

    const format = getSupportedMissionAudioFormat((mimeType) => MediaRecorder.isTypeSupported(mimeType));
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
        const actualFormat = getMissionAudioFormat(mimeType);
        const blob = new Blob(chunks, { type: mimeType });
        if (!actualFormat || blob.size === 0 || blob.size > MISSION_AUDIO_MAX_BYTES || elapsed < MISSION_AUDIO_MIN_DURATION_MS) {
          setState("idle");
          setError(blob.size > MISSION_AUDIO_MAX_BYTES
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
        setError("We couldn't record that experience. Please try again.");
      };

      recorder.start();
      setState("recording");
      stopTimerRef.current = setTimeout(() => {
        if (recorderRef.current === recorder && recorder.state !== "inactive") recorder.stop();
      }, MISSION_AUDIO_MAX_DURATION_MS);
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
      const target = await createMissionVoiceUploadTarget(submissionMissionId);
      if (generationRef.current !== generation || missionIdRef.current !== submissionMissionId) return;
      if (!target.ok) {
        setState("recorded");
        setError(target.error);
        return;
      }

      const voicePath = `${target.pathBase}.${format.extension}`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("mission-voices")
        .upload(voicePath, blob, { contentType: format.mimeType, upsert: false });

      if (generationRef.current !== generation || missionIdRef.current !== submissionMissionId) return;
      if (uploadError) {
        if (process.env.NODE_ENV !== "production") console.error("Mission voice upload failed.", uploadError);
        setState("recorded");
        setError("We couldn't upload the experience. Please try again.");
        return;
      }

      const submission = await submitMissionVoiceAction(submissionMissionId, voicePath);
      if (generationRef.current !== generation || missionIdRef.current !== submissionMissionId) return;
      if (!submission.ok) {
        setState("recorded");
        setError(submission.error);
        return;
      }

      clearPreview();
      setState("submitted");
      onSubmitted();
    } catch {
      if (generationRef.current !== generation || missionIdRef.current !== submissionMissionId) return;
      setState("recorded");
      setError("We couldn't submit the experience. Please try again.");
    }
  };

  return (
    <div aria-live="polite" className={styles.voice}>
      {state === "idle" && (
        <button className={styles.primary} onClick={startRecording} type="button">
          Record
        </button>
      )}

      {state === "recording" && (
        <div className={styles.voiceRecording}>
          <span>Recording…</span>
          <button className={styles.secondary} onClick={stopRecording} type="button">
            Stop
          </button>
        </div>
      )}

      {(state === "recorded" || state === "submitting") && audioUrl && (
        <>
          <audio aria-label="Play shared experience" className={styles.voiceAudio} controls src={audioUrl} />
          <div className={styles.voiceActions}>
            <button className={styles.secondary} disabled={state === "submitting"} onClick={rerecord} type="button">
              Re-record
            </button>
            <button className={styles.primary} disabled={state === "submitting"} onClick={submit} type="button">
              {state === "submitting" ? "Sharing…" : "Share"}
            </button>
          </div>
        </>
      )}

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  );
}
