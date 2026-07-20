"use client";

import React, { useState, useEffect } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import styles from "./AuthForm.module.css";
import Link from "next/link";

interface AuthFormProps {
  onSuccess: (user: any) => void;
}

export default function AuthForm({ onSuccess }: AuthFormProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true);

  // Monitor real-time registration open/closed status
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "settings", "registration"),
      (docSnap) => {
        if (docSnap.exists()) {
          setIsRegistrationOpen(docSnap.data().isRegistrationOpen !== false);
        } else {
          setIsRegistrationOpen(true);
        }
      },
      (err) => {
        console.warn("Settings snapshot listener warning:", err.message);
        // Default to registration open if rules are not updated yet
        setIsRegistrationOpen(true);
      }
    );
    return () => unsubscribe();
  }, []);

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
        return;
      }

      // If registration is closed, verify if user already has a registered profile document
      if (!isRegistrationOpen) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          setError("New student signups are currently closed by administrator. Only existing registered students can sign in.");
          await auth.signOut();
          return;
        }
      }

      onSuccess(user);
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
        
        {!isRegistrationOpen && (
          <div style={{
            margin: "0 0 1rem 0",
            padding: "0.75rem 1rem",
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: "0.5rem",
            color: "#f87171",
            fontSize: "0.85rem",
            textAlign: "center",
            fontWeight: "500",
          }}>
            🔒 New signups closed by Admin.<br />Only registered students can sign in.
          </div>
        )}

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
