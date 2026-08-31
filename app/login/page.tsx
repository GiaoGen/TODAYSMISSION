import { cookies } from "next/headers";
import Link from "next/link";

import { getSafeNextPath } from "@/features/auth/model/safe-next-path";
import { LoginForm } from "./LoginForm";
import styles from "./page.module.css";

const PENDING_EMAIL_COOKIE = "tm_pending_email";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; step?: string }>;
}) {
  const query = await searchParams;
  const next = getSafeNextPath(query.next);
  const pendingEmail = (await cookies()).get(PENDING_EMAIL_COOKIE)?.value ?? null;
  const mode = pendingEmail && query.step === "otp"
    ? "otp"
    : pendingEmail && query.step === "sent"
      ? "sent"
      : "email";

  return (
    <section className={styles.page}>
      <div className={styles.panel}>
        <Link className={styles.brand} href="/">TODAYSMISSION</Link>
        <h1 className={styles.title}>{mode === "email" ? "Log in" : "Check your email"}</h1>
        <LoginForm email={pendingEmail} mode={mode} next={next} />
      </div>
    </section>
  );
}
