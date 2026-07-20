"use client";

import React, { useState, useEffect } from "react";
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, updateDoc, query, where, onSnapshot, addDoc } from "firebase/firestore";
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
  approvedDomain?: string;
  aiRecommendedDomain?: string;
}

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(true);

  // Registration States
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState("");
  const [regBranch, setRegBranch] = useState("");
  const [regSection, setRegSection] = useState("");
  const [regCategory, setRegCategory] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regSuccess, setRegSuccess] = useState("");
  const [regError, setRegError] = useState("");

  // Active Tab
  const [activeTab, setActiveTab] = useState<"profile" | "choices" | "requests" | "assigned">("requests");

  // Dashboard Data
  const [choices, setChoices] = useState<Choice[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [adminsList, setAdminsList] = useState<any[]>([]);
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

  // Monitor Choices from Firestore (independent of login for registration page)
  useEffect(() => {
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
  }, []);

  // Monitor Branches from Firestore (independent of login for registration page)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "branches"), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, name: doc.data().name || doc.id });
      });
      setBranches(list);
    });
    return () => unsubscribe();
  }, []);

  // Monitor Admins from Firestore (independent of login for registration page)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "admins"), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          username: data.username,
          mentorCategory: data.mentorCategory || "",
        });
      });
      setAdminsList(list);
    });
    return () => unsubscribe();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegSuccess("");

    if (
      !regName.trim() ||
      !regBranch.trim() ||
      !regSection.trim() ||
      !regCategory ||
      !regUsername.trim() ||
      !regPassword.trim()
    ) {
      setRegError("Please fill in all registration fields.");
      return;
    }

    try {
      const targetUsername = regUsername.trim().toLowerCase();
      // 1. Check if the username already exists in admins
      const adminDoc = await getDoc(doc(db, "admins", targetUsername));
      if (adminDoc.exists()) {
        setRegError("Username is already taken by an active admin.");
        return;
      }

      // 2. Check if the username is already requested in pending requests
      const q = query(collection(db, "adminRequests"), where("username", "==", targetUsername), where("status", "==", "pending"));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        setRegError("Username is already requested and pending review.");
        return;
      }

      // 3. Check if this category already has an active mentor
      const activeMentorQuery = query(collection(db, "admins"), where("mentorCategory", "==", regCategory));
      const activeMentorSnap = await getDocs(activeMentorQuery);
      if (!activeMentorSnap.empty) {
        setRegError(`A mentor is already active for the category "${regCategory}".`);
        return;
      }

      // 4. Check if this category is already requested by another pending mentor
      const pendingCategoryQuery = query(collection(db, "adminRequests"), where("mentorCategory", "==", regCategory), where("status", "==", "pending"));
      const pendingCategorySnap = await getDocs(pendingCategoryQuery);
      if (!pendingCategorySnap.empty) {
        setRegError(`A registration request for "${regCategory}" is already pending review.`);
        return;
      }

      // 2. Add to adminRequests
      await addDoc(collection(db, "adminRequests"), {
        name: regName.trim(),
        branch: regBranch.trim(),
        section: regSection.trim(),
        mentorCategory: regCategory,
        username: targetUsername,
        password: regPassword.trim(),
        status: "pending",
        timestamp: new Date().toISOString(),
      });

      setRegSuccess("Your registration request was submitted successfully! Superadmin will verify and create your credentials.");
      setRegName("");
      setRegBranch("");
      setRegSection("");
      setRegCategory("");
      setRegUsername("");
      setRegPassword("");
    } catch (err) {
      console.error("Registration request error:", err);
      setRegError("Failed to submit registration request.");
    }
  };

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
          approvedDomain: data.approvedDomain || "",
          aiRecommendedDomain: data.aiRecommendedDomain || "",
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
        const adminData = docSnap.data();
        setAdminUsername(usernameInput);
        setAdminPassword(passwordInput);
        setIsLoggedIn(true);
        localStorage.setItem(
          "admin_session",
          JSON.stringify({ username: usernameInput, password: passwordInput })
        );
      } else {
        setLoginError("Invalid admin credentials.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setLoginError("Failed to authenticate.");
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
  const handleAcceptRequest = async (studentId: string, domain: string) => {
    setActionError("");
    setActionSuccess("");
    const student = studentRequests.find((s) => s.id === studentId);
    const studentName = student ? student.name : "Student";

    try {
      const studentRef = doc(db, "users", studentId);
      await updateDoc(studentRef, {
        status: "approved",
        assignedAdminId: adminUsername,
        approvedDomain: domain,
        requestedAdminId: "", // Clear request once approved
      });
      await setDoc(doc(collection(db, "logs")), {
        actor: adminUsername,
        action: "Approve Student",
        details: `Approved request for student "${studentName}" for domain "${domain}"`,
        timestamp: new Date().toISOString(),
      });
      setActionSuccess(`Student request approved for "${domain}".`);
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

  const filteredRequests = studentRequests.filter((req) => {
    if (selectedFilterDomain === "all") return true;
    return req.choices.includes(selectedFilterDomain);
  });

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
        <p>Loading Admin Dashboard...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className={styles.authWrapper}>
        <Navbar />
        <div className={styles.authContainer}>
          {isRegistering ? (
            <form onSubmit={handleRegister} className={`${styles.authCard} ${styles.authCardWide}`}>
              <h2 className={styles.title} style={{ gridColumn: "span 2" }}>Request Mentor Access</h2>
              <p className={styles.subtitle} style={{ marginBottom: "0.5rem", gridColumn: "span 2", textAlign: "center" }}>Submit details to be verified by Superadmin.</p>
              {regError && <div className={styles.errorMessage} style={{ gridColumn: "span 2" }}>{regError}</div>}
              {regSuccess && <div className={styles.successMessage} style={{ gridColumn: "span 2", color: "#10b981", fontSize: "0.85rem", marginBottom: "0.5rem", backgroundColor: "#ecfdf5", padding: "0.5rem", borderRadius: "var(--radius)", border: "1px solid #a7f3d0" }}>{regSuccess}</div>}
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Display Name / Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Admin"
                  className={styles.input}
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Category to Mentor</label>
                <select
                  required
                  className={styles.input}
                  value={regCategory}
                  onChange={(e) => setRegCategory(e.target.value)}
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "var(--radius)", border: "1px solid var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
                >
                  <option value="">Select Category...</option>
                  {choices.map((c) => {
                    const isTaken = adminsList.some((adm) => adm.mentorCategory === c.name);
                    return (
                      <option key={c.id} value={c.name} disabled={isTaken}>
                        {c.name} {isTaken ? " (Already Mentored)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Branch</label>
                <select
                  required
                  className={styles.input}
                  value={regBranch}
                  onChange={(e) => setRegBranch(e.target.value)}
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "var(--radius)", border: "1px solid var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
                >
                  <option value="">Select Branch...</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Section</label>
                <select
                  required
                  className={styles.input}
                  value={regSection}
                  onChange={(e) => setRegSection(e.target.value)}
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "var(--radius)", border: "1px solid var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
                >
                  <option value="">Select Section...</option>
                  {["A", "B", "C", "D", "E", "F", "G"].map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Requested Username</label>
                <input
                  type="text"
                  required
                  placeholder="Enter login username"
                  className={styles.input}
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Requested Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter login password"
                  className={styles.input}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                />
              </div>

              <button type="submit" className={styles.submitBtn} style={{ gridColumn: "span 2", marginTop: "0.5rem" }}>
                Submit Request
              </button>

              <button
                type="button"
                className={styles.btnReject}
                style={{ gridColumn: "span 2", marginTop: "0.5rem", width: "100%" }}
                onClick={() => {
                  setIsRegistering(false);
                  setRegError("");
                  setRegSuccess("");
                }}
              >
                Back to Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className={styles.authCard}>
              <h2 className={styles.title}>Admin Access</h2>
              {loginError && <div className={styles.errorMessage}>{loginError}</div>}
              <div className={styles.formGroup}>
                <label className={styles.label}>Admin Username</label>
                <input
                  type="text"
                  required
                  className={styles.input}
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Enter admin username"
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
                  placeholder="Enter password"
                />
              </div>
              <button type="submit" className={styles.submitBtn}>
                Log In
              </button>

              <button
                type="button"
                className={styles.btnAccept}
                style={{ marginTop: "0.5rem", width: "100%", backgroundColor: "var(--secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}
                onClick={() => {
                  setIsRegistering(true);
                  setLoginError("");
                }}
              >
                Register as Admin / Request Mentor Access
              </button>
            </form>
          )}
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
              Student Pool ({studentRequests.length})
            </button>
            <button
              onClick={() => setActiveTab("assigned")}
              className={`${styles.sidebarLink} ${activeTab === "assigned" ? styles.active : ""}`}
            >
              Assigned Students ({assignedStudents.length})
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
                        <React.Fragment key={student.id}>
                          <tr>
                            <td>
                              <strong>{student.name}</strong>
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
                                {student.aiRecommendedDomain && (
                                  <div style={{ fontSize: "0.7rem", color: "var(--primary)", fontWeight: 600, paddingBottom: "0.15rem" }} title="AI recommended domain">
                                    💡 Rec: {student.aiRecommendedDomain}
                                  </div>
                                )}
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleAcceptRequest(student.id, e.target.value);
                                    }
                                  }}
                                  defaultValue=""
                                  className={styles.selectSmall}
                                  style={{ padding: "0.35rem", borderRadius: "var(--radius)", border: "1px solid var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
                                >
                                  <option value="" disabled>Accept for Domain...</option>
                                  {choices.map((c) => {
                                    const isChosen = student.choices.includes(c.name);
                                    return (
                                      <option key={c.id} value={c.name}>
                                        {c.name} {isChosen ? "★ (Chosen)" : ""}
                                      </option>
                                    );
                                  })}
                                </select>
                                <button
                                  onClick={() => handleRejectRequest(student.id)}
                                  className={styles.btnReject}
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                          {student.remarks && (
                            <tr>
                              <td colSpan={6} style={{ padding: "0.6rem 1rem", backgroundColor: "rgba(var(--primary-rgb), 0.05)", borderTop: "none" }}>
                                <div style={{ fontSize: "0.75rem", color: "var(--primary)", lineHeight: "1.4" }}>
                                  <strong>Superadmin Remarks:</strong> {student.remarks}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}

          {activeTab === "assigned" && (
            <div className={styles.contentCard}>
              <h3 className={styles.cardTitle}>My Assigned Students</h3>
              <p className={styles.subtitle}>List of students approved and enrolled under your admin node.</p>

              {assignedStudents.length === 0 ? (
                <p className={styles.emptyText}>You haven't accepted any students yet.</p>
              ) : (
                <div className={styles.tableContainer}>
                  <table className={styles.customTable}>
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Branch / Section</th>
                        <th>College Email</th>
                        <th>Area of Interest</th>
                        <th>Approved Domain</th>
                        <th>Selected Choices</th>
                        <th>Profiles</th>
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
                            <strong style={{ color: "var(--primary)" }}>{student.approvedDomain || "N/A"}</strong>
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
                            <span className={styles.badgeSuccess}>Approved & Enrolled</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
