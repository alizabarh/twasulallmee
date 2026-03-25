import React, { useState, useEffect } from 'react';
import { db, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, User, where, getDocs, doc, getDoc, limit } from '../firebase';
import { Send, Search, Settings, MoreHorizontal, Twitter, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: any;
}

interface ChatUser {
  uid: string;
  displayName: string;
  photoURL: string;
  lastMessage?: string;
  lastTimestamp?: any;
}

const Messages = ({ currentUser }: { currentUser: User }) => {
  const [chats, setChats] = useState<ChatUser[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);

  useEffect(() => {
    // Fetch recent messages where user is sender or receiver
    const q1 = query(
      collection(db, 'messages'),
      where('senderId', '==', currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const q2 = query(
      collection(db, 'messages'),
      where('receiverId', '==', currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const fetchChats = async () => {
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const partnerIds = new Set<string>();
      const lastMessages = new Map<string, { content: string, timestamp: any }>();

      [...snap1.docs, ...snap2.docs].forEach(doc => {
        const data = doc.data();
        const partnerId = data.senderId === currentUser.uid ? data.receiverId : data.senderId;
        partnerIds.add(partnerId);
        
        if (!lastMessages.has(partnerId) || data.timestamp?.toMillis() > lastMessages.get(partnerId)?.timestamp?.toMillis()) {
          lastMessages.set(partnerId, { content: data.content, timestamp: data.timestamp });
        }
      });

      const chatUsers: ChatUser[] = [];
      for (const id of Array.from(partnerIds)) {
        const userSnap = await getDoc(doc(db, 'users', id));
        if (userSnap.exists()) {
          chatUsers.push({ 
            uid: id, 
            ...userSnap.data(),
            lastMessage: lastMessages.get(id)?.content,
            lastTimestamp: lastMessages.get(id)?.timestamp
          } as ChatUser);
        }
      }
      
      setChats(chatUsers.sort((a, b) => (b.lastTimestamp?.toMillis() || 0) - (a.lastTimestamp?.toMillis() || 0)));
      setLoading(false);
    };

    fetchChats();
    
    // Also listen for real-time updates on the current selected chat if any
    const unsubscribe1 = onSnapshot(q1, fetchChats);
    const unsubscribe2 = onSnapshot(q2, fetchChats);

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [currentUser.uid]);

  useEffect(() => {
    if (!selectedChat) return;

    const q = query(
      collection(db, 'messages'),
      where('senderId', 'in', [currentUser.uid, selectedChat.uid]),
      where('receiverId', 'in', [currentUser.uid, selectedChat.uid]),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Message[]);
    });

    return unsubscribe;
  }, [selectedChat, currentUser.uid]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    try {
      await addDoc(collection(db, 'messages'), {
        senderId: currentUser.uid,
        receiverId: selectedChat.uid,
        content: newMessage.trim(),
        timestamp: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const queryStr = e.target.value;
    setSearchQuery(queryStr);
    if (queryStr.length < 2) {
      setSearchResults([]);
      return;
    }

    const q = query(collection(db, 'users'), where('displayName', '>=', queryStr), limit(5));
    const snapshot = await getDocs(q);
    setSearchResults(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as ChatUser[]);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Chat List */}
      <div className={`w-full md:w-80 border-l border-twitter flex flex-col ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-twitter flex items-center justify-between sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-10">
          <h1 className="text-xl font-bold">الرسائل</h1>
          <Settings className="w-5 h-5 cursor-pointer hover:bg-twitter-hover rounded-full" />
        </div>
        
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-twitter-secondary" />
            <input
              type="text"
              placeholder="بحث في الرسائل"
              value={searchQuery}
              onChange={handleSearch}
              className="w-full bg-gray-100 dark:bg-gray-800 rounded-full py-2 pl-10 pr-4 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-twitter">
          {searchQuery ? (
            searchResults.map(user => (
              <div
                key={user.uid}
                onClick={() => { setSelectedChat(user); setSearchQuery(''); setSearchResults([]); }}
                className="p-4 hover:bg-twitter-hover cursor-pointer transition-colors flex gap-3"
              >
                <img src={user.photoURL} alt="" className="w-12 h-12 rounded-full" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{user.displayName}</p>
                  <p className="text-twitter-secondary text-sm truncate">@{user.uid.slice(0, 8)}</p>
                </div>
              </div>
            ))
          ) : (
            chats.map(chat => (
              <div
                key={chat.uid}
                onClick={() => setSelectedChat(chat)}
                className={`p-4 hover:bg-twitter-hover cursor-pointer transition-colors flex gap-3 ${selectedChat?.uid === chat.uid ? 'bg-blue-50/10 border-l-4 border-blue-500' : ''}`}
              >
                <img src={chat.photoURL} alt="" className="w-12 h-12 rounded-full" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-bold truncate">{chat.displayName}</p>
                    <span className="text-xs text-twitter-secondary">
                      {chat.lastTimestamp ? formatDistanceToNow(chat.lastTimestamp.toDate(), { addSuffix: true, locale: ar }) : ''}
                    </span>
                  </div>
                  <p className="text-twitter-secondary text-sm truncate">{chat.lastMessage || 'ابدأ محادثة جديدة'}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`flex-1 flex flex-col ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
        {selectedChat ? (
          <>
            <div className="p-3 border-b border-twitter flex items-center gap-4 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-10">
              <button onClick={() => setSelectedChat(null)} className="md:hidden p-2 hover:bg-twitter-hover rounded-full">
                <ArrowRight className="w-5 h-5" />
              </button>
              <img src={selectedChat.photoURL} alt="" className="w-8 h-8 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{selectedChat.displayName}</p>
                <p className="text-xs text-twitter-secondary truncate">@{selectedChat.uid.slice(0, 8)}</p>
              </div>
              <MoreHorizontal className="w-5 h-5 text-twitter-secondary cursor-pointer" />
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => {
                  const isMine = msg.senderId === currentUser.uid;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, x: isMine ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`max-w-[80%] p-3 rounded-2xl ${
                        isMine
                          ? 'bg-blue-500 text-white self-start rounded-br-none'
                          : 'bg-gray-100 dark:bg-gray-800 self-end rounded-bl-none'
                      }`}
                    >
                      <p className="text-[15px]">{msg.content}</p>
                      <p className={`text-[10px] mt-1 opacity-70 ${isMine ? 'text-left' : 'text-right'}`}>
                        {msg.timestamp?.toDate ? formatDistanceToNow(msg.timestamp.toDate(), { addSuffix: true, locale: ar }) : 'الآن'}
                      </p>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-twitter flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="ابدأ رسالة جديدة"
                className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full py-2 px-4 outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                disabled={!newMessage.trim()}
                className="p-2 text-blue-500 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50"
              >
                <Send className="w-6 h-6" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <h2 className="text-3xl font-bold mb-2">اختر رسالة</h2>
            <p className="text-twitter-secondary max-w-sm mb-6">
              اختر من محادثاتك الحالية، أو ابدأ واحدة جديدة، أو استمر في التصفح.
            </p>
            <button className="bg-blue-500 text-white font-bold px-8 py-3 rounded-full hover:bg-blue-600 transition-colors">
              رسالة جديدة
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
