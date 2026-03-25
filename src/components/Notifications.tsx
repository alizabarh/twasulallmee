import React, { useState, useEffect } from 'react';
import { db, collection, query, where, orderBy, onSnapshot, User, deleteDoc, doc, writeBatch, getDocs } from '../firebase';
import { Bell, Heart, UserPlus, Repeat, MessageCircle, Trash2, Twitter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

interface Notification {
  id: string;
  type: 'like' | 'follow' | 'repost' | 'comment';
  fromId: string;
  fromName: string;
  fromPhoto: string;
  postId?: string;
  timestamp: any;
}

const Notifications = ({ currentUser }: { currentUser: User }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'notifications'),
      where('toId', '==', currentUser.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[]);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser.uid]);

  useEffect(() => {
    // Mark all unread notifications as read when the component mounts
    const markNotificationsAsRead = async () => {
      const q = query(
        collection(db, 'notifications'),
        where('toId', '==', currentUser.uid),
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { read: true });
      });
      await batch.commit();
    };

    markNotificationsAsRead();
  }, [currentUser.uid]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-6 h-6 text-pink-500 fill-current" />;
      case 'follow': return <UserPlus className="w-6 h-6 text-blue-500" />;
      case 'repost': return <Repeat className="w-6 h-6 text-green-500" />;
      case 'comment': return <MessageCircle className="w-6 h-6 text-blue-500" />;
      default: return <Bell className="w-6 h-6 text-blue-500" />;
    }
  };

  const getMessage = (type: string) => {
    switch (type) {
      case 'like': return 'أعجب بمنشورك';
      case 'follow': return 'بدأ في متابعتك';
      case 'repost': return 'أعاد نشر منشورك';
      case 'comment': return 'علق على منشورك';
      default: return 'لديك تنبيه جديد';
    }
  };

  return (
    <div className="flex-1 max-w-2xl border-l border-twitter min-h-screen">
      <div className="sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-10 p-4 border-b border-twitter">
        <h1 className="text-xl font-bold">التنبيهات</h1>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <Twitter className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center p-12 space-y-4">
          <h2 className="text-3xl font-bold">لا توجد تنبيهات حتى الآن</h2>
          <p className="text-twitter-secondary">عندما يتفاعل الأشخاص مع منشوراتك أو يتابعونك، ستراهم هنا.</p>
        </div>
      ) : (
        <div className="divide-y divide-twitter">
          <AnimatePresence initial={false}>
            {notifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 hover:bg-twitter-hover transition-colors flex gap-4"
              >
                <div className="pt-1">{getIcon(notif.type)}</div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <Link to={`/profile/${notif.fromId}`} className="flex items-center gap-2">
                      <img src={notif.fromPhoto} alt="" className="w-8 h-8 rounded-full" />
                      <span className="font-bold hover:underline">{notif.fromName}</span>
                    </Link>
                    <button onClick={() => handleDelete(notif.id)} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[15px]">
                    {getMessage(notif.type)}
                    {notif.postId && (
                      <Link to={`/post/${notif.postId}`} className="text-blue-500 hover:underline mr-1">
                        عرض المنشور
                      </Link>
                    )}
                  </p>
                  <p className="text-xs text-twitter-secondary">
                    {notif.timestamp?.toDate ? formatDistanceToNow(notif.timestamp.toDate(), { addSuffix: true, locale: ar }) : 'الآن'}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default Notifications;
