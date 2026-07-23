"use client";

import React, { useState } from "react";
import styles from "./Navbar.module.css";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export interface NavItem {
  id: string;
  label: string;
  badge?: string | number;
  color?: string;
}

interface NavbarProps {
  userEmail?: string | null;
  role?: "user" | "admin" | "superadmin";
  navItems?: NavItem[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  onLogout?: () => void;
}

export default function Navbar({
  userEmail,
  role,
  navItems = [],
  activeTab,
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

  const handleItemClick = (id: string) => {
    if (onTabChange) {
      onTabChange(id);
    }
    setMenuOpen(false);
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.navBrandContainer}>
        {/* Hamburger Menu Toggle Button for Mobile */}
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
      {userEmail && navItems.length > 0 && onTabChange && (
        <div className={styles.navCenter}>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`${styles.tabBtn} ${isActive ? styles.activeTabBtn : ""}`}
                onClick={() => handleItemClick(item.id)}
                style={item.color ? { color: isActive ? "#ffffff" : item.color } : {}}
              >
                {item.label}
                {item.badge !== undefined && (
                  <span className={styles.badge}>{item.badge}</span>
                )}
              </button>
            );
          })}
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

      {/* Collapsible Single Hamburger Menu Drawer (Mobile & Small Viewports) */}
      {menuOpen && userEmail && (
        <>
          <div
            className={styles.menuBackdrop}
            onClick={() => setMenuOpen(false)}
          />
          <div className={styles.mobileMenuDrawer}>
            {navItems.length > 0 && onTabChange && (
              <div className={styles.mobileMenuTabs}>
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      className={`${styles.mobileTabBtn} ${
                        isActive ? styles.mobileActiveTabBtn : ""
                      }`}
                      onClick={() => handleItemClick(item.id)}
                      style={
                        item.color
                          ? { color: isActive ? "#ffffff" : item.color }
                          : {}
                      }
                    >
                      <span>{item.label}</span>
                      {item.badge !== undefined && (
                        <span className={styles.badge}>{item.badge}</span>
                      )}
                    </button>
                  );
                })}
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
        </>
      )}
    </nav>
  );
}
