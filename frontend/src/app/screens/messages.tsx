import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../state/auth-context';
import { apiFetch } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Loader2, Send, MessageSquare, ChevronLeft, Check, CheckCheck, MoreHorizontal, Paperclip, Search, X, Smile, Reply, FileText, Download } from 'lucide-react';

export function MessagesPage() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<any[]>([]);
    const [accountsUsers, setAccountsUsers] = useState<any[]>([]);
    const [activeUser, setActiveUser] = useState<any | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [typing, setTyping] = useState(false);
    const [lastReadMessageId, setLastReadMessageId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [replyingTo, setReplyingTo] = useState<any | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isStudent = user?.role === 'student';

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (activeUser) {
            loadMessages(activeUser.id);
            const interval = setInterval(() => loadMessages(activeUser.id), 5000); // Polling every 5 seconds
            return () => clearInterval(interval);
        }
    }, [activeUser]);

    useEffect(() => {
        // Reset lastReadMessageId when conversation changes
        setLastReadMessageId(null);
    }, [activeUser]);

    useEffect(() => {
        // Find first unread message when messages change
        if (messages.length > 0 && !lastReadMessageId) {
            const firstUnread = messages.find((msg, idx) => {
                const isMe = msg.senderId === user?.id;
                const prevMsg = idx > 0 ? messages[idx - 1] : null;
                return !isMe && !msg.read && 
                    (!prevMsg || prevMsg.read || prevMsg.senderId === user?.id);
            });
            if (firstUnread) {
                setLastReadMessageId(firstUnread.id);
            }
        }
    }, [messages, user?.id, lastReadMessageId]);

    useEffect(() => {
        // Simulate typing indicator (would come from WebSocket in real implementation)
        const interval = setInterval(() => {
            // Randomly show typing indicator for demo purposes
            // In production, this would come from the backend via WebSocket
            if (activeUser && Math.random() < 0.05) {
                setTyping(true);
                setTimeout(() => setTyping(false), 2000);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [activeUser]);

    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const convs = await apiFetch('/messages/conversations');
            setConversations(convs);

            if (isStudent && convs.length === 0) {
                const accUsers = await apiFetch('/messages/accounts-users');
                setAccountsUsers(accUsers);
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (otherUserId: string) => {
        try {
            const msgs = await apiFetch(`/messages/${otherUserId}`);
            setMessages(msgs);
            // mark read
            await apiFetch(`/messages/${otherUserId}/read`, { method: 'PATCH' });
            
            // Update unread count locally if needed
            setConversations(prev => prev.map(c => 
                c.user.id === otherUserId ? { ...c, unreadCount: 0 } : c
            ));
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !activeUser) return;

        try {
            setSending(true);
            const newMsg = await apiFetch('/messages', {
                method: 'POST',
                body: JSON.stringify({ receiverId: activeUser.id, content: content.trim() })
            });
            setMessages([...messages, newMsg]);
            setContent('');
            
            // update conversation list
            const convIdx = conversations.findIndex(c => c.user.id === activeUser.id);
            if (convIdx >= 0) {
                const newConvs = [...conversations];
                newConvs[convIdx].lastMessage = newMsg;
                setConversations(newConvs);
            } else {
                setConversations([{ user: activeUser, lastMessage: newMsg, unreadCount: 0 }, ...conversations]);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setSending(false);
        }
    };

    const handleTyping = () => {
        // In production, emit typing event to WebSocket
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
            // Stop typing indicator after delay
        }, 1000);
    };

    // Date separator helper
    const getDateLabel = (date: Date): string => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const msgDate = new Date(date);
        msgDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        yesterday.setHours(0, 0, 0, 0);
        
        if (msgDate.getTime() === today.getTime()) return 'Today';
        if (msgDate.getTime() === yesterday.getTime()) return 'Yesterday';
        
        const daysDiff = Math.floor((today.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff < 7) {
            return date.toLocaleDateString('en-US', { weekday: 'long' });
        }
        
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Check if date changed between messages
    const isNewDay = (currentMsg: any, prevMsg: any): boolean => {
        if (!prevMsg) return true;
        const currentDate = new Date(currentMsg.createdAt).toDateString();
        const prevDate = new Date(prevMsg.createdAt).toDateString();
        return currentDate !== prevDate;
    };

    // Check if messages are from same sender (for grouping)
    const isSameSender = (currentMsg: any, prevMsg: any): boolean => {
        if (!prevMsg) return false;
        return currentMsg.senderId === prevMsg.senderId;
    };

    if (loading) {
        return <div className="flex h-full items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="flex h-[calc(100vh-120px)] gap-4 p-0 md:p-6 animate-fade-in max-w-6xl mx-auto">
            {/* Sidebar */}
            <Card className={`flex flex-col border-r md:border rounded-none md:rounded-2xl shadow-none md:shadow-lg md:shadow-black/5 ${activeUser ? 'hidden md:flex md:w-1/3' : 'w-full md:w-1/3'}`}>
                <CardHeader className="py-5 border-b bg-card/50 backdrop-blur-sm">
                    <CardTitle className="text-lg font-semibold tracking-tight">Messages</CardTitle>
                </CardHeader>
                <div className="flex-1 overflow-y-auto">
                    <div className="flex flex-col p-2 space-y-0.5">
                        {conversations.map(conv => (
                            <button
                                key={conv.user.id}
                                onClick={() => setActiveUser(conv.user)}
                                className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 ${activeUser?.id === conv.user.id ? 'bg-primary/10 shadow-sm' : 'hover:bg-muted/60'}`}
                            >
                                <div className="relative">
                                    <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary font-semibold text-sm ring-2 ring-background">
                                        {conv.user.firstName?.[0] || conv.user.email?.[0] || '?'}
                                    </div>
                                    {conv.unreadCount > 0 && (
                                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-primary border-2 border-background rounded-full"></span>
                                    )}
                                </div>
                                <div className="flex-1 overflow-hidden min-w-0">
                                    <div className="flex justify-between items-center gap-2">
                                        <p className="font-medium text-sm truncate">{conv.user.firstName} {conv.user.lastName}</p>
                                        {conv.lastMessage && (
                                            <span className="text-[10px] text-muted-foreground shrink-0">
                                                {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                    <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                        {conv.unreadCount > 0 && <span className="text-primary mr-1">{conv.unreadCount} new •</span>}
                                        {conv.lastMessage?.content || 'No messages yet'}
                                    </p>
                                </div>
                            </button>
                        ))}
                        {conversations.length === 0 && isStudent && accountsUsers.map(accUser => (
                            <button
                                key={accUser.id}
                                onClick={() => setActiveUser(accUser)}
                                className={`flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200 ${activeUser?.id === accUser.id ? 'bg-primary/10 shadow-sm' : 'hover:bg-muted/60'}`}
                            >
                                <div className="relative">
                                    <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary font-semibold text-sm ring-2 ring-background">
                                        {accUser.firstName?.[0] || accUser.email?.[0] || '?'}
                                    </div>
                                </div>
                                <div className="flex-1 overflow-hidden min-w-0">
                                    <p className="font-medium text-sm truncate">Accounts Office</p>
                                    <p className="text-xs text-muted-foreground truncate">{accUser.firstName} • Start a conversation</p>
                                </div>
                            </button>
                        ))}
                        {conversations.length === 0 && (!isStudent || accountsUsers.length === 0) && (
                            <div className="text-center p-8 text-muted-foreground text-sm">
                                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                <p>No conversations yet</p>
                                <p className="text-xs mt-1">Start a new chat to get started</p>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Main Chat Area */}
            <Card className={`flex-1 flex flex-col border rounded-none md:rounded-2xl shadow-none md:shadow-lg md:shadow-black/5 overflow-hidden ${activeUser ? 'flex' : 'hidden md:flex'}`}>
                {activeUser ? (
                    <>
                        <CardHeader className="py-4 md:py-5 border-b bg-card/50 backdrop-blur-sm px-4 md:px-6">
                            <CardTitle className="text-base md:text-lg font-semibold flex items-center gap-3">
                                <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 -ml-2 rounded-full" onClick={() => setActiveUser(null)}>
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0 ring-2 ring-background shadow-sm">
                                    {activeUser.firstName?.[0] || activeUser.email?.[0] || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold truncate">{activeUser.firstName} {activeUser.lastName}</p>
                                    <p className="text-xs text-muted-foreground font-normal">{isStudent ? 'Accounts Office' : 'Student'}</p>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f0f2f5] dark:bg-[#0a1014] relative">
                            <div className="space-y-0 max-w-3xl mx-auto">
                                {messages.map((msg, idx) => {
                                    const isMe = msg.senderId === user?.id;
                                    const prevMsg = idx > 0 ? messages[idx - 1] : null;
                                    const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;
                                    const showDateSeparator = isNewDay(msg, prevMsg);
                                    const isGroupedWithPrev = isSameSender(msg, prevMsg);
                                    const isGroupedWithNext = isSameSender(msg, nextMsg);
                                    const msgDate = new Date(msg.createdAt);
                                    const timeStr = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    
                                    // Check if this is the first unread message for separator
                                    const isFirstUnread = lastReadMessageId === msg.id;
                                    
                                    // Calculate corner radius for smooth chat bubbles
                                    const getBubbleRadius = () => {
                                        if (isMe) {
                                            if (isGroupedWithPrev && isGroupedWithNext) return 'rounded-2xl';
                                            if (isGroupedWithPrev) return 'rounded-2xl rounded-br-md';
                                            if (isGroupedWithNext) return 'rounded-2xl rounded-tr-md';
                                            return 'rounded-2xl rounded-tr-md';
                                        } else {
                                            if (isGroupedWithPrev && isGroupedWithNext) return 'rounded-2xl';
                                            if (isGroupedWithPrev) return 'rounded-2xl rounded-bl-md';
                                            if (isGroupedWithNext) return 'rounded-2xl rounded-tl-md';
                                            return 'rounded-2xl rounded-tl-md';
                                        }
                                    };
                                    
                                    return (
                                        <div key={msg.id || idx}>
                                            {/* Date Separator */}
                                            {showDateSeparator && (
                                                <div className="flex items-center justify-center my-5">
                                                    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-500 dark:text-slate-400 text-[11px] px-4 py-1.5 rounded-full font-medium shadow-sm border border-slate-200/50 dark:border-slate-700/50">
                                                        {getDateLabel(msgDate)}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Unread Separator */}
                                            {isFirstUnread && (
                                                <div className="flex items-center justify-center my-4">
                                                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>
                                                    <span className="text-primary text-[11px] px-4 font-medium uppercase tracking-wider">New messages</span>
                                                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>
                                                </div>
                                            )}
                                            
                                            <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isGroupedWithPrev ? 'mt-0.5' : 'mt-3'}`}>
                                                <div className={`relative max-w-[80%] md:max-w-[65%] px-4 py-2.5 text-[14px] leading-snug transition-all duration-200 ${isMe 
                                                    ? `bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-white shadow-sm ${getBubbleRadius()}` 
                                                    : `bg-white dark:bg-[#1f2c34] text-[#111b21] dark:text-white shadow-sm border border-slate-100 dark:border-slate-800 ${getBubbleRadius()}`
                                                }`}>
                                                    <p className="pr-16">{msg.content}</p>
                                                    <div className={`flex items-center gap-1 mt-1 absolute bottom-1.5 right-2`}>
                                                        <span className={`text-[10px] tabular-nums ${isMe ? 'text-[#667781] dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                                            {timeStr}
                                                        </span>
                                                        {isMe && (
                                                            <span className={msg.read || msg.readAt ? "text-[#53bdeb]" : "text-[#8696a0] dark:text-slate-500"}>
                                                                {msg.read || msg.readAt ? (
                                                                    <CheckCheck className="h-3.5 w-3.5" />
                                                                ) : (
                                                                    <Check className="h-3.5 w-3.5" />
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                
                                {/* Typing Indicator */}
                                {typing && (
                                    <div className="flex justify-start mt-4">
                                        <div className="bg-white dark:bg-[#1f2c34] border border-slate-100 dark:border-slate-800 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500 dark:text-slate-400">{activeUser?.firstName} is typing</span>
                                                <div className="flex gap-0.5">
                                                    <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                                    <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '120ms' }}></span>
                                                    <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '240ms' }}></span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                <div ref={messagesEndRef} className="h-2" />
                            </div>
                        </div>
                        <div className="p-4 md:p-5 bg-[#f0f2f5] dark:bg-[#0a1014] border-t border-slate-200 dark:border-slate-800">
                            <form onSubmit={handleSendMessage} className="flex gap-3 items-end">
                                <div className="flex-1 bg-white dark:bg-[#1f2c34] rounded-full border border-slate-200 dark:border-slate-700 shadow-sm focus-within:shadow-md focus-within:border-primary/30 transition-all duration-200">
                                    <Input
                                        value={content}
                                        onChange={(e) => {
                                            setContent(e.target.value);
                                            handleTyping();
                                        }}
                                        placeholder="Type a message..."
                                        className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-3 text-[15px] placeholder:text-slate-400"
                                        disabled={sending}
                                    />
                                </div>
                                <Button 
                                    type="submit" 
                                    disabled={!content.trim() || sending}
                                    className="h-11 w-11 rounded-full p-0 flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:shadow-none"
                                >
                                    {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                </Button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-[#f0f2f5] dark:bg-[#0a1014]">
                        <div className="bg-white/70 dark:bg-[#1f2c34]/70 backdrop-blur-sm rounded-3xl p-8 shadow-lg">
                            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-primary/30" />
                            <p className="text-lg font-medium text-foreground">Select a conversation</p>
                            <p className="text-sm text-muted-foreground mt-1">Choose someone to start messaging</p>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
