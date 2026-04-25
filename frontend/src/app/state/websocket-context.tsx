import { createContext, useContext, useEffect, useRef, useCallback, useState, type PropsWithChildren } from 'react';
import { io, Socket } from 'socket.io-client';
import { getToken } from '../lib/api';

/* ---------- Types ---------- */

type TypingStatus = {
    userId: string;
    conversationId: string;
};

type OnlineStatus = {
    userId: string;
    isOnline: boolean;
    timestamp: string;
};

type WebSocketContextValue = {
    socket: Socket | null;
    isConnected: boolean;
    onlineUsers: Set<string>;
    typingUsers: Map<string, TypingStatus>;
    joinConversation: (otherUserId: string) => void;
    leaveConversation: (otherUserId: string) => void;
    sendTypingStart: (receiverId: string) => void;
    sendTypingStop: (receiverId: string) => void;
    markMessagesRead: (senderId: string) => void;
    onNewMessage: (callback: (message: any) => void) => () => void;
    onMessagesRead: (callback: (data: { byUserId: string; conversationId: string }) => void) => () => void;
    onUserStatusChange: (callback: (status: OnlineStatus) => void) => () => void;
    onMessageReaction: (callback: (data: {
        messageId: string;
        emoji: string;
        userId: string;
        isAdded: boolean;
        senderId: string;
        receiverId: string;
        reactions: any[];
    }) => void) => () => void;
    isUserOnline: (userId: string) => boolean;
    isUserTyping: (userId: string) => boolean;
};

/* ---------- Context ---------- */

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function WebSocketProvider({ children }: PropsWithChildren) {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
    const [typingUsers, setTypingUsers] = useState<Map<string, TypingStatus>>(new Map());

    // Initialize socket connection
    useEffect(() => {
        const token = getToken();
        if (!token) {
            console.log('[WebSocket] No token available, skipping connection');
            return;
        }

        console.log('[WebSocket] Connecting to server...');
        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[WebSocket] Connected:', socket.id);
            setIsConnected(true);
        });

        socket.on('disconnect', (reason) => {
            console.log('[WebSocket] Disconnected:', reason);
            setIsConnected(false);
        });

        socket.on('connect_error', (error) => {
            console.error('[WebSocket] Connection error:', error.message);
            setIsConnected(false);
        });

        // Handle user status changes
        socket.on('user_status_change', (status: OnlineStatus) => {
            setOnlineUsers((prev) => {
                const newSet = new Set(prev);
                if (status.isOnline) {
                    newSet.add(status.userId);
                } else {
                    newSet.delete(status.userId);
                }
                return newSet;
            });
        });

        // Handle typing indicators
        socket.on('typing_start', (data: TypingStatus) => {
            setTypingUsers((prev) => {
                const newMap = new Map(prev);
                newMap.set(data.userId, data);
                return newMap;
            });
        });

        socket.on('typing_stop', (data: TypingStatus) => {
            setTypingUsers((prev) => {
                const newMap = new Map(prev);
                newMap.delete(data.userId);
                return newMap;
            });
        });

        return () => {
            console.log('[WebSocket] Cleaning up connection');
            socket.disconnect();
            socketRef.current = null;
            setIsConnected(false);
        };
    }, []);

    // Reconnect when token changes
    useEffect(() => {
        const handleStorageChange = () => {
            const token = getToken();
            if (token && !socketRef.current?.connected) {
                // Token restored, reconnect
                window.location.reload();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const joinConversation = useCallback((otherUserId: string) => {
        const socket = socketRef.current;
        if (socket?.connected) {
            socket.emit('join_conversation', otherUserId);
        }
    }, []);

    const leaveConversation = useCallback((otherUserId: string) => {
        const socket = socketRef.current;
        if (socket?.connected) {
            socket.emit('leave_conversation', otherUserId);
        }
    }, []);

    const sendTypingStart = useCallback((receiverId: string) => {
        const socket = socketRef.current;
        if (socket?.connected) {
            socket.emit('typing_start', { conversationId: receiverId, receiverId });
        }
    }, []);

    const sendTypingStop = useCallback((receiverId: string) => {
        const socket = socketRef.current;
        if (socket?.connected) {
            socket.emit('typing_stop', { conversationId: receiverId, receiverId });
        }
    }, []);

    const markMessagesRead = useCallback((senderId: string) => {
        const socket = socketRef.current;
        if (socket?.connected) {
            socket.emit('mark_read', { senderId, conversationId: senderId });
        }
    }, []);

    const onNewMessage = useCallback((callback: (message: any) => void) => {
        const socket = socketRef.current;
        if (!socket) return () => {};

        socket.on('new_message', callback);
        return () => {
            socket.off('new_message', callback);
        };
    }, []);

    const onMessagesRead = useCallback((callback: (data: { byUserId: string; conversationId: string }) => void) => {
        const socket = socketRef.current;
        if (!socket) return () => {};

        socket.on('messages_read', callback);
        return () => {
            socket.off('messages_read', callback);
        };
    }, []);

    const onUserStatusChange = useCallback((callback: (status: OnlineStatus) => void) => {
        const socket = socketRef.current;
        if (!socket) return () => {};

        socket.on('user_status_change', callback);
        return () => {
            socket.off('user_status_change', callback);
        };
    }, []);

    const onMessageReaction = useCallback((callback: (data: {
        messageId: string;
        emoji: string;
        userId: string;
        isAdded: boolean;
        senderId: string;
        receiverId: string;
        reactions: any[];
    }) => void) => {
        const socket = socketRef.current;
        if (!socket) return () => {};

        socket.on('message_reaction', callback);
        return () => {
            socket.off('message_reaction', callback);
        };
    }, []);

    const isUserOnline = useCallback((userId: string) => {
        return onlineUsers.has(userId);
    }, [onlineUsers]);

    const isUserTyping = useCallback((userId: string) => {
        return typingUsers.has(userId);
    }, [typingUsers]);

    const value: WebSocketContextValue = {
        socket: socketRef.current,
        isConnected,
        onlineUsers,
        typingUsers,
        joinConversation,
        leaveConversation,
        sendTypingStart,
        sendTypingStop,
        markMessagesRead,
        onNewMessage,
        onMessagesRead,
        onUserStatusChange,
        onMessageReaction,
        isUserOnline,
        isUserTyping,
    };

    return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocket() {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used inside WebSocketProvider');
    }
    return context;
}
