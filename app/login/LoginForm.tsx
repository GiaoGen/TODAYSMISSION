"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  resendOtp,
  sendOtp,
  type AuthActionState,
  verifyOtp,
} from "@/features/auth/actions";
import styles from "./page.module.css";

const initialAuthActionState: AuthActionState = {};

type LoginFormProps = {
  mode: "email" | "otp";
  email: string | null;
  next: string;
};

export function LoginForm({ mode, email, next }: LoginFormProps) {
  const [sendState, sendAction, isSending] = useActionState(sendOtp, initialAuthActionState);
  const [verifyState, verifyAction, isVerifying] = useActionState(verifyOtp, initialAuthActionState);
  const [resendState, resendAction, isResending] = useActionState(resendOtp, initialAuthActionState);

  if (mode === "otp" && email) {
    return (
      <>
        <p className={styles.intro}>Enter the code we sent to your email.</p>
        <form action={verifyAction} className={styles.form}>
          <label className={styles.label} htmlFor="token">6-digit code</label>
          <input
            autoComplete="one-time-code"
            className={styles.input}
            id="token"
            inputMode="numeric"
            maxLength={6}
            name="token"
            pattern="[0-9]{6}"
            required
            type="text"
          />
          <input name="next" type="hidden" value={next} />
          <button className={styles.submit} disabled={isVerifying} type="submit">
            {isVerifying ? "Verifying…" : "Verify code"}
          </button>
          {verifyState.error && <p aria-live="polite" className={styles.error} role="alert">{verifyState.error}</p>}
        </form>
        <form action={resendAction} className={styles.form}>
          <input name="next" type="hidden" value={next} />
          <button className={styles.secondary} disabled={isResending} type="submit">
            {isResending ? "Sending…" : "Send a new code"}
          </button>
          {resendState.error && <p aria-live="polite" className={styles.error} role="alert">{resendState.error}</p>}
          {resendState.message && <p aria-live="polite" className={styles.message}>{resendState.message}</p>}
        </form>
        <Link className={styles.back} href={`/login?next=${encodeURIComponent(next)}`}>Use a different email</Link>
      </>
    );
  }

  return (
    <>
      <p className={styles.intro}>Use your email to receive a six-digit login code.</p>
      <form action={sendAction} className={styles.form}>
        <label className={styles.label} htmlFor="email">Email</label>
        <input autoComplete="email" className={styles.input} id="email" name="email" required type="email" />
        <input name="next" type="hidden" value={next} />
        <button className={styles.submit} disabled={isSending} type="submit">
          {isSending ? "Sending…" : "Continue with email"}
        </button>
        {sendState.error && <p aria-live="polite" className={styles.error} role="alert">{sendState.error}</p>}
      </form>
      <Link className={styles.back} href="/">Back to TODAYSMISSION</Link>
    </>
  );
}
