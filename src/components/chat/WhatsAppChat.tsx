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
  const [showMobileChat, setShowMobileChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleInputFocus = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

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
      <aside className={styles.sidebar}>
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
            <span className={styles.searchIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
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
                  {room.isGroup ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                    </svg>
                  ) : (
                    (room.name || "U")[0].toUpperCase()
                  )}
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

            <div className={styles.avatar}>
              {activeRoomId === "general" ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
              ) : (
                (activeRoomName || "C")[0].toUpperCase()
              )}
            </div>

            <div className={styles.chatHeaderTitle}>
              <span className={styles.chatHeaderName}>
                {activeRoomName || "General Community Chat"}
              </span>
              <span className={styles.chatHeaderStatus}>
                {activeRoomId === "general"
                  ? "Group Chat • Real-time"
                  : "online"}
              </span>
            </div>
          </div>
        </header>

        {/* Message Thread */}
        <div className={styles.messagesContainer}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>
                <svg width="42" height="42" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
                </svg>
              </div>
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
            onFocus={handleInputFocus}
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
