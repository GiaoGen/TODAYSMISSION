"use client";

import { useEffect, useRef, useState } from "react";

import { getMissionVoicePlaybackAction } from "@/features/missions/actions";
import type { MissionVoicePlayback } from "@/data/contracts/mission-voice";
import styles from "./MissionActionLayer.module.css";

type MissionVoiceListenerProps = {
  missionId: string;
  onClose: () => void;
};

export function MissionVoiceListener({ missionId, onClose }: MissionVoiceListenerProps) {
  const [voices, setVoices] = useState<readonly MissionVoicePlayback[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const generationRef = useRef(0);
  const activeVoice = voices[activeIndex];

  useEffect(() => {
    const generation = ++generationRef.current;

    void getMissionVoicePlaybackAction(missionId)
      .then((result) => {
        if (generationRef.current !== generation) return;
        if (!result.ok) {
          setError(result.error);
          setLoading(false);
          return;
        }
        setVoices(result.voices);
        setLoading(false);
      })
      .catch(() => {
        if (generationRef.current !== generation) return;
        setError("We couldn't load shared experiences. Please try again.");
        setLoading(false);
      });

    return () => {
      generationRef.current += 1;
    };
  }, [missionId]);

  useEffect(() => {
    const audio = audioRef.current;
    audio?.pause();
    if (audio) audio.currentTime = 0;
  }, [activeIndex]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
      if (audio) audio.currentTime = 0;
    };
  }, [activeVoice?.signedPlaybackUrl]);

  return (
    <div aria-live="polite" className={styles.voicePanel}>
      <div className={styles.voicePanelHeader}>
        <strong>I am nervous</strong>
        <button aria-label="Close shared experiences" className={styles.secondary} onClick={onClose} type="button">
          Close
        </button>
      </div>

      {loading ? <p className={styles.notice}>Loading shared experiences…</p> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {!loading && !error && !activeVoice ? <p className={styles.notice}>No one has shared one yet.</p> : null}

      {activeVoice ? (
        <>
          <p className={styles.voiceLabel}>Someone who did this:</p>
          <audio
            ref={audioRef}
            aria-label="Play shared experience"
            className={styles.voiceAudio}
            controls
            src={activeVoice.signedPlaybackUrl}
          />
          <div className={styles.voiceActions}>
            <span className={styles.voiceCount}>{activeIndex + 1} of {voices.length}</span>
            <button
              className={styles.secondary}
              onClick={() => setActiveIndex((current) => (current + 1) % voices.length)}
              type="button"
            >
              Next
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
