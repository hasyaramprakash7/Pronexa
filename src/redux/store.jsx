import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice.jsx';
import chatReducer from './chatSlice.jsx'; // 👈 Import your new chat slice
// MUST have 'export' here for { store } to work in main.jsx
export const store = configureStore({
    reducer: {
        auth: authReducer,
        chat: chatReducer, // 👈 Include the chat reducer in the store
    },
});