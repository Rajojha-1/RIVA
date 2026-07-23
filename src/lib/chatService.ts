import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  where,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
import { ChatMessage, ChatRoom, ChatUser } from "@/types/chat";

// Helper to create or ensure the General Community room exists
export async function ensureGeneralRoomExists(): Promise<ChatRoom> {
  const generalRef = doc(db, "chats", "general");
  const snap = await getDoc(generalRef);

  if (!snap.exists()) {
    const generalRoomData: Omit<ChatRoom, "id"> = {
      name: "General Community Chat",
      isGroup: true,
      lastMessage: "Welcome to RIVA Community Chat!",
      lastMessageTime: serverTimestamp(),
    };
    await setDoc(generalRef, generalRoomData);
    return { id: "general", ...generalRoomData };
  }

  return { id: snap.id, ...(snap.data() as Omit<ChatRoom, "id">) };
}

// Subscribe to messages in a specific chat room
export function subscribeToRoomMessages(
  roomId: string,
  callback: (messages: ChatMessage[]) => void
) {
  const messagesRef = collection(db, "chats", roomId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: ChatMessage[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ChatMessage, "id">),
      }));
      callback(messages);
    },
    (err) => {
      console.error("Error fetching chat messages:", err);
    }
  );
}

// Send a message to a room
export async function sendChatMessage(
  roomId: string,
  text: string,
  senderId: string,
  senderName: string,
  senderRole?: "user" | "admin" | "superadmin"
) {
  if (!text.trim()) return;

  const messagesRef = collection(db, "chats", roomId, "messages");
  const newMessage = {
    roomId,
    senderId,
    senderName: senderName || "Anonymous User",
    senderRole: senderRole || "user",
    text: text.trim(),
    createdAt: serverTimestamp(),
  };

  await addDoc(messagesRef, newMessage);

  // Update room metadata for last message
  const roomRef = doc(db, "chats", roomId);
  await setDoc(
    roomRef,
    {
      lastMessage: `${senderName}: ${text.trim()}`,
      lastMessageTime: serverTimestamp(),
    },
    { merge: true }
  );
}

// Fetch registered users (students, admins, superadmin) for starting 1-on-1 direct messaging
export async function fetchRegisteredUsers(currentUserId: string): Promise<ChatUser[]> {
  try {
    const usersList: ChatUser[] = [];

    // 1. Fetch Students from "users" collection
    const usersRef = collection(db, "users");
    const userSnap = await getDocs(usersRef);
    userSnap.forEach((d) => {
      const data = d.data();
      if (d.id !== currentUserId) {
        usersList.push({
          uid: d.id,
          name: data.name || data.collegeEmail || "Student " + d.id.slice(0, 4),
          email: data.collegeEmail || data.email || "",
          role: "user",
          branch: data.branch,
          status: data.status,
        });
      }
    });

    // 2. Fetch Admins from "admins" collection
    const adminsRef = collection(db, "admins");
    const adminSnap = await getDocs(adminsRef);
    adminSnap.forEach((d) => {
      const data = d.data();
      const adminUsername = data.username || d.id;
      const adminUid = `admin_${adminUsername}`;
      if (adminUid !== currentUserId && d.id !== currentUserId) {
        usersList.push({
          uid: adminUid,
          name: `${data.name || adminUsername} (Admin)`,
          email: `${adminUsername}@riva.com`,
          role: "admin",
          branch: data.mentorCategory ? `Mentor: ${data.mentorCategory}` : "Admin",
        });
      }
    });

    // 3. Include Superadmin
    if (currentUserId !== "superadmin") {
      usersList.push({
        uid: "superadmin",
        name: "Superadmin (System Leader)",
        email: "superadmin@riva.com",
        role: "superadmin",
        branch: "Superadmin",
      });
    }

    return usersList;
  } catch (err) {
    console.error("Error fetching registered users & admins:", err);
    return [];
  }
}

// Get or create a 1-on-1 direct chat room between two users
export async function getOrCreateDirectRoom(
  user1: { uid: string; name: string },
  user2: { uid: string; name: string }
): Promise<string> {
  const roomId = `direct_${[user1.uid, user2.uid].sort().join("_")}`;
  const roomRef = doc(db, "chats", roomId);
  const snap = await getDoc(roomRef);

  if (!snap.exists()) {
    await setDoc(roomRef, {
      name: `${user1.name} & ${user2.name}`,
      isGroup: false,
      participants: [user1.uid, user2.uid],
      participantNames: {
        [user1.uid]: user1.name,
        [user2.uid]: user2.name,
      },
      lastMessage: "Chat started",
      lastMessageTime: serverTimestamp(),
    });
  }

  return roomId;
}

// Subscribe to active rooms for a user
export function subscribeToUserRooms(
  currentUserId: string,
  currentUserName: string,
  callback: (rooms: ChatRoom[]) => void
) {
  const chatsRef = collection(db, "chats");

  return onSnapshot(
    chatsRef,
    (snapshot) => {
      const rooms: ChatRoom[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as Omit<ChatRoom, "id">;
        // Group rooms or rooms where user is participant
        if (data.isGroup || (data.participants && data.participants.includes(currentUserId))) {
          // If direct chat, set room name to the OTHER participant's name
          let roomName = data.name;
          if (!data.isGroup && data.participantNames) {
            const otherId = data.participants?.find((id) => id !== currentUserId);
            if (otherId && data.participantNames[otherId]) {
              roomName = data.participantNames[otherId];
            }
          }
          rooms.push({
            id: d.id,
            ...data,
            name: roomName,
          });
        }
      });

      // Ensure General Community Chat room exists in the list
      const hasGeneral = rooms.some((r) => r.id === "general");
      if (!hasGeneral) {
        rooms.unshift({
          id: "general",
          name: "General Community Chat",
          isGroup: true,
          lastMessage: "Tap to open general chat",
        });
      }

      callback(rooms);
    },
    (err) => {
      console.error("Error subscribing to user rooms:", err);
    }
  );
}
