"use client";

import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import styles from "./ChoiceSelector.module.css";

interface ChoiceSelectorProps {
  userId: string;
  initialChoices: string[];
  onSave: (choices: string[]) => void;
}

export default function ChoiceSelector({ userId, initialChoices, onSave }: ChoiceSelectorProps) {
  const [availableChoices, setAvailableChoices] = useState<string[]>([]);
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Load choices
  useEffect(() => {
    async function fetchChoices() {
      try {
        const querySnapshot = await getDocs(collection(db, "choices"));
        const choiceList: string[] = [];
        querySnapshot.forEach((doc) => {
          choiceList.push(doc.data().name || doc.id);
        });
        // fallback choices if none configured by admins yet
        if (choiceList.length === 0) {
          setAvailableChoices(["Web Development", "App Development", "UI/UX Design", "Machine Learning", "Data Structures & Alg"]);
        } else {
          setAvailableChoices(choiceList);
        }
      } catch (err) {
        console.error("Error fetching choices:", err);
        setAvailableChoices(["Web Development", "App Development", "UI/UX Design", "Machine Learning", "Data Structures & Alg"]);
      }
    }
    fetchChoices();
  }, []);

  useEffect(() => {
    if (initialChoices) {
      setSelectedChoices(initialChoices);
    }
  }, [initialChoices]);

  const toggleChoice = (choiceName: string) => {
    setSelectedChoices((prev) => {
      if (prev.includes(choiceName)) {
        return prev.filter((c) => c !== choiceName);
      } else {
        if (prev.length >= 4) {
          setError("You can select a maximum of 4 choices.");
          return prev;
        }
        setError("");
        return [...prev, choiceName];
      }
    });
  };

  const handleSave = async () => {
    if (selectedChoices.length < 2) {
      setError("Please select a minimum of 2 choices.");
      return;
    }
    if (selectedChoices.length > 4) {
      setError("Please select a maximum of 4 choices.");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        choices: selectedChoices,
        status: "pending_verification" // Trigger verification step after selecting choices
      });
      setMessage("Choices saved successfully! Profile sent for verification.");
      onSave(selectedChoices);
    } catch (err) {
      console.error("Error updating choices:", err);
      setError("Failed to save choices. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.choiceCard}>
      <h3 className={styles.title}>Select Your Choices</h3>
      <p className={styles.subtitle}>Choose between 2 and 4 options in order of interest.</p>

      {message && <div className={styles.successMessage}>{message}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.grid}>
        {availableChoices.map((choice) => {
          const isSelected = selectedChoices.includes(choice);
          return (
            <div
              key={choice}
              onClick={() => toggleChoice(choice)}
              className={`${styles.chip} ${isSelected ? styles.selected : ""}`}
            >
              <span>{choice}</span>
              {isSelected && <span className={styles.checkmark}>✓</span>}
            </div>
          );
        })}
      </div>

      <div className={styles.footer}>
        <span className={styles.counter}>
          Selected: {selectedChoices.length} / 4
        </span>
        <button
          onClick={handleSave}
          disabled={loading || selectedChoices.length < 2 || selectedChoices.length > 4}
          className={styles.saveBtn}
        >
          {loading ? "Saving..." : "Save & Submit"}
        </button>
      </div>
    </div>
  );
}
