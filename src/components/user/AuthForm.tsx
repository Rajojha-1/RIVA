"use client";

import React, { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import styles from "./AuthForm.module.css";
import Link from "next/link";

interface AuthFormProps {
  onSuccess: (user: any) => void;
}

export default function AuthForm({ onSuccess }: AuthFormProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account",
      });

      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Validate domain mapping
      if (user.email && !user.email.endsWith("@kiet.edu")) {
        setError("Access restricted. Please sign in with your @kiet.edu college email address only.");
        await auth.signOut();
      } else {
        onSuccess(user);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h2 className={styles.title}>Student Portal</h2>
        
        {error && <div className={styles.errorMessage}>{error}</div>}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className={styles.googleBtn}
        >
          {loading ? "Connecting..." : "Sign in with Google"}
        </button>

        <div className={styles.warningMessage}>
          Use KIET email ID only
        </div>

        <div className={styles.divider} />

        <div className={styles.adminOption}>
          <Link href="/admin" className={styles.adminLink}>
            Login as Admin
          </Link>
        </div>
      </div>
    </div>
  );
}
