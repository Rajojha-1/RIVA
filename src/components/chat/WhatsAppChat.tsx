"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./WhatsAppChat.module.css";
import { ChatMessage, ChatRoom, ChatUser } from "@/types/chat";
import {
  subscribeToRoomMessages,
  sendChatMessage,
  fetchRegisteredUsers,
  getOrCreateDirectRoom,
  subscribeToUserRooms,
  ensureGeneralRoomExists,
} from "@/lib/chatService";

interface WhatsAppChatProps {
  currentUser: {
    uid: string;
    displayName: string;
    email: string;
    role?: "user" | "admin" | "superadmin";
  };
}

export default function WhatsAppChat({ currentUser }: WhatsAppChatProps) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<ChatUser[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string>("general");
  const [activeRoomName, setActiveRoomName] = useState<string>("General Community Chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize general room & subscribe to user rooms
  useEffect(() => {
    ensureGeneralRoomExists();

    const unsubRooms = subscribeToUserRooms(
      currentUser.uid,
      currentUser.displayName,
      (updatedRooms) => {
        setRooms(updatedRooms);
      }
    );

    // Fetch registered users for starting direct chats
    fetchRegisteredUsers(currentUser.uid).then((users) => {
      setRegisteredUsers(users);
    });

    return () => unsubRooms();
  }, [currentUser.uid, currentUser.displayName]);

  // Subscribe to real-time messages for active room
  useEffect(() => {
    if (!activeRoomId) return;

    const unsubMessages = subscribeToRoomMessages(activeRoomId, (newMessages) => {
      setMessages(newMessages);
    });

    return () => unsubMessages();
  }, [activeRoomId]);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle sending message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeRoomId) return;

    const textToSend = inputText;
    setInputText("");

    try {
      await sendChatMessage(
        activeRoomId,
        textToSend,
        currentUser.uid,
        currentUser.displayName || "User",
        currentUser.role || "user"
      );
    } catch (err) {
      console.error("Error sending chat message:", err);
    }
  };

  // Start 1-on-1 direct chat
  const handleStartDirectChat = async (user: ChatUser) => {
    try {
      const roomId = await getOrCreateDirectRoom(
        { uid: currentUser.uid, name: currentUser.displayName },
        { uid: user.uid, name: user.name }
      );
      setActiveRoomId(roomId);
      setActiveRoomName(user.name);
      setShowMobileChat(true);
    } catch (err) {
      console.error("Error starting direct chat:", err);
    }
  };

  // Switch chat room
  const handleSelectRoom = (room: ChatRoom) => {
    setActiveRoomId(room.id);
    setActiveRoomName(room.name);
    setShowMobileChat(true);
  };

  // Format time for message bubbles
  const formatMessageTime = (createdAt: any) => {
    if (!createdAt) return "";
    const date = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Filter users/rooms by search query
  const filteredRooms = rooms.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredUsers = registeredUsers.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const containerMobileClass = showMobileChat
    ? styles.activeChatMobile
    : styles.noChatSelectedMobile;

  return (
    <div className={`${styles.whatsappContainer} ${containerMobileClass}`}>
      {/* Left Sidebar Pane */}
      <aside
        className={`${styles.sidebar} ${
          isSidebarCollapsed ? styles.sidebarCollapsed : ""
        }`}
      >
        {/* Sidebar Header */}
        <div className={styles.sidebarHeader}>
          <div className={styles.currentUserInfo}>
            <div className={styles.avatar}>
              {(currentUser.displayName || "U")[0].toUpperCase()}
            </div>
            <div className={styles.currentUserName}>
              {currentUser.displayName || "My Profile"}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className={styles.searchContainer}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Chat List */}
        <div className={styles.chatList}>
          {filteredRooms.map((room) => {
            const isActive = room.id === activeRoomId;
            return (
              <div
                key={room.id}
                className={`${styles.chatItem} ${isActive ? styles.chatItemActive : ""}`}
                onClick={() => handleSelectRoom(room)}
              >
                <div className={styles.avatar}>
                  {room.isGroup ? "👥" : (room.name || "U")[0].toUpperCase()}
                </div>
                <div className={styles.chatItemContent}>
                  <div className={styles.chatItemTop}>
                    <span className={styles.chatName}>{room.name}</span>
                  </div>
                  <span className={styles.lastMessage}>
                    {room.lastMessage || "No messages yet"}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Registered Users Section for 1-on-1 messaging */}
          <div className={styles.newChatSection}>Start Direct Chat</div>
          {filteredUsers.map((u) => (
            <div
              key={u.uid}
              className={styles.chatItem}
              onClick={() => handleStartDirectChat(u)}
            >
              <div className={styles.avatar}>
                {(u.name || "U")[0].toUpperCase()}
              </div>
              <div className={styles.chatItemContent}>
                <div className={styles.chatItemTop}>
                  <span className={styles.chatName}>{u.name}</span>
                </div>
                <span className={styles.lastMessage}>
                  {u.branch ? `${u.branch} student` : u.email || "Tap to chat"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Chat Screen Pane */}
      <section className={styles.chatArea}>
        {/* Chat Header */}
        <header className={styles.chatHeader}>
          <div className={styles.chatHeaderLeft}>
            {/* Mobile Back Button */}
            <button
              className={styles.backBtn}
              onClick={() => setShowMobileChat(false)}
              title="Back to Chats"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
              </svg>
            </button>

            {/* Desktop Sidebar Panel Toggle Button */}
            <button
              className={`${styles.hamburgerBtn} ${
                isSidebarCollapsed ? styles.hamburgerBtnCollapsed : ""
              }`}
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title={
                isSidebarCollapsed
                  ? "Expand Contacts Side Panel"
                  : "Collapse Contacts Side Panel (Maximize Chat Space)"
              }
            >
              {isSidebarCollapsed ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
                  </svg>
                  <span className={styles.showChatsLabel}>Show Contacts</span>
                </>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 4h16v16H4V4zm2 2v12h4V6H6zm6 0v12h6V6h-6z" />
                </svg>
              )}
            </button>

            <div className={styles.avatar}>
              {activeRoomId === "general"
                ? "👥"
                : (activeRoomName || "C")[0].toUpperCase()}
            </div>

            <div className={styles.chatHeaderTitle}>
              <span className={styles.chatHeaderName}>{activeRoomName}</span>
              <span className={styles.chatHeaderStatus}>
                {activeRoomId === "general"
                  ? "Group Chat • Real-time"
                  : "online"}
              </span>
            </div>
          </div>
        </header>

        {/* Floating Left-Edge Button to Expand Sidebar when Collapsed */}
        {isSidebarCollapsed && (
          <button
            className={styles.floatingEdgeExpandBtn}
            onClick={() => setIsSidebarCollapsed(false)}
            title="Expand Contacts Panel"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
            <span>Show Contacts</span>
          </button>
        )}

        {/* Message Thread */}
        <div className={styles.messagesContainer}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>💬</div>
              <div className={styles.emptyStateTitle}>No messages yet</div>
              <div className={styles.emptyStateText}>
                Be the first to send a message in {activeRoomName}! Real-time updates via Firebase.
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isOutgoing = msg.senderId === currentUser.uid;
              return (
                <div
                  key={msg.id || index}
                  className={`${styles.messageBubble} ${
                    isOutgoing ? styles.outgoing : styles.incoming
                  }`}
                >
                  {!isOutgoing && (
                    <div className={styles.senderName}>{msg.senderName}</div>
                  )}
                  <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
                  <div className={styles.messageMeta}>
                    <span>{formatMessageTime(msg.createdAt)}</span>
                    {isOutgoing && <span className={styles.checkIcon}>✓✓</span>}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Input Area */}
        <form className={styles.inputContainer} onSubmit={handleSendMessage}>
          <input
            type="text"
            className={styles.inputField}
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button type="submit" className={styles.sendBtn} title="Send Message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </form>
      </section>
    </div>
  );
}
