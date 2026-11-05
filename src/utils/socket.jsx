import { io } from "socket.io-client";

const socket = io("http://localhost:5000", {
    auth: {
        token: localStorage.getItem("accessToken") // Ensure your auth logic saves this
    },
    autoConnect: false
});

export default socket;