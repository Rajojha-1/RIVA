"use client";

import React, { useState } from "react";
import styles from "./Navbar.module.css";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

interface NavbarProps {
  userEmail?: string | null;
  role?: "user" | "admin" | "superadmin";
  activeTab?: "dashboard" | "chat";
  onTabChange?: (tab: "dashboard" | "chat") => void;
  onLogout?: () => void;
}

export default function Navbar({
  userEmail,
  role,
  activeTab = "dashboard",
  onTabChange,
  onLogout,
}: NavbarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

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

  const handleTabClick = (tab: "dashboard" | "chat") => {
    if (onTabChange) {
      onTabChange(tab);
    }
    setMenuOpen(false);
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navBrandContainer}>
        {/* Hamburger Menu Toggle Button */}
        {userEmail && (
          <button
            className={styles.hamburgerToggleBtn}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            title={menuOpen ? "Close Menu" : "Open Navigation Menu"}
          >
            {menuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
              </svg>
            )}
          </button>
        )}
        <div className={styles.navBrand}>RIVA</div>
      </div>

      {/* Desktop Navigation Links */}
      {userEmail && onTabChange && (
        <div className={styles.navCenter}>
          <button
            className={`${styles.tabBtn} ${
              activeTab === "dashboard" ? styles.activeTabBtn : ""
            }`}
            onClick={() => handleTabClick("dashboard")}
          >
            📋 Dashboard
          </button>
          <button
            className={`${styles.tabBtn} ${
              activeTab === "chat" ? styles.activeTabBtn : ""
            }`}
            onClick={() => handleTabClick("chat")}
          >
            💬 WhatsApp Chat
          </button>
        </div>
      )}

      {/* Desktop Profile & Logout */}
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

      {/* Collapsible Hamburger Menu Drawer (Mobile & Small Viewports) */}
      {menuOpen && userEmail && (
        <div className={styles.mobileMenuDrawer}>
          {onTabChange && (
            <div className={styles.mobileMenuTabs}>
              <button
                className={`${styles.mobileTabBtn} ${
                  activeTab === "dashboard" ? styles.mobileActiveTabBtn : ""
                }`}
                onClick={() => handleTabClick("dashboard")}
              >
                📋 Dashboard
              </button>
              <button
                className={`${styles.mobileTabBtn} ${
                  activeTab === "chat" ? styles.mobileActiveTabBtn : ""
                }`}
                onClick={() => handleTabClick("chat")}
              >
                💬 WhatsApp Chat
              </button>
            </div>
          )}

          <div className={styles.mobileProfileSection}>
            <span className={styles.mobileUserEmail}>
              {userEmail} {role ? `(${role})` : ""}
            </span>
            <button onClick={handleLogout} className={styles.mobileLogoutBtn}>
              Logout Account
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
