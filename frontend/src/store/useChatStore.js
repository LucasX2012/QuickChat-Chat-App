import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  // NEW: unread counts { userId: number }
  unread: {},

  incrementUnread: (userId) =>
    set((state) => ({
      unread: {
        ...state.unread,
        [userId]: (state.unread[userId] || 0) + 1,
      },
    })),

  clearUnread: (userId) =>
    set((state) => ({
      unread: { ...state.unread, [userId]: 0 },
    })),

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        messageData
      );
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
      const { selectedUser, incrementUnread } = get();

      // If message is from the currently open chat → append normally
      if (selectedUser && newMessage.senderId === selectedUser._id) {
        set({ messages: [...get().messages, newMessage] });
        return;
      }

      // Otherwise → increment unread badge
      incrementUnread(newMessage.senderId);
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },

  setSelectedUser: (selectedUser) => {
    const { clearUnread } = get();

    // Clear unread count when opening a chat
    if (selectedUser) clearUnread(selectedUser._id);

    set({ selectedUser });
  },
}));
