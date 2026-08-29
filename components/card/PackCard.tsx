import Image from "next/image";

import type { PackSummary } from "@/data/contracts/pack-summary";

import styles from "./PackCard.module.css";

type PackCardProps = {
  eager?: boolean;
  pack: PackSummary;
  sizes?: string;
};

export function PackCard({
  eager = false,
  pack,
  sizes = "(max-width: 719px) 46vw, 236px",
}: PackCardProps) {
  return (
    <span className={styles.frame}>
      <Image
        alt={pack.imageAlt}
        className={styles.image}
        draggable={false}
        fill
        fetchPriority={eager ? "high" : "auto"}
        loading={eager ? "eager" : "lazy"}
        sizes={sizes}
        src={pack.imageSrc}
        unoptimized
      />
    </span>
  );
}
