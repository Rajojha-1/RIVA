"use client";

import React from "react";
import styles from "./SidebarSummary.module.css";

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
}

interface SidebarSummaryProps {
  profile: UserProfile | null;
}

export default function SidebarSummary({ profile }: SidebarSummaryProps) {
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "pending_verification":
        return <span className={`${styles.badge} ${styles.badgePending}`}>Pending Verification</span>;
      case "verified":
        return <span className={`${styles.badge} ${styles.badgeVerified}`}>Verified By Superadmin</span>;
      case "pending_admin_approval":
        return <span className={`${styles.badge} ${styles.badgePending}`}>Pending Admin Approval</span>;
      case "approved":
        return <span className={`${styles.badge} ${styles.badgeApproved}`}>Approved & Assigned</span>;
      default:
        return <span className={`${styles.badge} ${styles.badgeDraft}`}>Profile Form Incomplete</span>;
    }
  };

  if (!profile || !profile.name) {
    return (
      <div className={styles.sidebar}>
        <h3 className={styles.title}>Student Portal</h3>
        <p className={styles.placeholder}>Please fill in your details to set up your profile.</p>
        <div style={{ marginTop: "1rem" }}>{getStatusBadge()}</div>
      </div>
    );
  }

  return (
    <div className={styles.sidebar}>
      <h3 className={styles.title}>Student Profile</h3>
      
      <div className={styles.statusSection}>
        {getStatusBadge(profile.status)}
      </div>

      <div className={styles.detailGroup}>
        <div className={styles.detailItem}>
          <span className={styles.label}>Name</span>
          <span className={styles.value}>{profile.name}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.label}>Branch</span>
          <span className={styles.value}>{profile.branch}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.label}>Section</span>
          <span className={styles.value}>Section {profile.section}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.label}>College Email</span>
          <span className={styles.value}>{profile.collegeEmail}</span>
        </div>
        <div className={styles.detailItem}>
          <span className={styles.label}>Phone</span>
          <span className={styles.value}>{profile.phone}</span>
        </div>
      </div>

      <div className={styles.divider} />

      <h4 className={styles.subTitle}>Social / Coding Profiles</h4>
      <div className={styles.linksGroup}>
        {profile.github && (
          <a href={profile.github} target="_blank" rel="noopener noreferrer" className={styles.link}>
            🔗 GitHub
          </a>
        )}
        {profile.leetcode && (
          <a href={profile.leetcode} target="_blank" rel="noopener noreferrer" className={styles.link}>
            🔗 LeetCode
          </a>
        )}
        {profile.linkedin && (
          <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className={styles.link}>
            🔗 LinkedIn
          </a>
        )}
      </div>

      {profile.choices && profile.choices.length > 0 && (
        <>
          <div className={styles.divider} />
          <h4 className={styles.subTitle}>Selected Choices</h4>
          <ul className={styles.choicesList}>
            {profile.choices.map((choice, i) => (
              <li key={choice} className={styles.choiceItem}>
                <span className={styles.choiceRank}>{i + 1}</span>
                <span className={styles.choiceName}>{choice}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
