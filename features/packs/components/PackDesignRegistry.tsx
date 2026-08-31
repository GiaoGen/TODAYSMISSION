import type { ComponentType, CSSProperties } from "react";

import type {
  PackDesignKey,
  PackSummary,
  PackThemeKey,
} from "@/data/contracts/pack-summary";

import styles from "./PackDeck.module.css";

export type PackDesignProps = {
  pack: PackSummary;
  active?: boolean;
};

type CoverStyle = CSSProperties & {
  "--pack-bg": string;
  "--pack-fg": string;
};

type PackThemeAppearance = {
  symbol: string;
  background: string;
  foreground: string;
};

const PACK_THEME_REGISTRY = {
  "go-alone": { symbol: "●", background: "#E5392D", foreground: "#111111" },
  "talk-first": { symbol: "■", background: "#1457C9", foreground: "#F3E8C8" },
  "get-rejected": { symbol: "▲", background: "#F1C933", foreground: "#111111" },
  "be-seen": { symbol: "◆", background: "#111111", foreground: "#F3E8C8" },
} satisfies Record<PackThemeKey, PackThemeAppearance>;

function FieldEditionPackDesign({ pack, active = true }: PackDesignProps) {
  const theme = PACK_THEME_REGISTRY[pack.themeKey];
  const style: CoverStyle = {
    "--pack-bg": theme.background,
    "--pack-fg": theme.foreground,
  };

  return (
    <span className={styles.cover} data-active={active} style={style}>
      <span className={styles.coverInner}>
        <span className={styles.packTop}>
          <span className={styles.packIndex}>PACK {pack.number}</span>
          <span aria-hidden="true" className={styles.symbol}>{theme.symbol}</span>
        </span>
        <span className={styles.titleWrap}>
          <span className={styles.packTitle}>{pack.title}</span>
          <span className={styles.packDesc}>{pack.description}</span>
        </span>
        <span className={styles.packBottom}>
          <span className={styles.count}>{pack.missionCount} CARDS</span>
          <span className={styles.micro}>mission deck<br />field edition</span>
        </span>
      </span>
    </span>
  );
}

type PackDesignComponent = ComponentType<PackDesignProps>;

export const PACK_DESIGN_REGISTRY = {
  "field-edition": FieldEditionPackDesign,
} satisfies Record<PackDesignKey, PackDesignComponent>;

export function PackDesign({ pack, active = true }: PackDesignProps) {
  const Design = PACK_DESIGN_REGISTRY[pack.designKey];
  return <Design pack={pack} active={active} />;
}
