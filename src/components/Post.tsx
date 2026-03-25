import React, { useState, useEffect } from 'react';
import { db, doc, getDoc, updateDoc, increment, deleteDoc, setDoc, addDoc, serverTimestamp, collection, query, orderBy, onSnapshot, User } from '../firebase';
import { Heart, MessageCircle, Repeat, Share, Trash2, BarChart2, Twitter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export interface PostType {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  imageURL?: string;
  timestamp: any;
  likesCount: number;
  repostsCount: number;
  commentsCount: number;
  viewsCount: number;
}

interface PostProps {
  post: PostType;
  currentUser: User;
}

const Post: React.FC<PostProps> = ({ post, currentUser }) => {
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    const incrementViews = async () => {
      try {
        const postRef = doc(db, 'posts', post.id);
        await updateDoc(postRef, { viewsCount: increment(1) });
      } catch (error) {
        console.error('Error incrementing views:', error);
      }
    };
    incrementViews();
  }, [post.id]);

  useEffect(() => {
    const checkLike = async () => {
      const likeRef = doc(db, 'likes', `${currentUser.uid}_${post.id}`);
      const likeSnap = await getDoc(likeRef);
      setLiked(likeSnap.exists());
    };
    const checkRepost = async () => {
      const repostRef = doc(db, 'reposts', `${currentUser.uid}_${post.id}`);
      const repostSnap = await getDoc(repostRef);
      setReposted(repostSnap.exists());
    };
    checkLike();
    checkRepost();
  }, [post.id, currentUser.uid]);

  useEffect(() => {
    if (!showComments) return;
    setLoadingComments(true);
    const q = query(collection(db, 'posts', post.id, 'comments'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingComments(false);
    });
    return unsubscribe;
  }, [showComments, post.id]);

  const handleLike = async () => {
    const likeRef = doc(db, 'likes', `${currentUser.uid}_${post.id}`);
    const postRef = doc(db, 'posts', post.id);

    try {
      if (liked) {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likesCount: increment(-1) });
        setLiked(false);
      } else {
        await setDoc(likeRef, { userId: currentUser.uid, postId: post.id });
        await updateDoc(postRef, { likesCount: increment(1) });
        setLiked(true);
        if (post.authorId !== currentUser.uid) {
          await addDoc(collection(db, 'notifications'), {
            toId: post.authorId,
            fromId: currentUser.uid,
            fromName: currentUser.displayName,
            fromPhoto: currentUser.photoURL,
            type: 'like',
            postId: post.id,
            timestamp: serverTimestamp(),
          });
        }
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleRepost = async () => {
    const repostRef = doc(db, 'reposts', `${currentUser.uid}_${post.id}`);
    const postRef = doc(db, 'posts', post.id);

    try {
      if (reposted) {
        await deleteDoc(repostRef);
        await updateDoc(postRef, { repostsCount: increment(-1) });
        setReposted(false);
      } else {
        await setDoc(repostRef, { userId: currentUser.uid, postId: post.id });
        await updateDoc(postRef, { repostsCount: increment(1) });
        setReposted(true);
        if (post.authorId !== currentUser.uid) {
          await addDoc(collection(db, 'notifications'), {
            toId: post.authorId,
            fromId: currentUser.uid,
            fromName: currentUser.displayName,
            fromPhoto: currentUser.photoURL,
            type: 'repost',
            postId: post.id,
            timestamp: serverTimestamp(),
          });
        }
      }
    } catch (error) {
      console.error('Error reposting:', error);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      await addDoc(collection(db, 'posts', post.id, 'comments'), {
        authorId: currentUser.uid,
        authorName: currentUser.displayName,
        authorPhoto: currentUser.photoURL,
        content: commentText.trim(),
        timestamp: serverTimestamp(),
      });
      await updateDoc(doc(db, 'posts', post.id), { commentsCount: increment(1) });
      setCommentText('');
      if (post.authorId !== currentUser.uid) {
        await addDoc(collection(db, 'notifications'), {
          toId: post.authorId,
          fromId: currentUser.uid,
          fromName: currentUser.displayName,
          fromPhoto: currentUser.photoURL,
          type: 'comment',
          postId: post.id,
          timestamp: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error commenting:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('هل أنت متأكد من حذف هذا المنشور؟')) {
      try {
        await deleteDoc(doc(db, 'posts', post.id));
      } catch (error) {
        console.error('Error deleting post:', error);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 border-b border-twitter hover:bg-twitter-hover transition-colors cursor-pointer flex gap-4"
    >
      <Link to={`/profile/${post.authorId}`} onClick={(e) => e.stopPropagation()}>
        <img src={post.authorPhoto || ''} alt="" className="w-12 h-12 rounded-full hover:opacity-90 transition-opacity" />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1 min-w-0">
            <Link to={`/profile/${post.authorId}`} className="font-bold hover:underline truncate" onClick={(e) => e.stopPropagation()}>
              {post.authorName}
            </Link>
            <span className="text-twitter-secondary truncate">@{post.authorId.slice(0, 8)}</span>
            <span className="text-twitter-secondary">·</span>
            <span className="text-twitter-secondary text-sm">
              {post.timestamp?.toDate ? formatDistanceToNow(post.timestamp.toDate(), { addSuffix: true, locale: ar }) : 'الآن'}
            </span>
          </div>
          {post.authorId === currentUser.uid && (
            <button 
              onClick={(e) => { e.stopPropagation(); handleDelete(); }} 
              className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-[15px] leading-normal mb-3 whitespace-pre-wrap">{post.content}</p>
        {post.imageURL && (
          <div className="mb-3 rounded-2xl overflow-hidden border border-twitter">
            <img src={post.imageURL} alt="" className="w-full h-auto max-h-[512px] object-cover" />
          </div>
        )}
        <div className="flex items-center justify-between text-twitter-secondary max-w-md">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }}
            className={`flex items-center gap-2 group hover:text-blue-500 transition-colors ${showComments ? 'text-blue-500' : ''}`}
          >
            <div className="p-2 group-hover:bg-blue-50 rounded-full transition-colors"><MessageCircle className="w-5 h-5" /></div>
            <span className="text-sm">{post.commentsCount || 0}</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleRepost(); }}
            className={`flex items-center gap-2 group hover:text-green-500 transition-colors ${reposted ? 'text-green-500' : ''}`}
          >
            <div className={`p-2 group-hover:bg-green-50 rounded-full transition-colors`}><Repeat className="w-5 h-5" /></div>
            <span className="text-sm">{post.repostsCount || 0}</span>
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleLike(); }}
            className={`flex items-center gap-2 group hover:text-pink-500 transition-colors ${liked ? 'text-pink-500' : ''}`}
          >
            <div className={`p-2 group-hover:bg-pink-50 rounded-full transition-colors`}><Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} /></div>
            <span className="text-sm">{post.likesCount || 0}</span>
          </button>
          <div className="flex items-center gap-2 group hover:text-blue-500 transition-colors">
            <div className="p-2 group-hover:bg-blue-50 rounded-full transition-colors"><BarChart2 className="w-5 h-5" /></div>
            <span className="text-sm">{post.viewsCount || 0}</span>
          </div>
          <button className="flex items-center gap-2 group hover:text-blue-500 transition-colors">
            <div className="p-2 group-hover:bg-blue-50 rounded-full transition-colors"><Share className="w-5 h-5" /></div>
          </button>
        </div>

        {showComments && (
          <div className="mt-4 space-y-4 border-t border-twitter pt-4" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleComment} className="flex gap-2">
              <img src={currentUser.photoURL || ''} alt="" className="w-8 h-8 rounded-full" />
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="غرد بردك"
                className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-1 outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                disabled={!commentText.trim()}
                className="bg-blue-500 text-white font-bold px-4 py-1 rounded-full hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                رد
              </button>
            </form>
            
            <div className="space-y-4">
              {loadingComments ? (
                <div className="flex justify-center p-4">
                  <Twitter className="w-5 h-5 text-blue-500 animate-spin" />
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <img src={comment.authorPhoto} alt="" className="w-8 h-8 rounded-full" />
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-sm">{comment.authorName}</span>
                        <span className="text-twitter-secondary text-xs">·</span>
                        <span className="text-twitter-secondary text-xs">
                          {comment.timestamp?.toDate ? formatDistanceToNow(comment.timestamp.toDate(), { addSuffix: true, locale: ar }) : 'الآن'}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Post;
