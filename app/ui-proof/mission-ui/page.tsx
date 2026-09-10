import type { Metadata } from "next";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Mission UI Proof — Doing Things Alone",
  description: "Isolated Mission Text Card and page background visual proof.",
};

type Variant = "aperture" | "field" | "pressure" | "split" | "final";

type MissionProof = {
  title: string;
  instruction: string;
  variant: Variant;
};

const missions: MissionProof[] = [
  {
    title: "MOVIE FOR ONE",
    instruction:
      "Go watch a movie by yourself. Pick a movie you actually want to see and stay through the whole thing.",
    variant: "aperture",
  },
  {
    title: "STAY AWHILE",
    instruction:
      "Spend 15 minutes alone in a public place. Try not to use your phone just to make yourself look busy.",
    variant: "field",
  },
  {
    title: "SEE IT FOR YOURSELF",
    instruction:
      "Go somewhere people visit mainly for the experience — by yourself. Choose something available near you and stay long enough to experience it at your own pace.",
    variant: "pressure",
  },
  {
    title: "SPEND THE DAY YOUR WAY",
    instruction:
      "Plan half a day for yourself and spend it out alone. Choose at least two or three things you genuinely want to do. Don’t turn it into a checklist of errands. Make it a real part of your day.",
    variant: "split",
  },
  {
    title: "STOP WAITING",
    instruction:
      "What have you been waiting for someone else to do with you? Something you actually want. Something you’ve kept putting off because no one would come with you. Stop waiting. Go do it.",
    variant: "final",
  },
];

function MissionCard({ mission }: { mission: MissionProof }) {
  return (
    <article className={styles.card} data-variant={mission.variant}>
      <div className={styles.geometry} aria-hidden="true">
        <i className={styles.planeA} />
        <i className={styles.planeB} />
        <i className={styles.planeC} />
        <i className={styles.cut} />
      </div>

      <div className={styles.cardContent}>
        <p className={styles.packName}>DOING THINGS ALONE</p>
        <h2 className={styles.title}>{mission.title}</h2>
        <p className={styles.instruction}>{mission.instruction}</p>
      </div>
    </article>
  );
}

export default function MissionUIProofPage() {
  return (
    <div className={styles.page}>
      <div className={styles.backgroundStructure} aria-hidden="true">
        <i />
        <i />
        <i />
      </div>

      <header className={styles.proofHeader}>
        <p>RUN 4 / UI PROOF</p>
        <h1>Mission Text Cards</h1>
        <span>One shared background · five controlled variants</span>
      </header>

      <main className={styles.gallery} aria-label="Mission Text Card template variants">
        {missions.map((mission) => (
          <MissionCard key={mission.variant} mission={mission} />
        ))}
      </main>

      <footer className={styles.proofFooter}>
        <span>DESKTOP / FIVE-UP</span>
        <span>MOBILE / SWIPE</span>
      </footer>
    </div>
  );
}
