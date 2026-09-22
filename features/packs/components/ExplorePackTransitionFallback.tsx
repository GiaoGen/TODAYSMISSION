"use client";

import type { CSSProperties } from "react";
import { ViewTransition } from "react";
import Image from "next/image";

import type { ExplorePackPreviewData } from "@/features/packs/model/explore-pack-content";
import { getPackTransitionName } from "@/features/packs/model/pack-transition";

import styles from "./ExplorePackPreview.module.css";

type TransitionFallbackStyle = CSSProperties & {
  "--preview-background": string;
  "--preview-foreground": string;
};

export function ExplorePackTransitionFallback({ pack }: { pack: ExplorePackPreviewData }) {
  const style: TransitionFallbackStyle = {
    "--preview-background": pack.background,
    "--preview-foreground": pack.foreground,
  };

  return (
    <section
      aria-label={`${pack.title} Mission artwork preview`}
      className={styles.root}
      data-phase="collapsed"
      style={style}
    >
      <div className={styles.coverHero} data-preview-card>
        <ViewTransition
          default="none"
          name={getPackTransitionName(pack.slug, "bottom")}
          share="pack-card-morph"
        >
          <span className={styles.coverSurface}>
            <Image
              alt={`${pack.title} Pack cover`}
              className={styles.image}
              draggable={false}
              fill
              priority
              sizes="(max-width: 640px) 80vw, 340px"
              src={pack.cover}
            />
          </span>
        </ViewTransition>
      </div>
      <h1 className={styles.title}>{pack.title}</h1>
    </section>
  );
}
