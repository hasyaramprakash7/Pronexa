import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    fetchConversations, fetchHistory, setActivePartner,
    receiveMessage, fetchAllLawyers, markMessagesAsRead,
    deleteMessage, deleteBatchMessages, toggleMessageSelection,
    clearSelection, removeMessageLocally, sendMediaMessage
} from '../redux/chatSlice';
import { logout } from '../redux/authSlice';
import { io } from "socket.io-client";
import api from '../api/axios';
import {
    FaPhone, FaVideo, FaEllipsisV, FaPaperPlane, FaTimes,
    FaSmile, FaPaperclip, FaSignOutAlt, FaSearch, FaCheckDouble,
    FaTrash, FaMicrophone, FaCheckCircle, FaCircle, FaStop, FaExternalLinkAlt
} from 'react-icons/fa';

export default function Chat() {
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.auth);
    const { conversations, availableLawyers, messages, activePartner, selectedMessages } = useSelector(state => state.chat);

    // --- Local States ---
    const [text, setText] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);

    // --- Refs ---
    const socket = useRef();
    const scrollRef = useRef();
    const fileInputRef = useRef();
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

    // 1. Connection & Real-time Sync
    useEffect(() => {
        socket.current = io("/", { auth: { token: localStorage.getItem("accessToken") } });

        socket.current.on("newMessage", (msg) => {
            dispatch(receiveMessage(msg));
            // Auto-mark as read if current chat is open
            if (msg.sender?._id === activePartner?._id || msg.sender === activePartner?._id) {
                dispatch(markMessagesAsRead(activePartner?._id));
            }
        });

        socket.current.on("messageDeleted", (id) => {
            dispatch(removeMessageLocally(id));
        });

        if (user?.role === 'user') dispatch(fetchAllLawyers());
        dispatch(fetchConversations());

        return () => socket.current.disconnect();
    }, [dispatch, user?.role, activePartner?._id]);

    // 2. Chat Switching
    useEffect(() => {
        if (activePartner?._id) {
            dispatch(fetchHistory(activePartner._id));
            dispatch(markMessagesAsRead(activePartner._id));
            dispatch(clearSelection());
        }
    }, [activePartner, dispatch]);

    // 3. Scroll to Bottom
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // 🟢 4. SMART LINK & MEETING PREVIEW (WhatsApp Style)
    const renderMessageText = (content) => {
        if (!content) return null;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = content.split(urlRegex);

        return parts.map((part, i) => {
            if (part.match(urlRegex)) {
                const isMeeting = part.includes('zoom.us') || part.includes('meet.google.com');
                return (
                    <div key={i} className="my-2 p-3 bg-black/30 rounded-xl border border-white/5 flex flex-col gap-2 shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${isMeeting ? 'bg-blue-600' : 'bg-zinc-700'}`}>
                                {isMeeting ? <FaVideo className="text-white text-[10px]" /> : <FaExternalLinkAlt className="text-white text-[10px]" />}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                    {isMeeting ? 'Video Meeting' : 'Web Preview'}
                                </span>
                                <span className="text-[11px] text-sky-400 truncate w-44">{part}</span>
                            </div>
                        </div>
                        <a href={part} target="_blank" rel="noopener noreferrer" className="bg-zinc-800 hover:bg-emerald-600 text-white text-center py-2 rounded-lg text-[10px] font-bold transition-all uppercase">
                            {isMeeting ? 'Join Meeting' : 'Open Link'}
                        </a>
                    </div>
                );
            }
            return part;
        });
    };

    // 5. Voice Recording
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];
            mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
            mediaRecorderRef.current.onstop = async () => {
                const file = new File([new Blob(audioChunksRef.current)], "voice.mp3", { type: 'audio/mpeg' });
                const formData = new FormData();
                formData.append("receiverId", activePartner._id);
                formData.append("messageType", 'audio');
                formData.append("file", file);
                setIsUploading(true);
                await dispatch(sendMediaMessage(formData));
                setIsUploading(false);
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
        } catch (err) { alert("Mic required"); }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    // 6. Media and Selection Logic
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file || !activePartner) return;
        const type = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image';
        const formData = new FormData();
        formData.append("receiverId", activePartner._id);
        formData.append("messageType", type);
        formData.append("file", file);
        setIsUploading(true);
        await dispatch(sendMediaMessage(formData));
        setIsUploading(false);
    };

    const handleSend = (e) => {
        if (e) e.preventDefault();
        if (!text.trim() || !activePartner) return;
        socket.current.emit("sendMessage", { receiverId: activePartner._id, content: text, messageType: "text" });
        setText("");
    };

    const handleDeleteSelected = () => {
        if (window.confirm(`Delete ${selectedMessages.length} selected messages?`)) {
            dispatch(deleteBatchMessages(selectedMessages));
        }
    };

    // 🟢 7. MERGED LIST LOGIC (Ensures Users see unread counts)
    const displayList = (user?.role === 'user' ? availableLawyers : conversations).map(item => {
        const contact = item.contact || item;
        // Search current conversations for unread count matching this contact
        const convoMatch = user?.role === 'user'
            ? conversations.find(c => c.contact._id === contact._id)
            : item;

        return {
            ...contact,
            unreadCount: convoMatch?.unreadCount || 0,
            lastMessage: convoMatch?.lastMessage || (contact.lawyerProfile?.specialization || 'Tap to consult'),
            timestamp: convoMatch?.timestamp,
            originalId: item._id
        };
    }).filter(item => item.phone?.includes(searchTerm));

    const isSelectionMode = selectedMessages.length > 0;

    return (
        <div className="flex h-screen bg-[#0b141a] text-zinc-300 overflow-hidden font-sans select-none">

            {/* SIDEBAR */}
            <div className={`w-full md:w-[420px] border-r border-zinc-800 flex flex-col ${activePartner ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-3 bg-[#202c33] flex justify-between items-center shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white shadow-lg ring-2 ring-white/10">
                            {user?.phone?.slice(-2)}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-white">My Account</span>
                            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">{user?.role}</span>
                        </div>
                    </div>
                    <button onClick={() => dispatch(logout())} className="text-zinc-400 hover:text-red-500 p-2 transition-colors"><FaSignOutAlt /></button>
                </div>

                <div className="p-2 bg-[#0b141a]">
                    <div className="bg-[#202c33] flex items-center px-4 py-1.5 rounded-lg border border-transparent focus-within:border-emerald-500/30">
                        <FaSearch className="text-zinc-500 mr-3 text-xs" />
                        <input placeholder="Search numbers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent text-sm w-full outline-none text-zinc-100 placeholder-zinc-500" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-[#0b141a] custom-scrollbar">
                    {displayList.map((item) => (
                        <div key={item._id} onClick={() => dispatch(setActivePartner(item))} className={`p-4 flex items-center gap-4 cursor-pointer border-b border-zinc-800/10 transition-all ${activePartner?._id === item._id ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]'}`}>
                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-2xl border border-zinc-700 relative">
                                {item.role === 'lawyer' ? '⚖️' : '👤'}
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#0b141a] rounded-full shadow-md"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className="text-zinc-100 font-medium truncate tracking-tight">{item.phone}</h4>
                                    {item.timestamp && <span className={`text-[10px] ${item.unreadCount > 0 ? 'text-emerald-500 font-bold' : 'text-zinc-500'}`}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className={`text-xs truncate ${item.unreadCount > 0 ? 'text-zinc-100 font-semibold' : 'text-zinc-500'}`}>{item.lastMessage}</p>

                                    {/* 🟢 UNREAD BADGE FOR BOTH USER & LAWYER */}
                                    {item.unreadCount > 0 && (
                                        <span className="bg-emerald-500 text-[#0b141a] text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-lg animate-bounce">
                                            {item.unreadCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MAIN CHAT AREA */}
            <div className="flex-1 flex flex-col bg-[#0b141a] relative">
                {activePartner ? (
                    <>
                        {/* SELECTION HEADER */}
                        {isSelectionMode && (
                            <div className="absolute top-0 left-0 w-full h-[64px] bg-[#202c33] z-50 flex items-center justify-between px-6 border-b border-white/5 animate-in slide-in-from-top duration-300 shadow-2xl">
                                <div className="flex items-center gap-6">
                                    <FaTimes className="cursor-pointer text-xl text-zinc-400 hover:text-white" onClick={() => dispatch(clearSelection())} />
                                    <span className="text-white font-semibold text-lg">{selectedMessages.length} selected</span>
                                </div>
                                <FaTrash className="cursor-pointer text-lg text-zinc-400 hover:text-red-500 transition-colors" onClick={handleDeleteSelected} />
                            </div>
                        )}

                        <div className="p-3 bg-[#202c33] flex justify-between items-center shadow-lg z-10 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <button onClick={() => dispatch(setActivePartner(null))} className="md:hidden text-2xl text-zinc-400 mr-2 hover:text-white">←</button>
                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xl border border-zinc-700">{activePartner.role === 'lawyer' ? '⚖️' : '👤'}</div>
                                <div><h3 className="text-zinc-100 font-bold leading-tight">{activePartner.phone}</h3><p className="text-[9px] text-emerald-500 uppercase font-bold tracking-widest">{activePartner.role}</p></div>
                            </div>
                            <div className="flex gap-7 text-zinc-400 mr-4 text-lg"><FaVideo /><FaPhone /><FaEllipsisV /></div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:px-24 space-y-2 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-opacity-[0.06] scroll-smooth custom-scrollbar">
                            {messages.map((m, i) => {
                                const isMe = (m.sender?._id || m.sender) === user._id;
                                const isSelected = selectedMessages.includes(m._id);
                                return (
                                    <div key={i} className={`flex items-center gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'} group`}>
                                        <div onClick={() => dispatch(toggleMessageSelection(m._id))} className={`cursor-pointer transition-all duration-300 transform ${isSelectionMode || isMe ? 'opacity-100 scale-100' : 'opacity-0 scale-0 w-0 overflow-hidden'}`}>
                                            {isSelected ? <FaCheckCircle className="text-emerald-500 text-lg shadow-sm" /> : <FaCircle className="text-zinc-700 text-lg" />}
                                        </div>
                                        <div onDoubleClick={() => dispatch(toggleMessageSelection(m._id))} className={`max-w-[85%] md:max-w-[65%] p-1.5 rounded-lg shadow-md relative transition-all duration-200 ${isSelected ? 'bg-emerald-900/40 ring-2 ring-emerald-500/50 scale-[0.98]' : isMe ? 'bg-[#005c4b] text-white rounded-tr-none' : 'bg-[#202c33] text-white rounded-tl-none'}`}>
                                            {m.mediaUrl && m.messageType === 'image' && <img src={m.mediaUrl} alt="sent" className="rounded-md max-h-64 w-full object-cover mb-1 cursor-pointer hover:brightness-110 transition-all" onClick={() => !isSelectionMode && window.open(m.mediaUrl, '_blank')} />}
                                            {m.mediaUrl && m.messageType === 'video' && <video controls className="rounded-md max-h-64 w-full mb-1 shadow-inner"><source src={m.mediaUrl} /></video>}
                                            {m.mediaUrl && m.messageType === 'audio' && <div className="flex items-center gap-2 p-1 min-w-[220px] bg-black/10 rounded-md shadow-inner"><FaMicrophone className="text-emerald-400" /><audio controls className="h-8 w-full"><source src={m.mediaUrl} /></audio></div>}
                                            {m.content && <div className="px-2 pb-1 leading-relaxed break-words whitespace-pre-wrap text-[13.5px]">{renderMessageText(m.content)}</div>}
                                            <div className="text-[9px] text-zinc-400 text-right mt-1 px-2 flex justify-end items-center gap-1 opacity-70 uppercase font-bold">
                                                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {isMe && <FaCheckDouble className={`text-[11px] ${m.read ? 'text-sky-400' : 'text-zinc-500'}`} />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={scrollRef} />
                        </div>

                        {/* DYNAMIC INPUT AREA */}
                        <div className="p-3 bg-[#202c33] flex items-center gap-3 border-t border-white/5 shadow-2xl">
                            {isRecording ? (
                                <div className="flex-1 flex items-center justify-between bg-[#2a3942] p-2.5 px-5 rounded-full animate-pulse shadow-inner border border-red-500/20">
                                    <div className="flex items-center gap-3 text-red-500 font-black"><FaMicrophone className="animate-bounce" />{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</div>
                                    <span className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Recording...</span>
                                    <button onClick={() => { setIsRecording(false); clearInterval(timerRef.current); }} className="text-zinc-400 hover:text-white transition-colors text-xs font-bold underline">Cancel</button>
                                </div>
                            ) : (
                                <>
                                    {/* <FaSmile className="text-zinc-400 text-2xl hover:text-zinc-200 cursor-pointer" /> */}
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,video/*,audio/*" />
                                    <FaPaperclip onClick={() => !isUploading && fileInputRef.current.click()} className={`text-zinc-400 text-xl cursor-pointer hover:text-zinc-200 ${isUploading ? 'animate-spin text-emerald-500' : ''}`} />
                                    <form onSubmit={handleSend} className="flex-1">
                                        <input value={text} onChange={e => setText(e.target.value)} placeholder={isUploading ? "Uploading media..." : "Type a message"} disabled={isUploading} className="w-full bg-[#2a3942] p-2.5 px-6 rounded-full text-sm outline-none text-zinc-200 placeholder-zinc-500 border border-transparent focus:border-emerald-500/20 shadow-inner" />
                                    </form>
                                </>
                            )}
                            <button onClick={text.trim() ? handleSend : isRecording ? stopRecording : startRecording} className={`p-3 rounded-full text-[#0b141a] transition-all active:scale-90 shadow-xl ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                                {text.trim() ? <FaPaperPlane /> : isRecording ? <FaStop /> : <FaMicrophone />}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center bg-[#222e35] text-center px-4">
                        <div className="w-24 h-24 bg-zinc-800 rounded-full flex items-center justify-center text-5xl mb-6 shadow-2xl relative">⚖️<div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping"></div></div>
                        <h2 className="text-zinc-200 text-2xl font-light tracking-tight">LegalChat Desktop</h2>
                        <div className="mt-24 text-[10px] text-zinc-600 uppercase tracking-widest border-t border-zinc-800 pt-6 w-64 flex items-center justify-center gap-2">🔒 Secure & Encrypted</div>
                    </div>
                )}
            </div>
        </div>
    );
}