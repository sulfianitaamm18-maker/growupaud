import { getAuthHeader } from './aiService';
import { Conversation, Message, AppNotification } from '../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export interface MessagingRecipient {
  id: string;
  uid: string;
  name: string;
  username: string;
  role: string;
  schoolId: string;
  schoolName: string;
  className?: string;
}

export const messagingService = {
  async getRecipients(): Promise<MessagingRecipient[]> {
    try {
      const headers = await getAuthHeader();
      if (!headers) return [];
      const res = await fetch('/api/messaging/recipients', { headers });
      if (!res.ok) return [];
      const json = await res.json();
      return json.success && Array.isArray(json.recipients) ? json.recipients : [];
    } catch (err) {
      console.warn('[MessagingService] getRecipients error:', err);
      return [];
    }
  },

  async getConversations(): Promise<Conversation[]> {
    try {
      const headers = await getAuthHeader();
      if (!headers) return [];
      const res = await fetch('/api/conversations', { headers });
      if (!res.ok) return [];
      const json = await res.json();
      return json.success && Array.isArray(json.conversations) ? json.conversations : [];
    } catch (err) {
      console.warn('[MessagingService] getConversations error:', err);
      return [];
    }
  },

  async startConversation(payload: {
    recipientId: string;
    subject: string;
    body: string;
    studentId?: string;
    studentName?: string;
  }): Promise<{ success: boolean; conversationId?: string; message?: Message; error?: string }> {
    try {
      const headers = await getAuthHeader();
      if (!headers) throw new Error('Otentikasi diperlukan.');
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal mengirim pesan.');
      }
      return json;
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal mengirim pesan.' };
    }
  },

  async getConversationMessages(conversationId: string): Promise<{
    success: boolean;
    conversation?: Conversation;
    messages: Message[];
  }> {
    try {
      const headers = await getAuthHeader();
      if (!headers) return { success: false, messages: [] };
      const res = await fetch(`/api/conversations/${conversationId}/messages`, { headers });
      if (!res.ok) return { success: false, messages: [] };
      const json = await res.json();
      return {
        success: Boolean(json.success),
        conversation: json.conversation,
        messages: Array.isArray(json.messages) ? json.messages : [],
      };
    } catch (err) {
      console.warn('[MessagingService] getConversationMessages error:', err);
      return { success: false, messages: [] };
    }
  },

  async sendReply(
    conversationId: string,
    body: string,
    replyTo?: { id: string; senderName?: string; body?: string }
  ): Promise<{ success: boolean; message?: Message; error?: string }> {
    try {
      const headers = await getAuthHeader();
      if (!headers) throw new Error('Otentikasi diperlukan.');
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ body, replyTo }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal membalas pesan.');
      }
      return json;
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal membalas pesan.' };
    }
  },

  async getNotifications(): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
    try {
      const headers = await getAuthHeader();
      if (!headers) return { notifications: [], unreadCount: 0 };
      const res = await fetch('/api/notifications', { headers });
      if (!res.ok) return { notifications: [], unreadCount: 0 };
      const json = await res.json();
      return {
        notifications: Array.isArray(json.notifications) ? json.notifications : [],
        unreadCount: typeof json.unreadCount === 'number' ? json.unreadCount : 0,
      };
    } catch (err) {
      console.warn('[MessagingService] getNotifications error:', err);
      return { notifications: [], unreadCount: 0 };
    }
  },

  async markNotificationRead(notificationId?: string, markAll?: boolean): Promise<boolean> {
    try {
      const headers = await getAuthHeader();
      if (!headers) return false;
      const res = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers,
        body: JSON.stringify({ notificationId, markAll }),
      });
      return res.ok;
    } catch (err) {
      console.warn('[MessagingService] markNotificationRead error:', err);
      return false;
    }
  },

  async getUnreadCounts(): Promise<{ unreadMessages: number; unreadNotifications: number }> {
    try {
      const headers = await getAuthHeader();
      if (!headers) return { unreadMessages: 0, unreadNotifications: 0 };
      const res = await fetch('/api/messaging/unread-counts', { headers });
      if (!res.ok) return { unreadMessages: 0, unreadNotifications: 0 };
      const json = await res.json();
      return {
        unreadMessages: json.unreadMessages || 0,
        unreadNotifications: json.unreadNotifications || 0,
      };
    } catch (err) {
      return { unreadMessages: 0, unreadNotifications: 0 };
    }
  },

  /**
   * Realtime listener for user's conversations
   */
  subscribeConversations(
    userId: string,
    onUpdate: (conversations: Conversation[]) => void,
    onError?: (err: any) => void
  ): () => void {
    if (!userId) {
      onUpdate([]);
      return () => {};
    }

    let innerUnsub: (() => void) | null = null;
    let isCancelled = false;

    const attachListener = (currentAuthUid: string) => {
      if (isCancelled) return;
      try {
        const q = query(
          collection(db, 'conversations'),
          where('participantIds', 'array-contains', currentAuthUid)
        );

        innerUnsub = onSnapshot(
          q,
          (snapshot) => {
            const conversations: Conversation[] = [];
            snapshot.forEach((d) => {
              const data = d.data();
              const unread = (data.unreadCountByUser && data.unreadCountByUser[userId]) || 0;
              conversations.push({
                id: d.id,
                ...data,
                unreadCount: unread,
              } as unknown as Conversation);
            });

            conversations.sort((a, b) => {
              const timeA = new Date(a.updatedAt || a.lastMessageAt || 0).getTime();
              const timeB = new Date(b.updatedAt || b.lastMessageAt || 0).getTime();
              return timeB - timeA;
            });

            onUpdate(conversations);
          },
          (err) => {
            console.warn('[MessagingService] realtime conversations notice:', err);
            if (onError) onError(err);
            this.getConversations().then(onUpdate).catch(() => {});
          }
        );
      } catch (err) {
        console.warn('[MessagingService] subscribeConversations error:', err);
        this.getConversations().then(onUpdate).catch(() => {});
      }
    };

    if (auth.currentUser && auth.currentUser.uid === userId) {
      attachListener(auth.currentUser.uid);
    } else {
      const unsubAuth = auth.onAuthStateChanged((user) => {
        if (user && user.uid === userId && !innerUnsub) {
          attachListener(user.uid);
        } else if (!user) {
          this.getConversations().then(onUpdate).catch(() => {});
        }
      });
      return () => {
        isCancelled = true;
        unsubAuth();
        if (innerUnsub) innerUnsub();
      };
    }

    return () => {
      isCancelled = true;
      if (innerUnsub) innerUnsub();
    };
  },

  /**
   * Realtime listener for messages in a conversation
   */
  subscribeMessages(
    conversationId: string,
    onUpdate: (messages: Message[]) => void,
    onError?: (err: any) => void
  ): () => void {
    if (!conversationId) {
      onUpdate([]);
      return () => {};
    }

    try {
      const subColRef = collection(db, 'conversations', conversationId, 'messages');
      const unsubscribe = onSnapshot(
        subColRef,
        (snapshot) => {
          const messages: Message[] = [];
          snapshot.forEach((d) => {
            messages.push({ id: d.id, ...d.data() } as Message);
          });

          messages.sort((a, b) => {
            const timeA = new Date(a.createdAt || 0).getTime();
            const timeB = new Date(b.createdAt || 0).getTime();
            return timeA - timeB;
          });

          onUpdate(messages);
        },
        (err) => {
          console.warn('[MessagingService] realtime messages notice:', err);
          if (onError) onError(err);
          this.getConversationMessages(conversationId)
            .then((res) => {
              if (res.success) onUpdate(res.messages);
            })
            .catch(() => {});
        }
      );

      return unsubscribe;
    } catch (err) {
      console.warn('[MessagingService] subscribeMessages error:', err);
      this.getConversationMessages(conversationId)
        .then((res) => {
          if (res.success) onUpdate(res.messages);
        })
        .catch(() => {});
      return () => {};
    }
  },

  /**
   * Realtime listener for user notifications & unread count
   */
  subscribeNotifications(
    userId: string,
    onUpdate: (notifications: AppNotification[], unreadCount: number) => void,
    onError?: (err: any) => void
  ): () => void {
    if (!userId) {
      onUpdate([], 0);
      return () => {};
    }

    let innerUnsub: (() => void) | null = null;
    let isCancelled = false;

    const attachListener = (currentAuthUid: string) => {
      if (isCancelled) return;
      try {
        const q = query(
          collection(db, 'notifications'),
          where('userId', '==', currentAuthUid)
        );

        innerUnsub = onSnapshot(
          q,
          (snapshot) => {
            const notifications: AppNotification[] = [];
            let unread = 0;
            snapshot.forEach((d) => {
              const data = d.data();
              const isRead = Boolean(data.isRead || data.read);
              if (!isRead) unread += 1;
              notifications.push({
                id: d.id,
                ...data,
                isRead,
              } as AppNotification);
            });

            notifications.sort((a, b) => {
              const timeA = new Date(a.createdAt || 0).getTime();
              const timeB = new Date(b.createdAt || 0).getTime();
              return timeB - timeA;
            });

            onUpdate(notifications, unread);
          },
          (err) => {
            console.warn('[MessagingService] realtime notifications notice:', err);
            if (onError) onError(err);
            this.getNotifications().then((res) => onUpdate(res.notifications, res.unreadCount)).catch(() => {});
          }
        );
      } catch (err) {
        console.warn('[MessagingService] subscribeNotifications error:', err);
        this.getNotifications().then((res) => onUpdate(res.notifications, res.unreadCount)).catch(() => {});
      }
    };

    if (auth.currentUser && auth.currentUser.uid === userId) {
      attachListener(auth.currentUser.uid);
    } else {
      const unsubAuth = auth.onAuthStateChanged((user) => {
        if (user && user.uid === userId && !innerUnsub) {
          attachListener(user.uid);
        } else if (!user) {
          this.getNotifications().then((res) => onUpdate(res.notifications, res.unreadCount)).catch(() => {});
        }
      });
      return () => {
        isCancelled = true;
        unsubAuth();
        if (innerUnsub) innerUnsub();
      };
    }

    return () => {
      isCancelled = true;
      if (innerUnsub) innerUnsub();
    };
  },

  /**
   * Realtime listener for combined unread counts (Messages + Notifications)
   */
  subscribeUnreadCounts(
    userId: string,
    onUpdate: (counts: { unreadMessages: number; unreadNotifications: number }) => void
  ): () => void {
    if (!userId) {
      onUpdate({ unreadMessages: 0, unreadNotifications: 0 });
      return () => {};
    }

    let unreadMessages = 0;
    let unreadNotifications = 0;

    const unsubConvs = this.subscribeConversations(userId, (convs) => {
      unreadMessages = convs.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      onUpdate({ unreadMessages, unreadNotifications });
    });

    const unsubNotifs = this.subscribeNotifications(userId, (_notifs, count) => {
      unreadNotifications = count;
      onUpdate({ unreadMessages, unreadNotifications });
    });

    return () => {
      unsubConvs();
      unsubNotifs();
    };
  },

  /**
   * Fetch authenticated parent's children profiles with real Class & Teacher
   */
  async getChildrenProfiles(): Promise<any[]> {
    try {
      const headers = await getAuthHeader();
      if (!headers) return [];
      const res = await fetch('/api/parent/children-profiles', { headers });
      if (!res.ok) return [];
      const json = await res.json();
      return json.success && Array.isArray(json.children) ? json.children : [];
    } catch (err) {
      console.warn('[MessagingService] getChildrenProfiles error:', err);
      return [];
    }
  },
};
