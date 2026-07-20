"use client";

import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import styles from "./AdminSelector.module.css";

interface Admin {
  id: string;
  username: string;
  name?: string;
  mentorCategory?: string;
}

interface AdminSelectorProps {
  userId: string;
  status: string;
  requestedAdminId?: string;
  assignedAdminId?: string;
  approvedDomain?: string;
  choices?: string[];
  onUpdate: () => void;
}

export default function AdminSelector({
  userId,
  status,
  requestedAdminId,
  assignedAdminId,
  approvedDomain,
  choices = [],
  onUpdate,
}: AdminSelectorProps) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load admins list
  useEffect(() => {
    async function fetchAdmins() {
      try {
        const querySnapshot = await getDocs(collection(db, "admins"));
        const adminList: Admin[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          adminList.push({
            id: doc.id,
            username: data.username,
            name: data.name || data.username,
            mentorCategory: data.mentorCategory || "",
          });
        });
        setAdmins(adminList);
      } catch (err) {
        console.error("Error fetching admins:", err);
      }
    }
    fetchAdmins();
  }, []);

  const handleSendRequest = async () => {
    if (!selectedAdminId) return;
    setLoading(true);
    setError("");

    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        status: "pending_admin_approval",
        requestedAdminId: selectedAdminId,
      });
      onUpdate();
    } catch (err) {
      console.error(err);
      setError("Failed to request admin.");
    } finally {
      setLoading(false);
    }
  };

  // Filter admins to show only mentors assigned to student's choices
  const mentorAdmins = admins.filter((adm) => {
    if (!choices || choices.length === 0) return true; // fallback
    if (!adm.mentorCategory) return false; // hide legacy non-mentors
    return choices.includes(adm.mentorCategory);
  });

  const getStatusDisplay = () => {
    if (status === "approved" && assignedAdminId) {
      return (
        <div className={styles.statusBoxSuccess}>
          You are assigned to Admin: <strong>{assignedAdminId}</strong>
          {approvedDomain && (
            <div style={{ marginTop: "0.25rem", fontSize: "0.9rem" }}>
              Domain: <strong>{approvedDomain}</strong>
            </div>
          )}
        </div>
      );
    }
    if (status === "pending_admin_approval" && requestedAdminId) {
      return (
        <div className={styles.statusBoxPending}>
          Request sent to Admin: <strong>{requestedAdminId}</strong>. Waiting for approval...
        </div>
      );
    }
    if (status === "verified") {
      return (
        <div className={styles.selectBox}>
          <h4 className={styles.selectTitle}>Choose an Admin</h4>
          <p className={styles.selectSubtitle}>Select an admin to work under. They will review and accept your request.</p>
          <div className={styles.formGroupRow}>
            <select
              className={styles.select}
              value={selectedAdminId}
              onChange={(e) => setSelectedAdminId(e.target.value)}
            >
              <option value="">Select Admin</option>
              {mentorAdmins.map((adm) => (
                <option key={adm.id} value={adm.id}>
                  {adm.name} ({adm.username}) - {adm.mentorCategory}
                </option>
              ))}
            </select>
            <button
              onClick={handleSendRequest}
              disabled={loading || !selectedAdminId}
              className={styles.sendBtn}
            >
              {loading ? "Sending..." : "Request to Join"}
            </button>
          </div>
          {error && <div className={styles.errorMessage}>{error}</div>}
        </div>
      );
    }
    // Rejected by Admin case: status is set back to verified but requestedAdminId can be empty or set
    return (
      <div className={styles.selectBox}>
        <div className={styles.statusBoxRejected}>
          Your request was rejected. Please select another admin to send a request to.
        </div>
        <div className={styles.formGroupRow} style={{ marginTop: "1rem" }}>
          <select
            className={styles.select}
            value={selectedAdminId}
            onChange={(e) => setSelectedAdminId(e.target.value)}
          >
            <option value="">Select Admin</option>
            {mentorAdmins.map((adm) => (
              <option key={adm.id} value={adm.id}>
                {adm.name} ({adm.username}) - {adm.mentorCategory}
              </option>
            ))}
          </select>
          <button
            onClick={handleSendRequest}
            disabled={loading || !selectedAdminId}
            className={styles.sendBtn}
          >
            {loading ? "Sending..." : "Request to Join"}
          </button>
        </div>
        {error && <div className={styles.errorMessage}>{error}</div>}
      </div>
    );
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Admin Assignment</h3>
      {getStatusDisplay()}
    </div>
  );
}
