"use client";

import React from "react";
import styles from "./Navbar.module.css";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

interface NavbarProps {
  userEmail?: string | null;
  role?: "user" | "admin" | "superadmin";
  onLogout?: () => void;
}

export default function Navbar({ userEmail, role, onLogout }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
      return;
    }
    try {
      await signOut(auth);
      // Clear admin/superadmin local sessions too
      localStorage.removeItem("admin_session");
      localStorage.removeItem("superadmin_session");
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navBrand}>RIVA</div>
      <div className={styles.navProfile}>
        {userEmail && (
          <span className={styles.userEmail}>
            {userEmail} {role ? `(${role})` : ""}
          </span>
        )}
        {(userEmail || role) && (
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}
