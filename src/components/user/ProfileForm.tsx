"use client";

import React, { useState, useEffect } from "react";
import { collection, doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import styles from "./ProfileForm.module.css";

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
}

interface ProfileFormProps {
  userId: string;
  userEmail: string;
  initialData: UserProfile | null;
  onSave: (data: UserProfile) => void;
}

export default function ProfileForm({ userId, userEmail, initialData, onSave }: ProfileFormProps) {
  const [formData, setFormData] = useState<UserProfile>({
    name: "",
    branch: "",
    section: "A",
    github: "",
    leetcode: "",
    linkedin: "",
    phone: "",
    areaOfInterest: "",
    collegeEmail: userEmail,
  });

  const [branches, setBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Load branches dynamically in real-time
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "branches"),
      (querySnapshot) => {
        const branchList: string[] = [];
        querySnapshot.forEach((doc) => {
          branchList.push(doc.data().name || doc.id);
        });
        
        if (branchList.length === 0) {
          // Default fallbacks if none are configured in database
          setBranches(["Computer Science", "Information Technology", "Electronics & Comm"]);
        } else {
          setBranches(branchList);
        }
      },
      (err) => {
        console.error("Error listening to branches:", err);
        setError("Database Read Error: " + err.message + ". Please verify your Firestore rules allow reads.");
        // Fallback options
        setBranches(["Computer Science", "Information Technology", "Electronics & Comm"]);
      }
    );
    return () => unsubscribe();
  }, []);

  // Set initial data if exists
  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        collegeEmail: initialData.collegeEmail || userEmail,
      });
    }
  }, [initialData, userEmail]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, formData, { merge: true });
      setMessage("Profile saved successfully!");
      onSave(formData);
    } catch (err: any) {
      console.error("Error saving profile:", err);
      setError("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const sections = ["A", "B", "C", "D", "E", "F", "G"];

  return (
    <form onSubmit={handleSubmit} className={styles.formCard}>
      <h3 className={styles.formTitle}>Profile Details</h3>
      {message && <div className={styles.successMessage}>{message}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.grid}>
        <div className={styles.group}>
          <label className={styles.label}>Full Name</label>
          <input
            type="text"
            name="name"
            required
            className={styles.input}
            value={formData.name}
            onChange={handleChange}
            placeholder="John Doe"
          />
        </div>

        <div className={styles.group}>
          <label className={styles.label}>Branch</label>
          <select
            name="branch"
            required
            className={styles.select}
            value={formData.branch}
            onChange={handleChange}
          >
            <option value="">Select Branch</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.group}>
          <label className={styles.label}>Section</label>
          <select
            name="section"
            required
            className={styles.select}
            value={formData.section}
            onChange={handleChange}
          >
            {sections.map((s) => (
              <option key={s} value={s}>
                Section {s}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.group}>
          <label className={styles.label}>College Email</label>
          <input
            type="email"
            name="collegeEmail"
            required
            className={styles.input}
            value={formData.collegeEmail}
            onChange={handleChange}
            placeholder="john.doe@college.edu"
          />
        </div>

        <div className={styles.group}>
          <label className={styles.label}>Phone Number</label>
          <input
            type="tel"
            name="phone"
            required
            className={styles.input}
            value={formData.phone}
            onChange={handleChange}
            placeholder="+1 234 567 890"
          />
        </div>

        <div className={styles.group}>
          <label className={styles.label}>GitHub Profile</label>
          <input
            type="url"
            name="github"
            required
            className={styles.input}
            value={formData.github}
            onChange={handleChange}
            placeholder="https://github.com/username"
          />
        </div>

        <div className={styles.group}>
          <label className={styles.label}>LeetCode Profile</label>
          <input
            type="url"
            name="leetcode"
            required
            className={styles.input}
            value={formData.leetcode}
            onChange={handleChange}
            placeholder="https://leetcode.com/username"
          />
        </div>

        <div className={styles.group}>
          <label className={styles.label}>LinkedIn Profile</label>
          <input
            type="url"
            name="linkedin"
            required
            className={styles.input}
            value={formData.linkedin}
            onChange={handleChange}
            placeholder="https://linkedin.com/in/username"
          />
        </div>

        <div className={styles.group} style={{ gridColumn: "1 / -1" }}>
          <label className={styles.label}>Area of Interest</label>
          <input
            type="text"
            name="areaOfInterest"
            required
            className={styles.input}
            value={formData.areaOfInterest}
            onChange={handleChange}
            placeholder="e.g. Web Development, Machine Learning, Cyber Security"
          />
        </div>
      </div>

      <button type="submit" disabled={loading} className={styles.saveBtn}>
        {loading ? "Saving..." : "Save Details"}
      </button>
    </form>
  );
}
