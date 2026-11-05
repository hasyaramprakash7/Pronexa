import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/axios.jsx";

// 1. Fetch Directory (For Users)
export const fetchAllLawyers = createAsyncThunk("chat/fetchAllLawyers", async () => {
    const res = await api.get("/auth/lawyers");
    return res.data;
});

// 2. Fetch Inbox (Sidebar List) - GET /api/chat/conversations
export const fetchConversations = createAsyncThunk("chat/fetchConversations", async () => {
    const res = await api.get("/chat/conversations");
    return res.data.chatList;
});

// 3. Fetch Message History - GET /api/chat/history/:partnerId
export const fetchHistory = createAsyncThunk("chat/fetchHistory", async (partnerId) => {
    const res = await api.get(`/chat/history/${partnerId}`);
    return res.data.messages;
});

// 4. Mark Read - PUT /api/chat/read-all/:partnerId
export const markMessagesAsRead = createAsyncThunk("chat/markAsRead", async (partnerId) => {
    await api.put(`/chat/read-all/${partnerId}`);
    return partnerId;
});

// 5. Send Media/File Message - POST /api/chat/send
export const sendMediaMessage = createAsyncThunk("chat/sendMedia", async (formData) => {
    const res = await api.post("/chat/send", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.message;
});

// 6. Single Delete - DELETE /api/chat/:id
export const deleteMessage = createAsyncThunk("chat/deleteMessage", async (messageId) => {
    await api.delete(`/chat/${messageId}`);
    return messageId;
});

// 7. Batch Delete - POST /api/chat/delete-batch
export const deleteBatchMessages = createAsyncThunk("chat/deleteBatch", async (ids) => {
    await api.post(`/chat/delete-batch`, { ids });
    return ids;
});

const chatSlice = createSlice({
    name: "chat",
    initialState: {
        conversations: [],
        availableLawyers: [],
        messages: [],
        selectedMessages: [],
        activePartner: null,
        loadingHistory: false
    },
    reducers: {
        setActivePartner: (state, action) => {
            state.activePartner = action.payload;
            state.messages = [];
            state.selectedMessages = [];
        },
        toggleMessageSelection: (state, action) => {
            const id = action.payload;
            state.selectedMessages = state.selectedMessages.includes(id)
                ? state.selectedMessages.filter(mId => mId !== id)
                : [...state.selectedMessages, id];
        },
        clearSelection: (state) => {
            state.selectedMessages = [];
        },
        removeMessageLocally: (state, action) => {
            state.messages = state.messages.filter(m => m._id !== action.payload);
        },
        receiveMessage: (state, action) => {
            const msg = action.payload;
            const myId = JSON.parse(localStorage.getItem('user'))?._id;
            const senderId = msg.sender?._id || msg.sender;
            const partnerId = senderId === myId ? msg.receiver : senderId;

            if (state.activePartner?._id === partnerId) {
                const exists = state.messages.some(m => m._id === msg._id);
                if (!exists) state.messages.push(msg);
            }

            const index = state.conversations.findIndex(c => c.contact._id === partnerId);
            const previewText = msg.messageType === 'text' ? msg.content : `📎 ${msg.messageType}`;

            if (index !== -1) {
                state.conversations[index].lastMessage = previewText;
                state.conversations[index].timestamp = msg.timestamp;
                if (msg.receiver === myId && state.activePartner?._id !== partnerId) {
                    state.conversations[index].unreadCount += 1;
                }
                const [convo] = state.conversations.splice(index, 1);
                state.conversations.unshift(convo);
            } else {
                state.conversations.unshift({
                    _id: msg._id,
                    contact: senderId === myId ? { _id: msg.receiver } : msg.sender,
                    lastMessage: previewText,
                    timestamp: msg.timestamp,
                    unreadCount: msg.receiver === myId ? 1 : 0
                });
            }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchConversations.fulfilled, (state, action) => { state.conversations = action.payload; })
            .addCase(fetchAllLawyers.fulfilled, (state, action) => { state.availableLawyers = action.payload; })
            .addCase(fetchHistory.pending, (state) => { state.loadingHistory = true; })
            .addCase(fetchHistory.fulfilled, (state, action) => {
                state.loadingHistory = false;
                state.messages = action.payload;
            })
            .addCase(markMessagesAsRead.fulfilled, (state, action) => {
                const index = state.conversations.findIndex(c => c.contact._id === action.payload);
                if (index !== -1) state.conversations[index].unreadCount = 0;
            })
            .addCase(deleteMessage.fulfilled, (state, action) => {
                state.messages = state.messages.filter(m => m._id !== action.payload);
            })
            .addCase(deleteBatchMessages.fulfilled, (state, action) => {
                const deletedIds = action.payload;
                state.messages = state.messages.filter(m => !deletedIds.includes(m._id));
                state.selectedMessages = [];
            });
    }
});

export const { setActivePartner, receiveMessage, removeMessageLocally, toggleMessageSelection, clearSelection } = chatSlice.actions;
export default chatSlice.reducer;