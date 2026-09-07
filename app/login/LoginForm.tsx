"use client";

import Link from "next/link";
import { useActionState, useState, type FormEvent } from "react";

import {
  signInWithPassword,
  signUpWithPassword,
  type AuthActionState,
} from "@/features/auth/actions";
import styles from "./page.module.css";

const initialAuthActionState: AuthActionState = {};

type LoginFormProps = {
  mode: "signin" | "signup";
  next: string;
};

export function LoginForm({ mode, next }: LoginFormProps) {
  const [signInState, signInAction, isSigningIn] = useActionState(signInWithPassword, initialAuthActionState);
  const [signUpState, signUpAction, isSigningUp] = useActionState(signUpWithPassword, initialAuthActionState);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const isSignup = mode === "signup";
  const state = isSignup ? signUpState : signInState;
  const pending = isSignup ? isSigningUp : isSigningIn;

  function handleSignupSubmit(event: FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirmPassword")) {
      event.preventDefault();
      setConfirmError("Passwords do not match.");
      return;
    }
    setConfirmError(null);
  }

  return (
    <>
      <p className={styles.intro}>
        {isSignup ? "Create an account with your email and password." : "Sign in with your email and password."}
      </p>
      <form action={isSignup ? signUpAction : signInAction} className={styles.form} onSubmit={isSignup ? handleSignupSubmit : undefined}>
        <label className={styles.label} htmlFor="email">Email</label>
        <input autoComplete="email" className={styles.input} id="email" name="email" required type="email" />
        <label className={styles.label} htmlFor="password">Password</label>
        <input autoComplete={isSignup ? "new-password" : "current-password"} className={styles.input} id="password" minLength={6} name="password" required type="password" />
        {isSignup && <>
          <label className={styles.label} htmlFor="confirmPassword">Confirm password</label>
          <input autoComplete="new-password" className={styles.input} id="confirmPassword" minLength={6} name="confirmPassword" onChange={(event) => setConfirmPassword(event.target.value)} required type="password" value={confirmPassword} />
        </>}
        <input name="next" type="hidden" value={next} />
        <button className={styles.submit} disabled={pending} type="submit">
          {pending ? (isSignup ? "Creating account…" : "Signing in…") : (isSignup ? "Create account" : "Sign in")}
        </button>
        {confirmError && <p aria-live="polite" className={styles.error} role="alert">{confirmError}</p>}
        {state.error && <p aria-live="polite" className={styles.error} role="alert">{state.error}</p>}
        {state.message && <p aria-live="polite" className={styles.message}>{state.message}</p>}
      </form>
      <Link className={styles.back} href={`/login?mode=${isSignup ? "signin" : "signup"}&next=${encodeURIComponent(next)}`}>
        {isSignup ? "Already have an account? Sign in" : "New here? Create an account"}
      </Link>
      <Link className={styles.back} href="/">Back to TODAYSMISSION</Link>
    </>
  );
}
