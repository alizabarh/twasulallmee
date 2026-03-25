import React, { useState, useEffect } from 'react';
import { db, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, User, doc, updateDoc, increment, deleteDoc, setDoc, getDoc } from '../firebase';
import { Image, Smile, Calendar, MapPin, Heart, MessageCircle, Repeat, Share, MoreHorizontal, Trash2, Twitter, BarChart2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import Post, { PostType } from './Post';

const CreatePost = ({ user }: { user: User }) => {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) {
        alert('حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 800 كيلوبايت.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!content.trim() && !image) || loading) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: user.displayName,
        authorPhoto: user.photoURL,
        content: content.trim(),
        imageURL: image || null,
        timestamp: serverTimestamp(),
        likesCount: 0,
        repostsCount: 0,
        commentsCount: 0,
        viewsCount: 0,
      });
      setContent('');
      setImage(null);
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border-b border-twitter flex gap-4">
      <img src={user.photoURL || ''} alt="" className="w-12 h-12 rounded-full" />
      <form onSubmit={handleSubmit} className="flex-1">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="ماذا يحدث؟"
          className="w-full bg-transparent text-xl outline-none resize-none min-h-[100px] py-2"
          maxLength={280}
        />
        {image && (
          <div className="relative mb-4">
            <img src={image} alt="" className="w-full rounded-2xl max-h-80 object-cover" />
            <button
              onClick={() => setImage(null)}
              className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-twitter pt-3">
          <div className="flex gap-1 text-blue-500">
            <label className="p-2 hover:bg-blue-50 rounded-full transition-colors cursor-pointer">
              <Image className="w-5 h-5" />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
            <button type="button" className="p-2 hover:bg-blue-50 rounded-full transition-colors"><Smile className="w-5 h-5" /></button>
            <button type="button" className="p-2 hover:bg-blue-50 rounded-full transition-colors"><Calendar className="w-5 h-5" /></button>
            <button type="button" className="p-2 hover:bg-blue-50 rounded-full transition-colors"><MapPin className="w-5 h-5" /></button>
          </div>
          <button
            disabled={(!content.trim() && !image) || loading}
            className="bg-blue-500 text-white font-bold px-6 py-2 rounded-full hover:bg-blue-600 disabled:opacity-50 transition-all"
          >
            نشر
          </button>
        </div>
      </form>
    </div>
  );
};

const Feed = ({ user }: { user: User }) => {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PostType[];
      setPosts(postsData);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="flex-1">
      <div className="sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-10 p-4 border-b border-twitter">
        <h1 className="text-xl font-bold">الرئيسية</h1>
      </div>
      <CreatePost user={user} />
      {loading ? (
        <div className="p-8 flex justify-center">
          <Twitter className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="divide-y divide-twitter">
          <AnimatePresence initial={false}>
            {posts.map((post) => (
              <Post key={post.id} post={post} currentUser={user} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default Feed;
