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
import { localDateKey } from "@/features/calendar/model/calendar-month";
import { createClient } from "@/lib/supabase/client";
import styles from "./MissionActionLayer.module.css";

type MissionProofRecorderProps = {
  missionId: string;
  onCompleted: () => void;
};

type RecorderState = "idle" | "recording" | "recorded" | "submitting";

const WAVEFORM_BAR_COUNT = 34;

function recordingError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Microphone permission is required to record proof.";
    }
    if (error.name === "NotFoundError") return "No microphone was found.";
    if (error.name === "NotSupportedError") return "Audio recording is not supported in this browser.";
  }
  return "We couldn't start recording. Please try again.";
}

export function MissionProofRecorder({ missionId, onCompleted }: MissionProofRecorderProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveformRef = useRef<HTMLCanvasElement>(null);
  const waveformFrameRef = useRef(0);
  const waveformSamplesRef = useRef<number[]>(Array(WAVEFORM_BAR_COUNT).fill(0.16));
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

  const drawWaveform = useCallback(() => {
    const canvas = waveformRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(bounds.width * ratio));
    const height = Math.max(1, Math.round(bounds.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "rgba(255, 255, 255, .9)";
    const samples = waveformSamplesRef.current;
    const gap = 3 * ratio;
    const barWidth = Math.max(1.5 * ratio, (width - gap * (samples.length - 1)) / samples.length);
    samples.forEach((sample, index) => {
      const barHeight = Math.max(3 * ratio, sample * height * 0.9);
      const x = index * (barWidth + gap);
      const y = (height - barHeight) / 2;
      context.beginPath();
      context.roundRect(x, y, barWidth, barHeight, barWidth / 2);
      context.fill();
    });
  }, []);

  const stopVisualiser = useCallback(() => {
    cancelAnimationFrame(waveformFrameRef.current);
    waveformFrameRef.current = 0;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    const audioContext = audioContextRef.current;
    audioContextRef.current = null;
    if (audioContext && audioContext.state !== "closed") void audioContext.close();
  }, []);

  const startVisualiser = useCallback((stream: MediaStream) => {
    if (typeof AudioContext === "undefined") return;
    let audioContext: AudioContext;
    try {
      audioContext = new AudioContext();
    } catch {
      return;
    }
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.72;
    audioContext.createMediaStreamSource(stream).connect(analyser);
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    if (audioContext.state === "suspended") void audioContext.resume();
    const data = new Uint8Array(analyser.frequencyBinCount);

    const update = () => {
      if (analyserRef.current !== analyser) return;
      analyser.getByteFrequencyData(data);
      waveformSamplesRef.current = Array.from({ length: WAVEFORM_BAR_COUNT }, (_, index) => {
        const dataIndex = Math.min(data.length - 1, Math.floor(index * data.length / WAVEFORM_BAR_COUNT));
        return Math.max(0.12, data[dataIndex] / 255);
      });
      drawWaveform();
      waveformFrameRef.current = requestAnimationFrame(update);
    };
    update();
  }, [drawWaveform]);

  const revokePreview = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    blobRef.current = null;
  }, []);

  const clearPreview = useCallback(() => {
    revokePreview();
    setAudioUrl(null);
    setPlaying(false);
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
      stopVisualiser();
      stopTracks();
      startedAtRef.current = null;
      revokePreview();
    };
  }, [clearStopTimer, missionId, revokePreview, stopTracks, stopVisualiser]);

  useEffect(() => {
    if (state !== "recorded") return;
    drawWaveform();
    const observer = new ResizeObserver(drawWaveform);
    if (waveformRef.current) observer.observe(waveformRef.current);
    return () => observer.disconnect();
  }, [drawWaveform, state]);

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
      waveformSamplesRef.current = Array(WAVEFORM_BAR_COUNT).fill(0.16);
      selectedFormatRef.current = format;
      streamRef.current = stream;
      recorderRef.current = recorder;
      startedAtRef.current = performance.now();
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        clearStopTimer();
        stopVisualiser();
        stopTracks();
        recorderRef.current = null;
        const elapsed = performance.now() - (startedAtRef.current ?? performance.now());
        startedAtRef.current = null;
        if (generationRef.current !== generation || missionIdRef.current !== recordingMissionId) return;

        const mimeType = recorder.mimeType || format.mimeType;
        const actualFormat = getMissionProofFormat(mimeType);
        const blob = new Blob(chunks, { type: mimeType });
        if (!actualFormat || blob.size === 0 || blob.size > MISSION_PROOF_MAX_BYTES || elapsed < MISSION_PROOF_MIN_DURATION_MS) {
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
        stopVisualiser();
        stopTracks();
        recorderRef.current = null;
        startedAtRef.current = null;
        if (generationRef.current !== generation) return;
        setState("idle");
        setError("We couldn't record that proof. Please try again.");
      };

      recorder.start();
      setState("recording");
      startVisualiser(stream);
      stopTimerRef.current = setTimeout(() => {
        if (recorderRef.current === recorder && recorder.state !== "inactive") recorder.stop();
      }, MISSION_PROOF_MAX_DURATION_MS);
    } catch (caughtError) {
      stopVisualiser();
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

  const togglePlayback = async () => {
    if (state !== "recorded") return;
    const audio = audioRef.current;
    if (!audio) return;
    setError(null);
    if (!audio.paused) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      setError("We couldn't play that recording. Please try again.");
    }
  };

  const submit = async () => {
    const blob = blobRef.current;
    const format = selectedFormatRef.current;
    if (state !== "recorded" || !blob || !format) return;
    const generation = generationRef.current;
    const submissionMissionId = missionId;
    audioRef.current?.pause();
    setPlaying(false);
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
        if (process.env.NODE_ENV !== "production") console.error("Mission proof upload failed.", uploadError);
        setState("recorded");
        setError("We couldn't upload the audio proof. Please try again.");
        return;
      }

      const completion = await completeMissionWithAudioAction(submissionMissionId, proofPath, localDateKey(new Date()));
      if (generationRef.current !== generation || missionIdRef.current !== submissionMissionId) return;
      if (!completion.ok) {
        setState("recorded");
        setError(completion.error);
        return;
      }
      clearPreview();
      onCompleted();
    } catch {
      if (generationRef.current !== generation || missionIdRef.current !== submissionMissionId) return;
      setState("recorded");
      setError("We couldn't complete this mission. Please try again.");
    }
  };

  return (
    <div aria-live="polite" className={styles.proof} onPointerDown={(event) => event.stopPropagation()}>
      {state === "idle" ? (
        <button className={`${styles.proofCapsule} ${styles.proofRecord}`} onClick={startRecording} type="button">
          <span aria-hidden="true" className={styles.recordDot} />
          <span>Record</span>
        </button>
      ) : (
        <div className={styles.proofCapsule} data-state={state}>
          {state === "recorded" ? (
            <button aria-label="Upload recording" className={styles.proofIcon} onClick={submit} type="button">
              <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                <path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" />
              </svg>
            </button>
          ) : <span aria-hidden="true" className={styles.proofIconSpacer} />}

          {state === "submitting" ? (
            <span className={styles.proofStatus}>Uploading…</span>
          ) : (
            <canvas aria-hidden="true" className={styles.proofWaveform} ref={waveformRef} />
          )}

          {state === "recording" ? (
            <button aria-label="Stop recording" className={styles.proofIcon} onClick={stopRecording} type="button">
              <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24"><rect height="10" rx="1.5" width="10" x="7" y="7" /></svg>
            </button>
          ) : state === "recorded" ? (
            <button aria-label={playing ? "Pause recording" : "Play recording"} className={styles.proofIcon} onClick={togglePlayback} type="button">
              {playing ? (
                <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
              ) : (
                <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24"><path d="m8 5 11 7-11 7z" /></svg>
              )}
            </button>
          ) : <span aria-hidden="true" className={styles.proofIconSpacer} />}
        </div>
      )}

      {audioUrl ? (
        <audio
          className={styles.proofAudioHidden}
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
          ref={audioRef}
          src={audioUrl}
        />
      ) : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
    </div>
  );
}
