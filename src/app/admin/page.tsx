"use client";

import React, { useState, useEffect } from "react";
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, updateDoc, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import styles from "./admin.module.css";

interface Choice {
  id: string;
  name: string;
  createdByAdmin: string;
}

interface StudentRequest {
  id: string;
  name: string;
  branch: string;
  section: string;
  collegeEmail: string;
  choices: string[];
  github: string;
  leetcode: string;
  linkedin: string;
  phone: string;
  areaOfInterest: string;
  status: string;
  requestedAdminId?: string;
  assignedAdminId?: string;
  remarks?: string;
  rejectedByAdmins?: string[];
}

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"profile" | "choices" | "requests">("requests");

  // Dashboard Data
  const [choices, setChoices] = useState<Choice[]>([]);
  const [studentRequests, setStudentRequests] = useState<StudentRequest[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<StudentRequest[]>([]);
  const [selectedFilterDomain, setSelectedFilterDomain] = useState<string>("all");

  const [newChoiceName, setNewChoiceName] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  // Check login session on mount
  useEffect(() => {
    const session = localStorage.getItem("admin_session");
    if (session) {
      const { username, password } = JSON.parse(session);
      setAdminUsername(username);
      setAdminPassword(password);
      setIsLoggedIn(true);
    }
    setLoading(false);
  }, []);

  // Monitor Choices from Firestore
  useEffect(() => {
    if (!isLoggedIn) return;

    const unsubscribe = onSnapshot(collection(db, "choices"), (snapshot) => {
      const list: Choice[] = [];
      snapshot.forEach((doc) => {
        list.push({
          id: doc.id,
          name: doc.data().name,
          createdByAdmin: doc.data().createdByAdmin || "system",
        });
      });
      setChoices(list);
    });
    return () => unsubscribe();
  }, [isLoggedIn]);

  // Monitor Requests & Assigned Students
  useEffect(() => {
    if (!isLoggedIn || !adminUsername) return;

    const usersRef = collection(db, "users");
    
    // Subscribe to all users to filter locally for simplicity and speed
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const requestsList: StudentRequest[] = [];
      const assignedList: StudentRequest[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const rejectedBy = data.rejectedByAdmins || [];

        const student: StudentRequest = {
          id: docSnap.id,
          name: data.name || "",
          branch: data.branch || "",
          section: data.section || "",
          collegeEmail: data.collegeEmail || "",
          choices: data.choices || [],
          github: data.github || "",
          leetcode: data.leetcode || "",
          linkedin: data.linkedin || "",
          phone: data.phone || "",
          areaOfInterest: data.areaOfInterest || "",
          status: data.status || "",
          requestedAdminId: data.requestedAdminId || "",
          assignedAdminId: data.assignedAdminId || "",
          remarks: data.remarks || "",
          rejectedByAdmins: rejectedBy,
        };

        // Student is in the pool if verified or requested this admin, and not rejected by this admin
        const isPendingForThisAdmin = student.requestedAdminId === adminUsername && student.status === "pending_admin_approval";
        const isVerifiedInPool = student.status === "verified" && !rejectedBy.includes(adminUsername);

        if (isPendingForThisAdmin || isVerifiedInPool) {
          requestsList.push(student);
        }
        if (student.assignedAdminId === adminUsername && student.status === "approved") {
          assignedList.push(student);
        }
      });

      setStudentRequests(requestsList);
      setAssignedStudents(assignedList);
    });

    return () => unsubscribe();
  }, [isLoggedIn, adminUsername]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!usernameInput || !passwordInput) {
      setLoginError("Please enter username and password.");
      return;
    }

    try {
      const adminDocRef = doc(db, "admins", usernameInput);
      const docSnap = await getDoc(adminDocRef);

      if (docSnap.exists() && docSnap.data().password === passwordInput) {
        setAdminUsername(usernameInput);
        setAdminPassword(passwordInput);
        setIsLoggedIn(true);
        localStorage.setItem(
          "admin_session",
          JSON.stringify({ username: usernameInput, password: passwordInput })
        );
      } else {
        setLoginError("Invalid username or password.");
      }
    } catch (err) {
      console.error(err);
      setLoginError("An error occurred during login. Please try again.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_session");
    setIsLoggedIn(false);
    setAdminUsername("");
    setAdminPassword("");
  };

  // Add Choice
  const handleAddChoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChoiceName.trim()) return;
    setActionError("");
    setActionSuccess("");

    try {
      // Use auto-generated document ID to prevent slash/special character path errors
      const choiceRef = doc(collection(db, "choices"));
      await setDoc(choiceRef, {
        name: newChoiceName.trim(),
        createdByAdmin: adminUsername,
      });
      await setDoc(doc(collection(db, "logs")), {
        actor: adminUsername,
        action: "Add Choice",
        details: `Added choice "${newChoiceName.trim()}"`,
        timestamp: new Date().toISOString(),
      });
      setNewChoiceName("");
      setActionSuccess(`Choice "${newChoiceName}" added successfully.`);
    } catch (err) {
      console.error("Error adding choice:", err);
      setActionError("Failed to add choice.");
    }
  };

  // Delete Choice
  const handleDeleteChoice = async (choiceId: string) => {
    const choice = choices.find((c) => c.id === choiceId);
    const choiceName = choice ? choice.name : "this choice";
    
    const confirmDelete = window.confirm(
      `Warning: Are you absolutely sure you want to permanently delete "${choiceName}"? This action is permanent and cannot be undone.`
    );
    if (!confirmDelete) return;

    setActionError("");
    setActionSuccess("");
    try {
      await deleteDoc(doc(db, "choices", choiceId));
      await setDoc(doc(collection(db, "logs")), {
        actor: adminUsername,
        action: "Delete Choice",
        details: `Deleted choice "${choiceName}"`,
        timestamp: new Date().toISOString(),
      });
      setActionSuccess("Choice removed successfully.");
    } catch (err) {
      console.error("Error deleting choice:", err);
      setActionError("Failed to remove choice.");
    }
  };

  // Accept Request
  const handleAcceptRequest = async (studentId: string) => {
    setActionError("");
    setActionSuccess("");
    const student = studentRequests.find((s) => s.id === studentId);
    const studentName = student ? student.name : "Student";

    try {
      const studentRef = doc(db, "users", studentId);
      await updateDoc(studentRef, {
        status: "approved",
        assignedAdminId: adminUsername,
        requestedAdminId: "", // Clear request once approved
      });
      await setDoc(doc(collection(db, "logs")), {
        actor: adminUsername,
        action: "Approve Student",
        details: `Approved request for student "${studentName}"`,
        timestamp: new Date().toISOString(),
      });
      setActionSuccess("Student request approved.");
    } catch (err) {
      console.error("Error accepting request:", err);
      setActionError("Failed to approve student request.");
    }
  };

  // Reject Request
  const handleRejectRequest = async (studentId: string) => {
    setActionError("");
    setActionSuccess("");
    const student = studentRequests.find((s) => s.id === studentId);
    const studentName = student ? student.name : "Student";
    const currentRejected = student?.rejectedByAdmins || [];

    try {
      const studentRef = doc(db, "users", studentId);
      const updatedRejected = [...new Set([...currentRejected, adminUsername])];
      await updateDoc(studentRef, {
        status: "verified",
        requestedAdminId: "",
        rejectedByAdmins: updatedRejected,
      });
      await setDoc(doc(collection(db, "logs")), {
        actor: adminUsername,
        action: "Reject Student",
        details: `Rejected student "${studentName}" from Admin node`,
        timestamp: new Date().toISOString(),
      });
      setActionSuccess("Student request rejected.");
    } catch (err) {
      console.error("Error rejecting request:", err);
      setActionError("Failed to reject student request.");
    }
  };

  // Grouping stats
  const getDomainStats = () => {
    const stats: { [key: string]: number } = {};
    choices.forEach((c) => {
      stats[c.name] = 0;
    });
    studentRequests.forEach((student) => {
      student.choices.forEach((choice) => {
        if (stats[choice] !== undefined) {
          stats[choice]++;
        } else {
          stats[choice] = 1;
        }
      });
    });
    return stats;
  };

  const domainStats = getDomainStats();

  const filteredRequests = selectedFilterDomain === "all"
    ? studentRequests
    : studentRequests.filter((s) => s.choices.includes(selectedFilterDomain));

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
        <p>Loading Admin Portal...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className={styles.authWrapper}>
        <Navbar />
        <div className={styles.authContainer}>
          <form onSubmit={handleLogin} className={styles.authCard}>
            <h2 className={styles.title}>Admin Login</h2>
            {loginError && <div className={styles.errorMessage}>{loginError}</div>}
            <div className={styles.formGroup}>
              <label className={styles.label}>Admin Username</label>
              <input
                type="text"
                required
                className={styles.input}
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="e.g. admin1"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Password</label>
              <input
                type="password"
                required
                className={styles.input}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className={styles.submitBtn}>
              Log In
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.appContainer}>
      <Navbar userEmail={adminUsername} role="admin" onLogout={handleLogout} />
      <div className={styles.mainLayout}>
        {/* Left Side Panel */}
        <aside className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>Admin Panel</h3>
          <div className={styles.sidebarNav}>
            <button
              onClick={() => setActiveTab("requests")}
              className={`${styles.sidebarLink} ${activeTab === "requests" ? styles.active : ""}`}
            >
              Student Requests ({studentRequests.length})
            </button>
            <button
              onClick={() => setActiveTab("choices")}
              className={`${styles.sidebarLink} ${activeTab === "choices" ? styles.active : ""}`}
            >
              Manage Choices ({choices.length})
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`${styles.sidebarLink} ${activeTab === "profile" ? styles.active : ""}`}
            >
              My Account Details
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className={styles.mainContent}>
          {actionSuccess && <div className={styles.successMessage}>{actionSuccess}</div>}
          {actionError && <div className={styles.errorMessage}>{actionError}</div>}

          {activeTab === "requests" && (
            <div className={styles.contentCard}>
              <h3 className={styles.cardTitle}>Student Admission Requests</h3>
              
              {/* Domain Stats filter pills */}
              <div className={styles.filterSection}>
                <span className={styles.filterTitle}>Filter by Domain Selection:</span>
                <div className={styles.filterGrid}>
                  <div
                    onClick={() => setSelectedFilterDomain("all")}
                    className={`${styles.filterPill} ${selectedFilterDomain === "all" ? styles.filterPillActive : ""}`}
                  >
                    <span>All Domains</span>
                    <span className={styles.filterPillCount}>{studentRequests.length}</span>
                  </div>
                  {Object.entries(domainStats).map(([domain, count]) => (
                    <div
                      key={domain}
                      onClick={() => setSelectedFilterDomain(domain)}
                      className={`${styles.filterPill} ${selectedFilterDomain === domain ? styles.filterPillActive : ""}`}
                    >
                      <span>{domain}</span>
                      <span className={styles.filterPillCount}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {filteredRequests.length === 0 ? (
                <p className={styles.emptyText}>No pending requests found for the selected category.</p>
              ) : (
                <div className={styles.tableContainer}>
                  <table className={styles.customTable}>
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Branch / Section</th>
                        <th>College Email / Phone</th>
                        <th>Selected Choices</th>
                        <th>Profiles</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map((student) => (
                        <tr key={student.id}>
                          <td>
                            <strong>{student.name}</strong>
                            {student.remarks && (
                              <div style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "var(--primary)", maxWidth: "220px", lineHeight: "1.2" }}>
                                <strong>Superadmin Remarks:</strong> {student.remarks}
                              </div>
                            )}
                          </td>
                          <td>
                            {student.branch} (Sec {student.section})
                          </td>
                          <td>
                            <div>{student.collegeEmail}</div>
                            <div className={styles.mutedText}>{student.phone}</div>
                          </td>
                          <td>
                            <div className={styles.choicesBadgeGroup}>
                              {student.choices.map((c, i) => (
                                <span key={c} className={styles.choiceMiniBadge}>
                                  {i + 1}. {c}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <div className={styles.linksCol}>
                              {student.github && (
                                <a href={student.github} target="_blank" rel="noopener noreferrer" className={styles.link}>
                                  GitHub
                                </a>
                              )}
                              {student.leetcode && (
                                <a href={student.leetcode} target="_blank" rel="noopener noreferrer" className={styles.link}>
                                  LeetCode
                                </a>
                              )}
                              {student.linkedin && (
                                <a href={student.linkedin} target="_blank" rel="noopener noreferrer" className={styles.link}>
                                  LinkedIn
                                </a>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className={styles.actionBtns}>
                              <button
                                onClick={() => handleAcceptRequest(student.id)}
                                className={styles.btnAccept}
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleRejectRequest(student.id)}
                                className={styles.btnReject}
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {assignedStudents.length > 0 && (
                <div style={{ marginTop: "2rem" }}>
                  <h3 className={styles.cardTitle}>Assigned Students</h3>
                  <div className={styles.tableContainer}>
                    <table className={styles.customTable}>
                      <thead>
                        <tr>
                          <th>Student Name</th>
                          <th>Branch / Section</th>
                          <th>College Email</th>
                          <th>Area of Interest</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignedStudents.map((student) => (
                          <tr key={student.id}>
                            <td>
                              <strong>{student.name}</strong>
                            </td>
                            <td>
                              {student.branch} (Sec {student.section})
                            </td>
                            <td>{student.collegeEmail}</td>
                            <td>{student.areaOfInterest}</td>
                            <td>
                              <span className={styles.badgeSuccess}>Approved & Enrolled</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "choices" && (
            <div className={styles.contentCard}>
              <h3 className={styles.cardTitle}>Manage Selection Choices</h3>
              <p className={styles.subtitle}>Add or remove choices that users can select from (min 2, max 4 choices required for students).</p>
              
              <form onSubmit={handleAddChoice} className={styles.addForm}>
                <input
                  type="text"
                  required
                  placeholder="Enter Choice Name (e.g. Frontend Development)"
                  className={styles.input}
                  value={newChoiceName}
                  onChange={(e) => setNewChoiceName(e.target.value)}
                />
                <button type="submit" className={styles.btnAdd}>
                  + Add Choice Option
                </button>
              </form>

              <div className={styles.choicesListGrid}>
                {choices.map((choice) => (
                  <div key={choice.id} className={styles.choiceItemCard}>
                    <div>
                      <div className={styles.choiceNameText}>{choice.name}</div>
                      <div className={styles.choiceCreatedBy}>Created by: {choice.createdByAdmin}</div>
                    </div>
                    <button
                      onClick={() => handleDeleteChoice(choice.id)}
                      className={styles.deleteBtn}
                      title="Remove Choice"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div className={styles.contentCard}>
              <h3 className={styles.cardTitle}>My Admin Profile</h3>
              <p className={styles.subtitle}>Your account details generated by the Superadmin.</p>
              
              <div className={styles.profileDetailsBox}>
                <div className={styles.profileField}>
                  <span className={styles.profileLabel}>Admin Username</span>
                  <span className={styles.profileValue}>{adminUsername}</span>
                </div>
                <div className={styles.profileField}>
                  <span className={styles.profileLabel}>Admin Password</span>
                  <span className={styles.profileValue}>{adminPassword}</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
