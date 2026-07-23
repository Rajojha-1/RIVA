export interface ChatMessage {
  id?: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole?: "user" | "admin" | "superadmin";
  text: string;
  createdAt: any; // Firestore Timestamp
  fileUrl?: string;
  fileName?: string;
}

export interface ChatRoom {
  id: string;
  name: string;
  isGroup: boolean;
  participants?: string[];
  participantNames?: Record<string, string>;
  lastMessage?: string;
  lastMessageTime?: any;
  unreadCount?: number;
  avatarUrl?: string;
}

export interface ChatUser {
  uid: string;
  name: string;
  email: string;
  role?: "user" | "admin" | "superadmin";
  branch?: string;
  status?: string;
  photoURL?: string;
}
