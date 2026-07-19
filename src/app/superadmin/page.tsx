"use client";

import React, { useState, useEffect } from "react";
import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import styles from "./superadmin.module.css";

interface Branch {
  id: string;
  name: string;
}

interface Admin {
  id: string;
  username: string;
  password?: string;
  name?: string;
}

interface Student {
  id: string;
  name: string;
  branch: string;
  section: string;
  collegeEmail: string;
  choices: string[];
  status: string;
  requestedAdminId?: string;
  assignedAdminId?: string;
  phone?: string;
}

export default function SuperadminPage() {
  const [passcode, setPasscode] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<"verification" | "assign" | "branches" | "admins">("verification");

  // Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);

  // Input States
  const [newBranchName, setNewBranchName] = useState("");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminName, setNewAdminName] = useState("");

  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  // Check superadmin session on mount
  useEffect(() => {
    const session = localStorage.getItem("superadmin_session");
    if (session === "authorized") {
      setIsAuthorized(true);
    }
    setLoading(false);
  }, []);

  // Monitor Database Collections when authorized
  useEffect(() => {
    if (!isAuthorized) return;

    // Branches
    const unsubBranches = onSnapshot(collection(db, "branches"), (snap) => {
      const list: Branch[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, name: doc.data().name || doc.id });
      });
      setBranches(list);
    });

    // Admins
    const unsubAdmins = onSnapshot(collection(db, "admins"), (snap) => {
      const list: Admin[] = [];
      snap.forEach((doc) => {
        list.push({
          id: doc.id,
          username: doc.data().username,
          password: doc.data().password,
          name: doc.data().name || doc.data().username,
        });
      });
      setAdmins(list);
    });

    // Students
    const unsubStudents = onSnapshot(collection(db, "users"), (snap) => {
      const list: Student[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          name: data.name || "",
          branch: data.branch || "",
          section: data.section || "",
          collegeEmail: data.collegeEmail || "",
          choices: data.choices || [],
          status: data.status || "draft",
          requestedAdminId: data.requestedAdminId || "",
          assignedAdminId: data.assignedAdminId || "",
          phone: data.phone || "",
        });
      });
      setStudents(list);
    });

    return () => {
      unsubBranches();
      unsubAdmins();
      unsubStudents();
    };
  }, [isAuthorized]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const targetPassword = process.env.NEXT_PUBLIC_SUPERADMIN_PASSWORD || "superadmin123";
    if (passcode === targetPassword) {
      setIsAuthorized(true);
      localStorage.setItem("superadmin_session", "authorized");
    } else {
      setLoginError("Invalid superadmin passcode.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("superadmin_session");
    setIsAuthorized(false);
    setPasscode("");
  };

  // Branch operations
  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    setActionError("");
    setActionSuccess("");

    try {
      const branchId = newBranchName.trim().toLowerCase().replace(/\s+/g, "-");
      const branchRef = doc(db, "branches", branchId);
      await setDoc(branchRef, { name: newBranchName.trim() });
      setNewBranchName("");
      setActionSuccess(`Branch "${newBranchName}" added successfully.`);
    } catch (err) {
      console.error(err);
      setActionError("Failed to add branch.");
    }
  };

  const handleDeleteBranch = async (branchId: string) => {
    setActionError("");
    setActionSuccess("");
    try {
      await deleteDoc(doc(db, "branches", branchId));
      setActionSuccess("Branch removed successfully.");
    } catch (err) {
      console.error(err);
      setActionError("Failed to delete branch.");
    }
  };

  // Admin operations
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUsername.trim() || !newAdminPassword.trim()) return;
    setActionError("");
    setActionSuccess("");

    try {
      const adminId = newAdminUsername.trim();
      const adminRef = doc(db, "admins", adminId);
      await setDoc(adminRef, {
        username: newAdminUsername.trim(),
        password: newAdminPassword.trim(),
        name: newAdminName.trim() || newAdminUsername.trim(),
      });
      setNewAdminUsername("");
      setNewAdminPassword("");
      setNewAdminName("");
      setActionSuccess(`Admin account "${adminId}" created successfully.`);
    } catch (err) {
      console.error(err);
      setActionError("Failed to create admin.");
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    setActionError("");
    setActionSuccess("");
    try {
      await deleteDoc(doc(db, "admins", adminId));
      setActionSuccess("Admin account removed successfully.");
    } catch (err) {
      console.error(err);
      setActionError("Failed to delete admin.");
    }
  };

  // Student operations
  const handleVerifyStudent = async (studentId: string) => {
    setActionError("");
    setActionSuccess("");
    try {
      const studentRef = doc(db, "users", studentId);
      await updateDoc(studentRef, {
        status: "verified",
      });
      setActionSuccess("Student profile verified successfully. The student can now choose an admin.");
    } catch (err) {
      console.error(err);
      setActionError("Failed to verify student profile.");
    }
  };

  const handleManualAssign = async (studentId: string, adminId: string) => {
    setActionError("");
    setActionSuccess("");
    try {
      const studentRef = doc(db, "users", studentId);
      if (!adminId) {
        // Unassign student
        await updateDoc(studentRef, {
          status: "verified",
          assignedAdminId: "",
          requestedAdminId: "",
        });
        setActionSuccess("Student unassigned successfully.");
      } else {
        await updateDoc(studentRef, {
          status: "approved",
          assignedAdminId: adminId,
          requestedAdminId: "",
        });
        setActionSuccess(`Student assigned to Admin "${adminId}".`);
      }
    } catch (err) {
      console.error(err);
      setActionError("Failed to update student assignment.");
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
        <p>Loading Superadmin Portal...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className={styles.authWrapper}>
        <Navbar />
        <div className={styles.authContainer}>
          <form onSubmit={handleLogin} className={styles.authCard}>
            <h2 className={styles.title}>Superadmin Access</h2>
            {loginError && <div className={styles.errorMessage}>{loginError}</div>}
            <div className={styles.formGroup}>
              <label className={styles.label}>Enter Passcode</label>
              <input
                type="password"
                required
                className={styles.input}
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Superadmin secret password"
              />
            </div>
            <button type="submit" className={styles.submitBtn}>
              Authorize Session
            </button>
          </form>
        </div>
      </div>
    );
  }

  const pendingVerificationStudents = students.filter((s) => s.status === "pending_verification");

  return (
    <div className={styles.appContainer}>
      <Navbar role="superadmin" onLogout={handleLogout} />
      <div className={styles.mainLayout}>
        {/* Left Side Panel */}
        <aside className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>Superadmin Control</h3>
          <div className={styles.sidebarNav}>
            <button
              onClick={() => setActiveTab("verification")}
              className={`${styles.sidebarLink} ${activeTab === "verification" ? styles.active : ""}`}
            >
              Student Verification ({pendingVerificationStudents.length})
            </button>
            <button
              onClick={() => setActiveTab("assign")}
              className={`${styles.sidebarLink} ${activeTab === "assign" ? styles.active : ""}`}
            >
              Student & Admin Mapping ({students.length})
            </button>
            <button
              onClick={() => setActiveTab("branches")}
              className={`${styles.sidebarLink} ${activeTab === "branches" ? styles.active : ""}`}
            >
              Manage Branches ({branches.length})
            </button>
            <button
              onClick={() => setActiveTab("admins")}
              className={`${styles.sidebarLink} ${activeTab === "admins" ? styles.active : ""}`}
            >
              Manage Admins ({admins.length})
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className={styles.mainContent}>
          {actionSuccess && <div className={styles.successMessage}>{actionSuccess}</div>}
          {actionError && <div className={styles.errorMessage}>{actionError}</div>}

          {activeTab === "verification" && (
            <div className={styles.contentCard}>
              <h3 className={styles.cardTitle}>Verify Completed Profiles</h3>
              <p className={styles.subtitle}>Approve completed details and choices. Verified students can request an Admin.</p>
              
              {pendingVerificationStudents.length === 0 ? (
                <p className={styles.emptyText}>No students are currently pending profile verification.</p>
              ) : (
                <div className={styles.tableContainer}>
                  <table className={styles.customTable}>
                    <thead>
                      <tr>
                        <th>Student Details</th>
                        <th>Branch & Section</th>
                        <th>Choices Made</th>
                        <th>Verification Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingVerificationStudents.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <strong>{s.name}</strong>
                            <div className={styles.mutedText}>{s.collegeEmail}</div>
                            <div className={styles.mutedText}>{s.phone}</div>
                          </td>
                          <td>
                            {s.branch} (Sec {s.section})
                          </td>
                          <td>
                            <div className={styles.choicesMiniList}>
                              {s.choices.map((c, i) => (
                                <span key={c} className={styles.miniChoiceBadge}>
                                  {i + 1}. {c}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <span className={styles.badgePending}>Pending Verification</span>
                          </td>
                          <td>
                            <button
                              onClick={() => handleVerifyStudent(s.id)}
                              className={styles.btnAction}
                            >
                              Verify Profile
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "assign" && (
            <div className={styles.contentCard}>
              <h3 className={styles.cardTitle}>Student to Admin Assignments</h3>
              <p className={styles.subtitle}>Directly override or map student assignments to Admin nodes.</p>

              {students.length === 0 ? (
                <p className={styles.emptyText}>No student records found in database.</p>
              ) : (
                <div className={styles.tableContainer}>
                  <table className={styles.customTable}>
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Branch</th>
                        <th>Current Status</th>
                        <th>Admin Requested</th>
                        <th>Assigned Admin</th>
                        <th>Assign Admin Override</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <strong>{s.name || "incomplete user"}</strong>
                            <div className={styles.mutedText}>{s.collegeEmail}</div>
                          </td>
                          <td>{s.branch || "N/A"}</td>
                          <td>
                            <span className={
                              s.status === "approved" ? styles.badgeSuccess :
                              s.status === "verified" ? styles.badgeVerified :
                              s.status === "pending_admin_approval" ? styles.badgePending :
                              styles.badgeDraft
                            }>
                              {s.status}
                            </span>
                          </td>
                          <td>{s.requestedAdminId || "None"}</td>
                          <td>{s.assignedAdminId ? <strong>{s.assignedAdminId}</strong> : "Unassigned"}</td>
                          <td>
                            <select
                              value={s.assignedAdminId || ""}
                              onChange={(e) => handleManualAssign(s.id, e.target.value)}
                              className={styles.selectSmall}
                            >
                              <option value="">Unassigned</option>
                              {admins.map((adm) => (
                                <option key={adm.id} value={adm.username}>
                                  {adm.name} ({adm.username})
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "branches" && (
            <div className={styles.contentCard}>
              <h3 className={styles.cardTitle}>Add or Remove Branches</h3>
              <p className={styles.subtitle}>Students can select from these branches when filling their profile details.</p>

              <form onSubmit={handleAddBranch} className={styles.addForm}>
                <input
                  type="text"
                  required
                  placeholder="Branch Name (e.g. Computer Science Engineering)"
                  className={styles.input}
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                />
                <button type="submit" className={styles.btnAdd}>
                  + Add Branch
                </button>
              </form>

              <div className={styles.gridList}>
                {branches.length === 0 ? (
                  <p className={styles.emptyText}>No branch options configured.</p>
                ) : (
                  branches.map((b) => (
                    <div key={b.id} className={styles.itemCard}>
                      <span>{b.name}</span>
                      <button
                        onClick={() => handleDeleteBranch(b.id)}
                        className={styles.btnDelete}
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "admins" && (
            <div className={styles.contentCard}>
              <h3 className={styles.cardTitle}>Manage Admin Access Accounts</h3>
              <p className={styles.subtitle}>Create custom usernames and passwords for admins. Admins use these credentials to log in.</p>

              <form onSubmit={handleCreateAdmin} className={styles.adminFormGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Display Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Admin Node 1"
                    className={styles.input}
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Admin Username</label>
                  <input
                    type="text"
                    required
                    placeholder="admin1"
                    className={styles.input}
                    value={newAdminUsername}
                    onChange={(e) => setNewAdminUsername(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Admin Password</label>
                  <input
                    type="text"
                    required
                    placeholder="secure_pass_1"
                    className={styles.input}
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                  />
                </div>
                <button type="submit" className={styles.btnCreateAdmin}>
                  + Create Admin Account
                </button>
              </form>

              <div className={styles.tableContainer} style={{ marginTop: "1rem" }}>
                <table className={styles.customTable}>
                  <thead>
                    <tr>
                      <th>Display Name</th>
                      <th>Admin Username</th>
                      <th>Admin Password</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((adm) => (
                      <tr key={adm.id}>
                        <td>{adm.name}</td>
                        <td>
                          <strong>{adm.username}</strong>
                        </td>
                        <td>
                          <code>{adm.password}</code>
                        </td>
                        <td>
                          <button
                            onClick={() => handleDeleteAdmin(adm.id)}
                            className={styles.btnDelete}
                          >
                            Remove Admin
                          </button>
                        </td>
                      </tr>
                    ))}
                    {admins.length === 0 && (
                      <tr>
                        <td colSpan={4} className={styles.emptyText}>
                          No admin accounts created yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
