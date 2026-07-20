"use client";

import React, { useState, useEffect } from "react";
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, updateDoc, onSnapshot } from "firebase/firestore";
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
  branch?: string;
  section?: string;
  mentorCategory?: string;
}

interface AdminRequest {
  id: string;
  name: string;
  branch: string;
  section: string;
  mentorCategory: string;
  username: string;
  password: string;
  status: string;
  timestamp: string;
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
  github?: string;
  leetcode?: string;
  linkedin?: string;
  areaOfInterest?: string;
  remarks?: string;
  approvedDomain?: string;
  aiRecommendedDomain?: string;
}

interface ActivityLog {
  id: string;
  actor: string;
  action: string;
  details: string;
  timestamp: string;
}

export default function SuperadminPage() {
  const [passcode, setPasscode] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<"verification" | "assign" | "branches" | "admins" | "logs">("verification");

  // Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [adminRequests, setAdminRequests] = useState<AdminRequest[]>([]);
  const [choices, setChoices] = useState<any[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [remarksMap, setRemarksMap] = useState<{ [studentId: string]: string }>({});
  const [analyzingMap, setAnalyzingMap] = useState<{ [studentId: string]: boolean }>({});
  const [tempAdminMap, setTempAdminMap] = useState<{[studentId: string]: string}>({});
  const [tempDomainMap, setTempDomainMap] = useState<{[studentId: string]: string}>({});

  // Input States
  const [newBranchName, setNewBranchName] = useState("");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminBranch, setNewAdminBranch] = useState("");
  const [newAdminSection, setNewAdminSection] = useState("");
  const [newAdminCategory, setNewAdminCategory] = useState("");

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
          branch: doc.data().branch || "",
          section: doc.data().section || "",
          mentorCategory: doc.data().mentorCategory || "",
        });
      });
      setAdmins(list);
    });

    // Choices
    const unsubChoices = onSnapshot(collection(db, "choices"), (snap) => {
      const list: any[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, name: doc.data().name || doc.id });
      });
      setChoices(list);
    });

    // Admin Requests
    const unsubAdminRequests = onSnapshot(collection(db, "adminRequests"), (snap) => {
      const list: AdminRequest[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        if (data.status === "pending") {
          list.push({
            id: doc.id,
            name: data.name || "",
            branch: data.branch || "",
            section: data.section || "",
            mentorCategory: data.mentorCategory || "",
            username: data.username || "",
            password: data.password || "",
            status: data.status || "pending",
            timestamp: data.timestamp || "",
          });
        }
      });
      setAdminRequests(list);
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
          github: data.github || "",
          leetcode: data.leetcode || "",
          linkedin: data.linkedin || "",
          areaOfInterest: data.areaOfInterest || "",
          remarks: data.remarks || "",
          approvedDomain: data.approvedDomain || "",
          aiRecommendedDomain: data.aiRecommendedDomain || "",
        });
      });
      setStudents(list);
    });

    // Logs
    const unsubLogs = onSnapshot(collection(db, "logs"), (snap) => {
      const list: ActivityLog[] = [];
      snap.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          actor: data.actor || "",
          action: data.action || "",
          details: data.details || "",
          timestamp: data.timestamp || "",
        });
      });
      // Sort by newest log first
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(list);
    });

    return () => {
      unsubBranches();
      unsubAdmins();
      unsubChoices();
      unsubAdminRequests();
      unsubStudents();
      unsubLogs();
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
      // Use auto-generated document ID to prevent path separator errors
      const branchRef = doc(collection(db, "branches"));
      await setDoc(branchRef, { name: newBranchName.trim() });
      await setDoc(doc(collection(db, "logs")), {
        actor: "superadmin",
        action: "Add Branch",
        details: `Added branch "${newBranchName.trim()}"`,
        timestamp: new Date().toISOString(),
      });
      setNewBranchName("");
      setActionSuccess(`Branch "${newBranchName}" added successfully.`);
    } catch (err) {
      console.error(err);
      setActionError("Failed to add branch.");
    }
  };

  const handleDeleteBranch = async (branchId: string) => {
    const branch = branches.find((b) => b.id === branchId);
    const branchName = branch ? branch.name : "this branch";

    const confirmDelete = window.confirm(
      `Warning: Are you absolutely sure you want to permanently delete the branch "${branchName}"? This action is permanent and students will no longer be able to select it.`
    );
    if (!confirmDelete) return;

    setActionError("");
    setActionSuccess("");
    try {
      await deleteDoc(doc(db, "branches", branchId));
      await setDoc(doc(collection(db, "logs")), {
        actor: "superadmin",
        action: "Delete Branch",
        details: `Deleted branch "${branchName}"`,
        timestamp: new Date().toISOString(),
      });
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
        branch: newAdminBranch.trim(),
        section: newAdminSection.trim(),
        mentorCategory: newAdminCategory,
      });
      await setDoc(doc(collection(db, "logs")), {
        actor: "superadmin",
        action: "Create Admin",
        details: `Created admin account "${adminId}" for category "${newAdminCategory}"`,
        timestamp: new Date().toISOString(),
      });
      setNewAdminUsername("");
      setNewAdminPassword("");
      setNewAdminName("");
      setNewAdminBranch("");
      setNewAdminSection("");
      setNewAdminCategory("");
      setActionSuccess(`Admin account "${adminId}" created successfully.`);
    } catch (err) {
      console.error(err);
      setActionError("Failed to create admin.");
    }
  };

  const handleApproveAdminRequest = async (request: AdminRequest) => {
    setActionError("");
    setActionSuccess("");
    try {
      // 1. Confirm username is not taken in admins
      const activeAdminDoc = await getDoc(doc(db, "admins", request.username));
      if (activeAdminDoc.exists()) {
        setActionError(`Username "${request.username}" is already taken by an active admin.`);
        return;
      }

      // 2. Create active admin account
      const adminRef = doc(db, "admins", request.username);
      await setDoc(adminRef, {
        username: request.username,
        password: request.password,
        name: request.name,
        branch: request.branch,
        section: request.section,
        mentorCategory: request.mentorCategory,
      });

      // 3. Mark request as approved
      const requestRef = doc(db, "adminRequests", request.id);
      await updateDoc(requestRef, { status: "approved" });

      await setDoc(doc(collection(db, "logs")), {
        actor: "superadmin",
        action: "Approve Admin Request",
        details: `Approved Admin Request for "${request.username}" as mentor of "${request.mentorCategory}"`,
        timestamp: new Date().toISOString(),
      });
      setActionSuccess(`Admin request approved for "${request.username}".`);
    } catch (err) {
      console.error(err);
      setActionError("Failed to approve admin request.");
    }
  };

  const handleRejectAdminRequest = async (requestId: string, username: string) => {
    const confirmReject = window.confirm(`Are you sure you want to reject the admin request for "${username}"?`);
    if (!confirmReject) return;
    setActionError("");
    setActionSuccess("");
    try {
      const requestRef = doc(db, "adminRequests", requestId);
      await updateDoc(requestRef, { status: "rejected" });

      await setDoc(doc(collection(db, "logs")), {
        actor: "superadmin",
        action: "Reject Admin Request",
        details: `Rejected Admin Request for "${username}"`,
        timestamp: new Date().toISOString(),
      });
      setActionSuccess(`Admin request for "${username}" rejected.`);
    } catch (err) {
      console.error(err);
      setActionError("Failed to reject admin request.");
    }
  };

  const handleUpdateAdminCategory = async (adminId: string, category: string) => {
    setActionError("");
    setActionSuccess("");
    try {
      const adminRef = doc(db, "admins", adminId);
      await updateDoc(adminRef, { mentorCategory: category });

      await setDoc(doc(collection(db, "logs")), {
        actor: "superadmin",
        action: "Update Admin Category",
        details: `Updated Admin "${adminId}" mentored category to "${category}"`,
        timestamp: new Date().toISOString(),
      });
      setActionSuccess(`Updated category for Admin "${adminId}" to "${category}".`);
    } catch (err) {
      console.error(err);
      setActionError("Failed to update admin category.");
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    const confirmDelete = window.confirm(
      `Warning: Are you absolutely sure you want to permanently delete the admin account "${adminId}"? This will lock them out permanently.`
    );
    if (!confirmDelete) return;

    setActionError("");
    setActionSuccess("");
    try {
      await deleteDoc(doc(db, "admins", adminId));
      await setDoc(doc(collection(db, "logs")), {
        actor: "superadmin",
        action: "Delete Admin",
        details: `Deleted admin account "${adminId}"`,
        timestamp: new Date().toISOString(),
      });
      setActionSuccess("Admin account removed successfully.");
    } catch (err) {
      console.error(err);
      setActionError("Failed to delete admin.");
    }
  };

  // Student operations
  const handleVerifyStudent = async (studentId: string, isVerified: boolean) => {
    setActionError("");
    setActionSuccess("");
    const student = students.find((s) => s.id === studentId);
    const studentName = student ? student.name : "Student";
    const remarks = remarksMap[studentId] || "";

    try {
      const studentRef = doc(db, "users", studentId);
      await updateDoc(studentRef, {
        status: isVerified ? "verified" : "rejected",
        remarks: remarks.trim(),
      });
      await setDoc(doc(collection(db, "logs")), {
        actor: "superadmin",
        action: isVerified ? "Verify Student" : "Reject Student",
        details: `${isVerified ? "Verified" : "Rejected"} profile for student "${studentName}". Remarks: "${remarks.trim()}"`,
        timestamp: new Date().toISOString(),
      });
      setActionSuccess(`Student profile ${isVerified ? "verified" : "rejected"} successfully.`);
    } catch (err) {
      console.error(err);
      setActionError(`Failed to update student profile.`);
    }
  };

  const handleManualAssign = async (studentId: string, adminId: string, approvedDomain: string) => {
    setActionError("");
    setActionSuccess("");
    const student = students.find((s) => s.id === studentId);
    const studentName = student ? student.name : "Student";

    try {
      const studentRef = doc(db, "users", studentId);
      if (!adminId) {
        // Unassign student
        await updateDoc(studentRef, {
          status: "verified",
          assignedAdminId: "",
          requestedAdminId: "",
          approvedDomain: "",
        });
        await setDoc(doc(collection(db, "logs")), {
          actor: "superadmin",
          action: "Assign Student",
          details: `Unassigned student "${studentName}"`,
          timestamp: new Date().toISOString(),
        });
        setActionSuccess("Student unassigned successfully.");
      } else {
        if (!approvedDomain) {
          setActionError("Please select a domain choice to assign.");
          return;
        }
        await updateDoc(studentRef, {
          status: "approved",
          assignedAdminId: adminId,
          approvedDomain: approvedDomain,
          requestedAdminId: "",
        });
        await setDoc(doc(collection(db, "logs")), {
          actor: "superadmin",
          action: "Assign Student",
          details: `Assigned student "${studentName}" to Admin "${adminId}" for domain "${approvedDomain}"`,
          timestamp: new Date().toISOString(),
        });
        setActionSuccess(`Student assigned to Admin "${adminId}" for domain "${approvedDomain}".`);
      }
    } catch (err) {
      console.error(err);
      setActionError("Failed to update student assignment.");
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    const studentName = student ? student.name : "this student";

    const confirmDelete = window.confirm(
      `Warning: Are you absolutely sure you want to permanently delete the student "${studentName}" from the platform? This will erase all their details and cannot be undone.`
    );
    if (!confirmDelete) return;

    setActionError("");
    setActionSuccess("");
    try {
      await deleteDoc(doc(db, "users", studentId));
      await setDoc(doc(collection(db, "logs")), {
        actor: "superadmin",
        action: "Delete Student",
        details: `Deleted student profile for "${studentName}" (${studentId})`,
        timestamp: new Date().toISOString(),
      });
      setActionSuccess("Student profile deleted successfully.");
    } catch (err) {
      console.error(err);
      setActionError("Failed to delete student.");
    }
  };

  const handleAIAnalyze = async (student: Student) => {
    // Clear current textbox immediately to show active regeneration
    setRemarksMap((prev) => ({ ...prev, [student.id]: "" }));
    setAnalyzingMap((prev) => ({ ...prev, [student.id]: true }));
    setActionError("");
    setActionSuccess("");
    try {
      const res = await fetch("/api/analyze-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(student),
      });
      if (!res.ok) throw new Error("API call failed");
      const data = await res.json();
      if (data.summary) {
        setRemarksMap((prev) => ({ ...prev, [student.id]: data.summary }));
        
        // Save to Firestore so it replicates to pool/assigned lists instantly
        const studentRef = doc(db, "users", student.id);
        await updateDoc(studentRef, {
          remarks: data.summary,
          aiRecommendedDomain: data.recommendedDomain || "",
        });
        
        setActionSuccess(`AI evaluation loaded and saved for ${student.name}.`);
      } else if (data.error) {
        setActionError(data.error);
      }
    } catch (err) {
      console.error(err);
      setActionError("Failed to fetch AI analysis.");
    } finally {
      setAnalyzingMap((prev) => ({ ...prev, [student.id]: false }));
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
            <button
              onClick={() => setActiveTab("logs")}
              className={`${styles.sidebarLink} ${activeTab === "logs" ? styles.active : ""}`}
            >
              Activity Logs ({logs.length})
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
                        <th>Profiles & Interests</th>
                        <th>Superadmin Remarks</th>
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
                            <div className={styles.linksCol}>
                              {s.github && (
                                <a href={s.github} target="_blank" rel="noopener noreferrer" className={styles.link}>
                                  GitHub
                                </a>
                              )}
                              {s.leetcode && (
                                <a href={s.leetcode} target="_blank" rel="noopener noreferrer" className={styles.link}>
                                  LeetCode
                                </a>
                              )}
                              {s.linkedin && (
                                <a href={s.linkedin} target="_blank" rel="noopener noreferrer" className={styles.link}>
                                  LinkedIn
                                </a>
                              )}
                              {s.areaOfInterest && (
                                <div className={styles.mutedText} style={{ marginTop: "0.25rem" }}>
                                  Interest: <em>{s.areaOfInterest}</em>
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <textarea
                              className={styles.textareaSmall}
                              placeholder="Write notes/feedback about this student..."
                              value={remarksMap[s.id] || s.remarks || ""}
                              onChange={(e) => setRemarksMap({ ...remarksMap, [s.id]: e.target.value })}
                              rows={2}
                            />
                            <button
                              onClick={() => handleAIAnalyze(s)}
                              disabled={analyzingMap[s.id]}
                              className={styles.btnAI}
                              style={{ marginTop: "0.25rem", width: "100%", fontSize: "0.7rem", padding: "0.2rem" }}
                            >
                              {analyzingMap[s.id] ? "Analyzing..." : "✨ Analyze with Gemini"}
                            </button>
                          </td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                              <button
                                onClick={() => handleVerifyStudent(s.id, true)}
                                className={styles.btnAction}
                              >
                                Verify Profile
                              </button>
                              <button
                                onClick={() => handleVerifyStudent(s.id, false)}
                                className={styles.btnReject}
                              >
                                Reject Profile
                              </button>
                            </div>
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
                        <th>Action</th>
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
                          <td>
                            {s.assignedAdminId ? (
                              <div>
                                <strong>{s.assignedAdminId}</strong>
                                {s.approvedDomain && (
                                  <div className={styles.mutedText} style={{ fontSize: "0.75rem", marginTop: "0.15rem" }}>
                                    Domain: <em>{s.approvedDomain}</em>
                                  </div>
                                )}
                              </div>
                            ) : (
                              "Unassigned"
                            )}
                          </td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", minWidth: "150px" }}>
                              {s.aiRecommendedDomain && (
                                <div style={{ fontSize: "0.7rem", color: "var(--primary)", fontWeight: 600, paddingBottom: "0.1rem" }} title="AI recommended domain">
                                  💡 Rec: {s.aiRecommendedDomain}
                                </div>
                              )}
                              <select
                                value={tempAdminMap[s.id] !== undefined ? tempAdminMap[s.id] : s.assignedAdminId || ""}
                                onChange={(e) => {
                                  setTempAdminMap({ ...tempAdminMap, [s.id]: e.target.value });
                                  if (!e.target.value) {
                                    setTempDomainMap({ ...tempDomainMap, [s.id]: "" });
                                  }
                                }}
                                className={styles.selectSmall}
                              >
                                <option value="">Unassigned</option>
                                {admins.map((adm) => (
                                  <option key={adm.id} value={adm.username}>
                                    {adm.name} ({adm.username})
                                  </option>
                                ))}
                              </select>

                              {((tempAdminMap[s.id] !== "" && tempAdminMap[s.id] !== undefined) || (!tempAdminMap[s.id] && s.assignedAdminId)) && (
                                <select
                                  value={tempDomainMap[s.id] !== undefined ? tempDomainMap[s.id] : s.approvedDomain || ""}
                                  onChange={(e) => setTempDomainMap({ ...tempDomainMap, [s.id]: e.target.value })}
                                  className={styles.selectSmall}
                                >
                                  <option value="" disabled>Select Domain...</option>
                                  {s.choices.map((choice) => (
                                    <option key={choice} value={choice}>
                                      {choice}
                                    </option>
                                  ))}
                                </select>
                              )}

                              <button
                                onClick={() => {
                                  const selectedAdmin = tempAdminMap[s.id] !== undefined ? tempAdminMap[s.id] : s.assignedAdminId || "";
                                  const selectedDomain = tempDomainMap[s.id] !== undefined ? tempDomainMap[s.id] : s.approvedDomain || "";
                                  handleManualAssign(s.id, selectedAdmin, selectedDomain);
                                }}
                                className={styles.btnAction}
                                style={{ fontSize: "0.7rem", padding: "0.25rem", width: "100%" }}
                              >
                                Save Assignment
                              </button>
                            </div>
                          </td>
                          <td>
                            <button
                              onClick={() => handleDeleteStudent(s.id)}
                              className={styles.btnDelete}
                              title="Delete student from platform"
                            >
                              Delete User
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
              {adminRequests.length > 0 && (
                <div style={{ marginBottom: "2rem" }}>
                  <h4 style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.95rem", marginBottom: "0.5rem" }}>
                    Pending Mentor Access Requests ({adminRequests.length})
                  </h4>
                  <div className={styles.tableContainer}>
                    <table className={styles.customTable}>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Branch / Section</th>
                          <th>Mentor Category Choice</th>
                          <th>Username</th>
                          <th>Password</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminRequests.map((req) => (
                          <tr key={req.id}>
                            <td>{req.name}</td>
                            <td>{req.branch} (Sec {req.section})</td>
                            <td>
                              <strong style={{ color: "var(--primary)" }}>{req.mentorCategory}</strong>
                            </td>
                            <td><code>{req.username}</code></td>
                            <td><code>{req.password}</code></td>
                            <td>
                              <div style={{ display: "flex", gap: "0.25rem" }}>
                                <button
                                  onClick={() => handleApproveAdminRequest(req)}
                                  className={styles.btnAction}
                                  style={{ padding: "0.25rem 0.5rem", fontSize: "0.7rem" }}
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectAdminRequest(req.id, req.username)}
                                  className={styles.btnReject}
                                  style={{ padding: "0.25rem 0.5rem", fontSize: "0.7rem" }}
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
                </div>
              )}

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
                <div className={styles.formGroup}>
                  <label className={styles.label}>Branch</label>
                  <input
                    type="text"
                    placeholder="e.g. CSE"
                    className={styles.input}
                    value={newAdminBranch}
                    onChange={(e) => setNewAdminBranch(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Section</label>
                  <input
                    type="text"
                    placeholder="e.g. A"
                    className={styles.input}
                    value={newAdminSection}
                    onChange={(e) => setNewAdminSection(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Category to Mentor</label>
                  <select
                    className={styles.selectSmall}
                    value={newAdminCategory}
                    onChange={(e) => setNewAdminCategory(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "var(--radius)", border: "1px solid var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
                  >
                    <option value="">Select Category...</option>
                    {choices.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className={styles.btnCreateAdmin} style={{ gridColumn: "1 / -1", marginTop: "0.5rem" }}>
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
                      <th>Mentored Category</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((adm) => (
                      <tr key={adm.id}>
                        <td>
                          {adm.name}{" "}
                          {adm.branch && (
                            <span className={styles.mutedText}>
                              ({adm.branch} - Sec {adm.section})
                            </span>
                          )}
                        </td>
                        <td>
                          <strong>{adm.username}</strong>
                        </td>
                        <td>
                          <code>{adm.password}</code>
                        </td>
                        <td>
                          <select
                            value={adm.mentorCategory || ""}
                            onChange={(e) => handleUpdateAdminCategory(adm.id, e.target.value)}
                            className={styles.selectSmall}
                            style={{ padding: "0.35rem", borderRadius: "var(--radius)", border: "1px solid var(--border)", backgroundColor: "var(--input)", color: "var(--foreground)" }}
                          >
                            <option value="">No Category / Legacy</option>
                            {choices.map((c) => (
                              <option key={c.id} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                          </select>
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
                        <td colSpan={5} className={styles.emptyText}>
                          No admin accounts created yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className={styles.contentCard}>
              <h3 className={styles.cardTitle}>System Activity Logs</h3>
              <p className={styles.subtitle}>Audit trail of additions, deletions, student mappings, and verifications.</p>
              
              {logs.length === 0 ? (
                <p className={styles.emptyText}>No activity logs recorded yet.</p>
              ) : (
                <div className={styles.tableContainer}>
                  <table className={styles.customTable}>
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>User (Actor)</th>
                        <th>Action Category</th>
                        <th>Details Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id}>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td>
                            <strong>{log.actor}</strong>
                          </td>
                          <td>
                            <span className={
                              log.action.includes("Delete") ? styles.badgePending :
                              log.action.includes("Add") || log.action.includes("Create") ? styles.badgeSuccess :
                              styles.badgeSuccess
                            }>
                              {log.action}
                            </span>
                          </td>
                          <td>{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
