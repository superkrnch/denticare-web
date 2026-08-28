import { db } from '@/firebase/config';
import { COLLECTIONS } from '@/constants';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  writeBatch,
  runTransaction,
  orderBy,
  limit,
  startAfter,
} from 'firebase/firestore';

// Helper to get user display name (can be expanded if needed)
async function getUserDisplayName(uid) {
  if (!uid) return 'Unknown User';
  const userDocRef = doc(db, COLLECTIONS.USERS, uid);
  const userDocSnap = await getDoc(userDocRef);
  if (userDocSnap.exists()) {
    const userData = userDocSnap.data();
    return userData.displayName || userData.email || `User ${uid.substring(0, 4)}`;
  }
  return `User ${uid.substring(0, 4)}`;
}

export default {
  async getSupportEmployeeId(currentUserId) {
    const usersRef = collection(db, COLLECTIONS.USERS);
    const snapshot = await getDocs(query(
      usersRef,
      where('active', '==', true),
      where('role', 'in', ['administrator', 'dentist', 'dental_assistant']),
      limit(10),
    ));
    const supportUser = snapshot.docs.find((userDoc) => userDoc.id !== currentUserId);
    if (!supportUser) {
      throw new Error('No other active staff member is available for support chat.');
    }
    return supportUser.id;
  },

  /**
   * Gets or creates a chat room between a patient and an employee.
   * Ensures only one chat room exists for a given patient-employee pair.
   *
   * @param {string} patientId The UID of the patient.
   * @param {string} employeeId The UID of the employee.
   * @returns {Promise<string>} The ID of the chat room.
   */
  async getOrCreateChatRoom(patientId, employeeId) {
    const participants = [patientId, employeeId].sort(); // Ensure consistent order
    if (!patientId || !employeeId || patientId === employeeId) {
      throw new Error('A chat needs two different participants.');
    }

    const chatRoomsRef = collection(db, COLLECTIONS.CHAT_ROOMS);

    // Check for existing chat room
    const q = query(
      chatRoomsRef,
      where('participants', '==', participants)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Chat room exists, return its ID
      return querySnapshot.docs[0].id;
    } else {
      // Chat room does not exist, create a new one
      const patientDisplayName = await getUserDisplayName(patientId);
      const employeeDisplayName = await getUserDisplayName(employeeId);

      const newRoomData = {
        participants: participants,
        participantInfo: {
          [patientId]: { displayName: patientDisplayName },
          [employeeId]: { displayName: employeeDisplayName },
        },
        lastMessage: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        resolved: false,
        unreadCount: {
          [patientId]: 0,
          [employeeId]: 0,
        },
      };
      const newRoomRef = await addDoc(chatRoomsRef, newRoomData);
      return newRoomRef.id;
    }
  },

  /**
   * Sends a message to a specific chat room.
   *
   * @param {string} chatRoomId The ID of the chat room.
   * @param {string} messageText The content of the message.
   * @param {string} senderId The UID of the sender.
   * @returns {Promise<void>}
   */
  async sendMessage(chatRoomId, messageText, senderId) {
    const text = messageText.trim();
    if (!text) return;
    if (text.length > 12000) throw new Error('Messages must be 12,000 characters or fewer.');

    const chatRoomRef = doc(db, COLLECTIONS.CHAT_ROOMS, chatRoomId);
    const messagesRef = collection(chatRoomRef, COLLECTIONS.MESSAGES);

    const batch = writeBatch(db);

    const newMessageRef = doc(messagesRef); // Auto-generate ID for message
    const timestamp = serverTimestamp();

    const messageData = {
      senderId,
      text,
      timestamp,
      readBy: { [senderId]: true }, // Sender has read their own message
    };
    batch.set(newMessageRef, messageData);

    // Update chat room's last message and unread count for the other participant
    const chatRoomSnap = await getDoc(chatRoomRef);
    if (!chatRoomSnap.exists()) {
      throw new Error('Chat room not found.');
    }
    const chatRoomData = chatRoomSnap.data();
    const otherParticipantId = chatRoomData.participants.find(uid => uid !== senderId);

    const updatedUnreadCount = { ...chatRoomData.unreadCount };
    if (otherParticipantId) {
      updatedUnreadCount[otherParticipantId] = (updatedUnreadCount[otherParticipantId] || 0) + 1;
    }

    batch.update(chatRoomRef, {
      lastMessage: {
        text,
        timestamp,
        senderId,
      },
      updatedAt: timestamp,
      unreadCount: updatedUnreadCount,
      resolved: false, // Reopen if resolved and new message is sent
    });

    await batch.commit();
  },

  /**
   * Hides a message only for the current user.
   */
  async hideMessageForUser(chatRoomId, messageId, userId) {
    const messageRef = doc(db, COLLECTIONS.CHAT_ROOMS, chatRoomId, COLLECTIONS.MESSAGES, messageId);
    const messageSnap = await getDoc(messageRef);
    if (!messageSnap.exists()) {
      throw new Error('Message not found.');
    }

    await updateDoc(messageRef, {
      [`hiddenFor.${userId}`]: true,
    });
  },

  /**
   * Deletes a message and refreshes the room preview when needed.
   * Staff may delete any message in a room; patients may only delete their own.
   */
  async deleteMessage(chatRoomId, messageId, userId, { allowAny = false } = {}) {
    const messageRef = doc(db, COLLECTIONS.CHAT_ROOMS, chatRoomId, COLLECTIONS.MESSAGES, messageId);
    const chatRoomRef = doc(db, COLLECTIONS.CHAT_ROOMS, chatRoomId);

    const [messageSnap, chatRoomSnap] = await Promise.all([
      getDoc(messageRef),
      getDoc(chatRoomRef),
    ]);
    if (!messageSnap.exists() || !chatRoomSnap.exists()) {
      throw new Error('Message not found.');
    }

    const messageData = messageSnap.data();
    const chatRoomData = chatRoomSnap.data();
    if (messageData.senderId !== userId && !allowAny) {
      throw new Error('You can only delete your own messages.');
    }

    await deleteDoc(messageRef);

    const messagesRef = collection(db, COLLECTIONS.CHAT_ROOMS, chatRoomId, COLLECTIONS.MESSAGES);
    const latestSnap = await getDocs(query(messagesRef, orderBy('timestamp', 'desc'), limit(1)));

    const updates = { updatedAt: serverTimestamp() };
    if (latestSnap.empty) {
      updates.lastMessage = null;
    } else {
      const latest = latestSnap.docs[0].data();
      updates.lastMessage = {
        text: latest.text,
        timestamp: latest.timestamp,
        senderId: latest.senderId,
      };
    }

    const unreadCount = { ...(chatRoomData.unreadCount || {}) };
    let unreadChanged = false;
    for (const participantId of chatRoomData.participants || []) {
      if (participantId === messageData.senderId) continue;
      if (!messageData.readBy?.[participantId]) {
        unreadCount[participantId] = Math.max(0, (unreadCount[participantId] || 0) - 1);
        unreadChanged = true;
      }
    }
    if (unreadChanged) {
      updates.unreadCount = unreadCount;
    }

    await updateDoc(chatRoomRef, updates);
  },

  /**
   * Deletes an entire conversation and all of its messages (admin only).
   */
  async deleteConversation(chatRoomId) {
    const roomRef = doc(db, COLLECTIONS.CHAT_ROOMS, chatRoomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) {
      throw new Error('Conversation not found.');
    }

    const messagesRef = collection(db, COLLECTIONS.CHAT_ROOMS, chatRoomId, COLLECTIONS.MESSAGES);

    while (true) {
      const snapshot = await getDocs(query(messagesRef, limit(500)));
      if (snapshot.empty) break;

      const batch = writeBatch(db);
      snapshot.docs.forEach((messageDoc) => batch.delete(messageDoc.ref));
      await batch.commit();
    }

    await deleteDoc(roomRef);
  },

  /**
   *
   * @param {string} chatRoomId The ID of the chat room.
   * @param {(messages: Array<Object>) => void} callback Function to call with new messages.
   * @returns {Function} An unsubscribe function to stop listening.
   */
  onMessagesUpdate(chatRoomId, callback, onError, { viewerId } = {}) {
    const messagesRef = collection(db, COLLECTIONS.CHAT_ROOMS, chatRoomId, COLLECTIONS.MESSAGES);
    const q = query(messagesRef, orderBy('timestamp'));

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((message) => !viewerId || !message.hiddenFor?.[viewerId]);
      callback(messages);
    }, onError);
  },

  /**
   * Listens for real-time updates to a user's chat rooms.
   *
   * @param {string} userId The UID of the user.
   * @param {(chatRooms: Array<Object>) => void} callback Function to call with new chat rooms.
   * @param {(error: Error) => void} [onError] Optional error handler.
   * @param {{ allRooms?: boolean }} [options] When true, staff admins receive every chat room.
   * @returns {Function} An unsubscribe function to stop listening.
   */
  onChatRoomsUpdate(userId, callback, onError, { allRooms = false } = {}) {
    const chatRoomsRef = collection(db, COLLECTIONS.CHAT_ROOMS);
    const q = allRooms
      ? query(chatRoomsRef, orderBy('updatedAt', 'desc'))
      : query(
        chatRoomsRef,
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc'),
      );

    return onSnapshot(q, (snapshot) => {
      const chatRooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(chatRooms);
    }, onError);
  },

  /**
   * Marks a message as read for a specific user and decrements unread count.
   *
   * @param {string} chatRoomId The ID of the chat room.
   * @param {string} messageId The ID of the message.
   * @param {string} userId The UID of the user marking the message as read.
   * @returns {Promise<void>}
   */
  async markMessageAsRead(chatRoomId, messageId, userId) {
    const messageRef = doc(db, COLLECTIONS.CHAT_ROOMS, chatRoomId, COLLECTIONS.MESSAGES, messageId);
    const chatRoomRef = doc(db, COLLECTIONS.CHAT_ROOMS, chatRoomId);

    await runTransaction(db, async (transaction) => {
      const [messageSnap, chatRoomSnap] = await Promise.all([
        transaction.get(messageRef),
        transaction.get(chatRoomRef),
      ]);
      if (!messageSnap.exists() || !chatRoomSnap.exists()) return;

      const messageData = messageSnap.data();
      if (messageData.readBy?.[userId]) return;

      const chatRoomData = chatRoomSnap.data();
      const currentUnreadCount = chatRoomData.unreadCount?.[userId] || 0;
      transaction.update(messageRef, { [`readBy.${userId}`]: true });
      transaction.update(chatRoomRef, {
        [`unreadCount.${userId}`]: Math.max(0, currentUnreadCount - 1),
      });
    });
  },

  /**
   * Marks a conversation as resolved.
   *
   * @param {string} chatRoomId The ID of the chat room.
   * @returns {Promise<void>}
   */
  async markConversationAsResolved(chatRoomId) {
    const chatRoomRef = doc(db, COLLECTIONS.CHAT_ROOMS, chatRoomId);
    await updateDoc(chatRoomRef, {
      resolved: true,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Fetches historical messages for a chat room with pagination.
   * (Not explicitly asked for in current plan, but good to have for pagination)
   *
   * @param {string} chatRoomId The ID of the chat room.
   * @param {number} limit The maximum number of messages to fetch.
   * @param {string} [lastMessageId] The ID of the last message from the previous fetch for pagination.
   * @returns {Promise<Array<Object>>} An array of message objects.
   */
  async getChatHistory(chatRoomId, limit, lastMessageId = null) {
    const messagesRef = collection(db, COLLECTIONS.CHAT_ROOMS, chatRoomId, COLLECTIONS.MESSAGES);
    let q = query(messagesRef, orderBy('timestamp', 'desc'), limit(limit));

    if (lastMessageId) {
      const lastMessageDoc = await getDoc(doc(messagesRef, lastMessageId));
      if (lastMessageDoc.exists()) {
        q = query(messagesRef, orderBy('timestamp', 'desc'), startAfter(lastMessageDoc), limit(limit));
      }
    }

    const querySnapshot = await getDocs(q);
    const messages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse(); // Reverse to get chronological order
    return messages;
  },

  // The functions addParticipant and removeParticipant were requested initially but not detailed
  // in the final plan. They can be added here if needed, but are not critical for MVP.
  // async addParticipant(chatRoomId, userId) { /* ... */ },
  // async removeParticipant(chatRoomId, userId) { /* ... */ },
};
