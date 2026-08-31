import Image from "next/image";

import styles from "./PackCard.module.css";

type PackCardProps = {
  eager?: boolean;
  imageAlt: string;
  imageSrc: string;
  sizes?: string;
};

export function PackCard({
  eager = false,
  imageAlt,
  imageSrc,
  sizes = "(max-width: 719px) 46vw, 236px",
}: PackCardProps) {
  return (
    <span className={styles.frame}>
      <Image
        alt={imageAlt}
        className={styles.image}
        draggable={false}
        fill
        fetchPriority={eager ? "high" : "auto"}
        loading={eager ? "eager" : "lazy"}
        sizes={sizes}
        src={imageSrc}
        unoptimized
      />
    </span>
  );
}
