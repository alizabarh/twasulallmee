import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, doc, getDoc, updateDoc, collection, query, where, orderBy, onSnapshot, User, Timestamp, setDoc, deleteDoc, getDocs, increment, collectionGroup } from '../firebase';
import { ArrowRight, Calendar, MapPin, Link as LinkIcon, Camera, Edit3, Twitter, Heart, MessageCircle, Repeat, Share, Trash2, BarChart2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import Post, { PostType } from './Post';

interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  headerURL: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  createdAt: any;
}

const Profile = ({ currentUser }: { currentUser: User }) => {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ displayName: '', bio: '', photoURL: '', headerURL: '' });
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'media' | 'likes'>('posts');

  useEffect(() => {
    if (!uid) return;

    const fetchProfile = async () => {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data() as UserProfile;
        setProfile(data);
        setEditData({
          displayName: data.displayName,
          bio: data.bio || '',
          photoURL: data.photoURL,
          headerURL: data.headerURL || 'https://picsum.photos/seed/header/1500/500',
        });
      }
    };

    const fetchContent = async () => {
      setLoading(true);
      let unsubscribe = () => {};

      if (activeTab === 'posts') {
        const q = query(collection(db, 'posts'), where('authorId', '==', uid), orderBy('timestamp', 'desc'));
        unsubscribe = onSnapshot(q, (snapshot) => {
          setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(false);
        });
      } else if (activeTab === 'media') {
        const q = query(collection(db, 'posts'), where('authorId', '==', uid), where('imageURL', '!=', null), orderBy('imageURL'), orderBy('timestamp', 'desc'));
        // Note: This might need a composite index. Fallback to client-side filter if it fails.
        unsubscribe = onSnapshot(query(collection(db, 'posts'), where('authorId', '==', uid), orderBy('timestamp', 'desc')), (snapshot) => {
          setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)).filter(p => p.imageURL));
          setLoading(false);
        });
      } else if (activeTab === 'likes') {
        const q = query(collection(db, 'likes'), where('userId', '==', uid), orderBy('timestamp', 'desc'));
        unsubscribe = onSnapshot(q, async (snapshot) => {
          const likedPosts = [];
          for (const likeDoc of snapshot.docs) {
            const postSnap = await getDoc(doc(db, 'posts', likeDoc.data().postId));
            if (postSnap.exists()) {
              likedPosts.push({ id: postSnap.id, ...postSnap.data() });
            }
          }
          setPosts(likedPosts);
          setLoading(false);
        });
      } else if (activeTab === 'replies') {
        const q = query(collectionGroup(db, 'comments'), where('authorId', '==', uid), orderBy('timestamp', 'desc'));
        unsubscribe = onSnapshot(q, async (snapshot) => {
          const repliedPosts = [];
          for (const commentDoc of snapshot.docs) {
            const commentData = commentDoc.data();
            // Get the parent post ID from the path: posts/{postId}/comments/{commentId}
            const pathParts = commentDoc.ref.path.split('/');
            const postId = pathParts[1];
            const postSnap = await getDoc(doc(db, 'posts', postId));
            if (postSnap.exists()) {
              repliedPosts.push({ 
                id: postSnap.id, 
                ...postSnap.data(), 
                replyContent: commentData.content,
                replyTimestamp: commentData.timestamp 
              });
            }
          }
          setPosts(repliedPosts);
          setLoading(false);
        });
      }

      return unsubscribe;
    };

    fetchProfile();
    const unsubscribe = fetchContent();
    
    const checkFollow = async () => {
      const followRef = doc(db, 'follows', `${currentUser.uid}_${uid}`);
      const followSnap = await getDoc(followRef);
      setIsFollowing(followSnap.exists());
    };

    checkFollow();
    return () => {
      fetchContent().then(unsub => unsub && typeof unsub === 'function' && unsub());
    };
  }, [uid, currentUser.uid, activeTab]);

  const handleUpdate = async () => {
    if (!uid) return;
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, editData);
      setProfile(prev => prev ? { ...prev, ...editData } : null);
      setIsEditing(false);
      
      // Update existing posts with new profile info
      const postsQuery = query(collection(db, 'posts'), where('authorId', '==', uid));
      const postsSnap = await getDocs(postsQuery);
      postsSnap.forEach(async (postDoc) => {
        await updateDoc(doc(db, 'posts', postDoc.id), {
          authorName: editData.displayName,
          authorPhoto: editData.photoURL,
        });
      });
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleFollow = async () => {
    if (!uid || uid === currentUser.uid) return;
    const followRef = doc(db, 'follows', `${currentUser.uid}_${uid}`);
    const currentUserRef = doc(db, 'users', currentUser.uid);
    const targetUserRef = doc(db, 'users', uid);

    try {
      if (isFollowing) {
        await deleteDoc(followRef);
        await updateDoc(currentUserRef, { followingCount: increment(-1) });
        await updateDoc(targetUserRef, { followersCount: increment(-1) });
        setIsFollowing(false);
        setProfile(prev => prev ? { ...prev, followersCount: prev.followersCount - 1 } : null);
      } else {
        await setDoc(followRef, { followerId: currentUser.uid, followingId: uid });
        await updateDoc(currentUserRef, { followingCount: increment(1) });
        await updateDoc(targetUserRef, { followersCount: increment(1) });
        setIsFollowing(true);
        setProfile(prev => prev ? { ...prev, followersCount: prev.followersCount + 1 } : null);
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex justify-center p-8">
        <Twitter className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-10 p-4 border-b border-twitter flex items-center gap-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-twitter-hover rounded-full transition-colors">
          <ArrowRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold">{profile.displayName}</h1>
          <p className="text-twitter-secondary text-sm">{posts.length} منشور</p>
        </div>
      </div>

      <div className="relative">
        <div className="h-48 bg-gray-200 dark:bg-gray-800 overflow-hidden">
          <img src={profile.headerURL} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="px-4 -mt-16 flex justify-between items-end mb-4">
          <div className="relative">
            <img src={profile.photoURL} alt="" className="w-32 h-32 rounded-full border-4 border-white dark:border-black bg-white dark:bg-black" />
          </div>
          {uid === currentUser.uid ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 border border-twitter rounded-full font-bold hover:bg-twitter-hover transition-colors"
            >
              تعديل الملف الشخصي
            </button>
          ) : (
            <button
              onClick={handleFollow}
              className={`px-6 py-2 rounded-full font-bold transition-colors ${
                isFollowing ? 'border border-twitter hover:bg-red-50 hover:text-red-500 hover:border-red-500' : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isFollowing ? 'إلغاء المتابعة' : 'متابعة'}
            </button>
          )}
        </div>

        <div className="px-4 space-y-3 mb-4">
          <div>
            <h2 className="text-xl font-bold">{profile.displayName}</h2>
            <p className="text-twitter-secondary">@{profile.uid.slice(0, 8)}</p>
          </div>
          <p className="text-[15px]">{profile.bio}</p>
          <div className="flex flex-wrap gap-4 text-twitter-secondary text-sm">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>انضم في {profile.createdAt?.toDate ? format(profile.createdAt.toDate(), 'MMMM yyyy', { locale: ar }) : '...'}</span>
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="hover:underline cursor-pointer"><span className="font-bold">{profile.followingCount || 0}</span> <span className="text-twitter-secondary">متابَع</span></div>
            <div className="hover:underline cursor-pointer"><span className="font-bold">{profile.followersCount || 0}</span> <span className="text-twitter-secondary">متابع</span></div>
          </div>
        </div>
      </div>

      <div className="border-b border-twitter flex">
        <button 
          onClick={() => setActiveTab('posts')}
          className={`flex-1 py-4 font-bold transition-colors ${activeTab === 'posts' ? 'border-b-4 border-blue-500 text-black dark:text-white' : 'text-twitter-secondary hover:bg-twitter-hover'}`}
        >
          المنشورات
        </button>
        <button 
          onClick={() => setActiveTab('replies')}
          className={`flex-1 py-4 font-bold transition-colors ${activeTab === 'replies' ? 'border-b-4 border-blue-500 text-black dark:text-white' : 'text-twitter-secondary hover:bg-twitter-hover'}`}
        >
          الردود
        </button>
        <button 
          onClick={() => setActiveTab('media')}
          className={`flex-1 py-4 font-bold transition-colors ${activeTab === 'media' ? 'border-b-4 border-blue-500 text-black dark:text-white' : 'text-twitter-secondary hover:bg-twitter-hover'}`}
        >
          الوسائط
        </button>
        <button 
          onClick={() => setActiveTab('likes')}
          className={`flex-1 py-4 font-bold transition-colors ${activeTab === 'likes' ? 'border-b-4 border-blue-500 text-black dark:text-white' : 'text-twitter-secondary hover:bg-twitter-hover'}`}
        >
          الإعجابات
        </button>
      </div>

      <div className="divide-y divide-twitter">
        {loading ? (
          <div className="flex justify-center p-8">
            <Twitter className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center p-12 space-y-4">
            <h2 className="text-2xl font-bold">لا توجد نتائج</h2>
            <p className="text-twitter-secondary">يبدو أن هذا القسم فارغ حالياً.</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id + (post.replyTimestamp ? post.replyTimestamp.seconds : '')}>
              {activeTab === 'replies' && post.replyContent && (
                <div className="px-16 pt-2 text-twitter-secondary text-sm flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  <span>رد على هذا المنشور: "{post.replyContent}"</span>
                </div>
              )}
              <Post post={post as PostType} currentUser={currentUser} />
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-black w-full max-w-lg rounded-2xl overflow-hidden"
            >
              <div className="p-4 flex items-center justify-between border-b border-twitter">
                <div className="flex items-center gap-6">
                  <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-twitter-hover rounded-full transition-colors">
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <h2 className="text-xl font-bold">تعديل الملف الشخصي</h2>
                </div>
                <button
                  onClick={handleUpdate}
                  className="bg-blue-500 text-white font-bold px-6 py-2 rounded-full hover:bg-blue-600 transition-colors"
                >
                  حفظ
                </button>
              </div>
              
              <div className="p-4 space-y-6">
                <div className="relative group cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="header-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 800000) {
                          alert('حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 800 كيلوبايت.');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => setEditData({ ...editData, headerURL: reader.result as string });
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label htmlFor="header-upload" className="cursor-pointer">
                    <img src={editData.headerURL} alt="" className="w-full h-32 object-cover rounded-lg opacity-80" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                  </label>
                </div>

                <div className="relative -mt-12 group cursor-pointer w-24 h-24">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="photo-upload"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 800000) {
                          alert('حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 800 كيلوبايت.');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => setEditData({ ...editData, photoURL: reader.result as string });
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <img src={editData.photoURL} alt="" className="w-full h-full rounded-full border-4 border-white dark:border-black bg-white dark:bg-black opacity-80" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </label>
                </div>

                <div className="space-y-4">
                  <div className="border border-twitter rounded p-2 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                    <label className="block text-xs text-twitter-secondary">الاسم</label>
                    <input
                      type="text"
                      value={editData.displayName}
                      onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                      className="w-full bg-transparent outline-none text-lg"
                    />
                  </div>
                  <div className="border border-twitter rounded p-2 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                    <label className="block text-xs text-twitter-secondary">نبذة تعريفية</label>
                    <textarea
                      value={editData.bio}
                      onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                      className="w-full bg-transparent outline-none text-lg resize-none h-24"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
