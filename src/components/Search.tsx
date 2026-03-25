import React, { useState, useEffect } from 'react';
import { db, collection, query, where, getDocs, limit, User } from '../firebase';
import { Search as SearchIcon, Twitter, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

const Search = ({ currentUser }: { currentUser: User }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const q = query(
          collection(db, 'users'),
          where('displayName', '>=', searchQuery),
          where('displayName', '<=', searchQuery + '\uf8ff'),
          limit(10)
        );
        const snapshot = await getDocs(q);
        setResults(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  return (
    <div className="flex-1 max-w-2xl border-l border-twitter min-h-screen">
      <div className="sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-10 p-4 border-b border-twitter">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-3 w-5 h-5 text-twitter-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث في تواصل عالمي"
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-full py-3 pl-12 pr-4 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex justify-center p-8">
            <Twitter className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : !searchQuery.trim() ? (
          <div className="text-center p-12 space-y-4">
            <h2 className="text-2xl font-bold">ابحث عن أشخاص</h2>
            <p className="text-twitter-secondary">جرب البحث عن أصدقاء أو أشخاص جدد لمتابعتهم.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center p-12">
            <p className="text-twitter-secondary">لم يتم العثور على نتائج لـ "{searchQuery}"</p>
          </div>
        ) : (
          <div className="divide-y divide-twitter">
            <AnimatePresence>
              {results.map((user) => (
                <motion.div
                  key={user.uid}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 hover:bg-twitter-hover transition-colors"
                >
                  <Link to={`/profile/${user.uid}`} className="flex items-center gap-3">
                    <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="" className="w-12 h-12 rounded-full" />
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

export default Search;
