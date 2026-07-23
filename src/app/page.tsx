"use client";

import React, { useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import AuthForm from "@/components/user/AuthForm";
import SidebarSummary from "@/components/user/SidebarSummary";
import ProfileForm from "@/components/user/ProfileForm";
import ChoiceSelector from "@/components/user/ChoiceSelector";
import AdminSelector from "@/components/user/AdminSelector";
import WhatsAppChat from "@/components/chat/WhatsAppChat";
import styles from "./page.module.css";

interface UserProfile {
  name: string;
  branch: string;
  section: string;
  github: string;
  leetcode: string;
  linkedin: string;
  phone: string;
  areaOfInterest: string;
  collegeEmail: string;
  choices?: string[];
  status?: string;
  requestedAdminId?: string;
  assignedAdminId?: string;
  remarks?: string;
  approvedDomain?: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "chat">("dashboard");

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Monitor Profile state changes from Firestore
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error subscribing to profile:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
        <p>Loading Student Portal...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.authWrapper}>
        <Navbar />
        <AuthForm onSuccess={(u) => setUser(u)} />
      </div>
    );
  }

  // Determine current onboarding stage
  const hasFilledProfile = !!(profile && profile.name && profile.branch && profile.phone);
  const hasSelectedChoices = !!(profile && profile.choices && profile.choices.length >= 2);
  const isVerified = profile?.status === "verified" || profile?.status === "pending_admin_approval" || profile?.status === "approved";

  const studentNavItems = [
    { id: "dashboard", label: "Profile & Choices" },
    { id: "chat", label: "WhatsApp Chat", color: "#00a884" },
  ];

  return (
    <div className={styles.appContainer}>
      <Navbar
        userEmail={user.email}
        navItems={studentNavItems}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as "dashboard" | "chat")}
      />
      <div className={styles.mainLayout}>
        {/* Left Side Panel */}
        <aside className={styles.sidebar}>
          <SidebarSummary profile={profile} />
        </aside>

        {/* Main Content Area */}
        <main className={styles.mainContent}>
          {activeTab === "chat" && (
            <WhatsAppChat
              currentUser={{
                uid: user.uid,
                displayName: profile?.name || user.email?.split("@")[0] || "Student",
                email: user.email || "",
                role: "user",
              }}
            />
          )}

          {activeTab === "dashboard" && (
            <>
              {!hasFilledProfile && (
                <ProfileForm
                  userId={user.uid}
                  userEmail={user.email || ""}
                  initialData={profile}
                  onSave={(data) => setProfile((prev) => ({ ...prev, ...data }))}
                />
              )}

            {hasFilledProfile && !hasSelectedChoices && (
              <ChoiceSelector
                userId={user.uid}
                initialChoices={profile?.choices || []}
                onSave={(choices) =>
                  setProfile((prev) => (prev ? { ...prev, choices } : null))
                }
              />
            )}

            {hasFilledProfile && hasSelectedChoices && !isVerified && (
              <div className={styles.pendingVerificationCard}>
                {profile?.status === "rejected" ? (
                  <>
                    <h3 style={{ color: "var(--destructive)" }}>
                      Verification Rejected
                    </h3>
                    <p>
                      Your profile details were reviewed and rejected by the
                      Superadmin.
                    </p>
                    {profile.remarks && (
                      <div
                        style={{
                          margin: "1rem 0",
                          padding: "1rem",
                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                          borderRadius: "var(--radius)",
                          borderLeft: "4px solid var(--destructive)",
                        }}
                      >
                        <strong>Feedback Remarks:</strong> "{profile.remarks}"
                      </div>
                    )}
                    <button
                      onClick={() => {
                        const userRef = doc(db, "users", user.uid);
                        import("firebase/firestore").then(({ updateDoc }) => {
                          updateDoc(userRef, { status: "draft" });
                        });
                      }}
                      className={styles.editBtn}
                    >
                      Edit Profile & Selections
                    </button>
                  </>
                ) : (
                  <>
                    <h3>Verification Pending</h3>
                    <p>
                      You have successfully saved your profile details and
                      selections. Your profile is now under review by the
                      Superadmin.
                    </p>
                    <div className={styles.statusBadge}>
                      Status: Pending Verification
                    </div>
                    {profile?.remarks && (
                      <div
                        style={{
                          margin: "1rem 0",
                          fontSize: "0.85rem",
                          opacity: 0.8,
                        }}
                      >
                        <strong>Latest Superadmin Note:</strong> "{profile.remarks}"
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            "Would you like to edit your choices or profile? This will reset verification status."
                          )
                        ) {
                          const userRef = doc(db, "users", user.uid);
                          import("firebase/firestore").then(({ updateDoc }) => {
                            updateDoc(userRef, { status: "draft", choices: [] });
                          });
                        }
                      }}
                      className={styles.editBtn}
                    >
                      Edit Selections
                    </button>
                  </>
                )}
              </div>
            )}

            {hasFilledProfile && hasSelectedChoices && isVerified && (
              <AdminSelector
                userId={user.uid}
                status={profile?.status || "verified"}
                requestedAdminId={profile?.requestedAdminId}
                assignedAdminId={profile?.assignedAdminId}
                approvedDomain={profile?.approvedDomain}
                choices={profile?.choices || []}
                onUpdate={() => {}} // Snapshot listener will update automatically
              />
            )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
