import React, { useState, useEffect } from 'react';
import { db, collection, query, where, getDocs, User, doc, getDoc } from '../firebase';
import { Twitter, User as UserIcon, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

interface FriendUser {
  uid: string;
  displayName: string;
  photoURL: string;
  bio: string;
}

const Friends = ({ currentUser }: { currentUser: User }) => {
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>('following');
  const [users, setUsers] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const field = activeTab === 'followers' ? 'followingId' : 'followerId';
        const targetField = activeTab === 'followers' ? 'followerId' : 'followingId';
        
        const q = query(collection(db, 'follows'), where(field, '==', currentUser.uid));
        const snapshot = await getDocs(q);
        const ids = snapshot.docs.map(doc => doc.data()[targetField]);
        
        const userDetails: FriendUser[] = [];
        for (const id of ids) {
          const userSnap = await getDoc(doc(db, 'users', id));
          if (userSnap.exists()) {
            userDetails.push({ uid: id, ...userSnap.data() } as FriendUser);
          }
        }
        setUsers(userDetails);
      } catch (error) {
        console.error('Error fetching friends:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [activeTab, currentUser.uid]);

  return (
    <div className="flex-1 max-w-2xl border-l border-twitter min-h-screen">
      <div className="sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-10 p-4 border-b border-twitter flex items-center gap-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-twitter-hover rounded-full transition-colors">
          <ArrowRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">{currentUser.displayName}</h1>
          <p className="text-twitter-secondary text-sm">@{currentUser.uid.slice(0, 8)}</p>
        </div>
      </div>

      <div className="flex border-b border-twitter">
        <button
          onClick={() => setActiveTab('following')}
          className={`flex-1 py-4 font-bold transition-colors ${
            activeTab === 'following' ? 'border-b-4 border-blue-500 text-black dark:text-white' : 'text-twitter-secondary hover:bg-twitter-hover'
          }`}
        >
          المتابَعون
        </button>
        <button
          onClick={() => setActiveTab('followers')}
          className={`flex-1 py-4 font-bold transition-colors ${
            activeTab === 'followers' ? 'border-b-4 border-blue-500 text-black dark:text-white' : 'text-twitter-secondary hover:bg-twitter-hover'
          }`}
        >
          المتابعون
        </button>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex justify-center p-8">
            <Twitter className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center p-12 space-y-4">
            <h2 className="text-3xl font-bold">
              {activeTab === 'following' ? 'أنت لا تتابع أحداً بعد' : 'ليس لديك متابعون بعد'}
            </h2>
            <p className="text-twitter-secondary">
              {activeTab === 'following' 
                ? 'عندما تتابع أشخاصاً، ستراهم هنا.' 
                : 'عندما يتابعك أشخاص، ستراهم هنا.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-twitter">
            <AnimatePresence initial={false}>
              {users.map((user) => (
                <motion.div
                  key={user.uid}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 hover:bg-twitter-hover transition-colors"
                >
                  <Link to={`/profile/${user.uid}`} className="flex items-center gap-3">
                    <img src={user.photoURL} alt="" className="w-12 h-12 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{user.displayName}</p>
                      <p className="text-twitter-secondary text-sm truncate">@{user.uid.slice(0, 8)}</p>
                      {user.bio && <p className="text-sm mt-1 line-clamp-1">{user.bio}</p>}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default Friends;
