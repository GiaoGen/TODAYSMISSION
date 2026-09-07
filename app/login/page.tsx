import Link from "next/link";

import { getSafeNextPath } from "@/features/auth/model/safe-next-path";
import { LoginForm } from "./LoginForm";
import styles from "./page.module.css";

export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; next?: string }>;
}) {
  const query = await searchParams;
  const next = getSafeNextPath(query.next);
  const mode = query.mode === "signup" ? "signup" : "signin";

  return (
    <section className={styles.page}>
      <div className={styles.panel}>
        <Link className={styles.brand} href="/">TODAYSMISSION</Link>
        <h1 className={styles.title}>{mode === "signin" ? "Sign in" : "Create account"}</h1>
        <LoginForm mode={mode} next={next} />
      </div>
    </section>
  );
}
