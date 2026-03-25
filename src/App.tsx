import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { auth, onAuthStateChanged, User, loginWithGoogle, loginWithEmail, loginWithUsername, registerWithEmail, logout, db, doc, getDoc, setDoc, serverTimestamp, query, collection, limit, getDocs, updateDoc, deleteDoc, increment, where, resetPassword, onSnapshot } from './firebase';
import { Home, User as UserIcon, MessageCircle, Bell, Hash, Bookmark, MoreHorizontal, LogOut, Twitter, Search, Settings, Palette, Mail, Lock, UserPlus, Eye, EyeOff } from 'lucide-react';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { motion, AnimatePresence } from 'motion/react';

// Components
const Feed = lazy(() => import('./components/Feed'));
const Profile = lazy(() => import('./components/Profile'));
const Messages = lazy(() => import('./components/Messages'));
const SearchPage = lazy(() => import('./components/Search'));
const Notifications = lazy(() => import('./components/Notifications'));
const Display = lazy(() => import('./components/Display'));
const Friends = lazy(() => import('./components/Friends'));
import Security from './components/Security';

const Sidebar = ({ user }: { user: User }) => {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('toId', '==', user.uid),
      where('read', '==', false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadNotificationsCount(snapshot.size);
    });
    return unsubscribe;
  }, [user]);

  const navItems = [
    { icon: Home, label: 'الرئيسية', path: '/' },
    { icon: Search, label: 'إبحث', path: '/search' },
    { icon: Bell, label: 'التنبيهات', path: '/notifications', badge: unreadNotificationsCount },
    { icon: MessageCircle, label: 'الرسائل', path: '/messages' },
    { icon: UserPlus, label: 'الأصدقاء', path: '/friends' },
    { icon: UserIcon, label: 'الملف الشخصي', path: `/profile/${user.uid}` },
    { icon: Lock, label: 'الأمان', path: '/security' },
    { icon: Palette, label: 'المظهر', path: '/display' },
  ];

  return (
    <div className="flex flex-col h-screen sticky top-0 px-4 py-2 border-l border-twitter w-20 xl:w-64">
      <div className="p-3 hover:bg-blue-50 rounded-full w-fit transition-colors cursor-pointer mb-2">
        <Twitter className="w-8 h-8 text-blue-500 fill-current" />
      </div>
      
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-4 p-3 rounded-full hover:bg-twitter-hover transition-colors w-fit xl:w-full ${
              location.pathname === item.path ? 'font-bold' : ''
            }`}
          >
            <div className="relative">
              <item.icon className="w-7 h-7" />
              {item.badge && item.badge > 0 && (
                <span className="absolute top-0 right-0 -mt-1 -mr-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-black"></span>
              )}
            </div>
            <span className="hidden xl:block text-xl">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto mb-4">
        <button
          onClick={logout}
          className="flex items-center gap-4 p-3 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors w-fit xl:w-full"
        >
          <LogOut className="w-7 h-7" />
          <span className="hidden xl:block text-xl">خروج</span>
        </button>
        
        <div className="flex items-center gap-3 p-3 mt-4 rounded-full hover:bg-twitter-hover transition-colors cursor-pointer">
          <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="" className="w-10 h-10 rounded-full" />
          <div className="hidden xl:block flex-1 min-w-0">
            <p className="font-bold truncate">{user.displayName}</p>
            <p className="text-twitter-secondary truncate">@{user.email?.split('@')[0]}</p>
          </div>
          <MoreHorizontal className="hidden xl:block w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const RightSidebar = ({ currentUser }: { currentUser: User }) => {
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchUsers = async () => {
      const q = query(collection(db, 'users'), limit(5));
      const snapshot = await getDocs(q);
      const users = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() }))
        .filter(u => u.uid !== currentUser.uid);
      setSuggestedUsers(users);
    };

    const fetchFollowing = async () => {
      const q = query(collection(db, 'follows'), where('followerId', '==', currentUser.uid));
      const snapshot = await getDocs(q);
      setFollowingIds(new Set(snapshot.docs.map(doc => doc.data().followingId)));
    };

    fetchUsers();
    fetchFollowing();
  }, [currentUser.uid]);

  const handleFollow = async (targetUid: string) => {
    const isFollowing = followingIds.has(targetUid);
    const followRef = doc(db, 'follows', `${currentUser.uid}_${targetUid}`);
    const currentUserRef = doc(db, 'users', currentUser.uid);
    const targetUserRef = doc(db, 'users', targetUid);

    try {
      if (isFollowing) {
        await deleteDoc(followRef);
        await updateDoc(currentUserRef, { followingCount: increment(-1) });
        await updateDoc(targetUserRef, { followersCount: increment(-1) });
        setFollowingIds(prev => {
          const next = new Set(prev);
          next.delete(targetUid);
          return next;
        });
      } else {
        await setDoc(followRef, { followerId: currentUser.uid, followingId: targetUid });
        await updateDoc(currentUserRef, { followingCount: increment(1) });
        await updateDoc(targetUserRef, { followersCount: increment(1) });
        setFollowingIds(prev => new Set(prev).add(targetUid));
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  return (
    <div className="hidden lg:block w-80 xl:w-96 px-8 py-2 space-y-4">
      <div className="sticky top-2 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-3 w-5 h-5 text-twitter-secondary" />
          <input
            type="text"
            placeholder="بحث في تواصل عالمي"
            className="w-full bg-gray-100 dark:bg-gray-800 rounded-full py-3 pl-12 pr-4 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4">
          <h2 className="text-xl font-bold mb-4">من نتابع</h2>
          <div className="space-y-4">
            {suggestedUsers.map((user) => (
              <div key={user.uid} className="flex items-center gap-3 hover:bg-twitter-hover p-2 rounded-xl transition-colors">
                <Link to={`/profile/${user.uid}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="" className="w-10 h-10 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{user.displayName}</p>
                    <p className="text-twitter-secondary text-sm truncate">@{user.uid.slice(0, 8)}</p>
                  </div>
                </Link>
                <button 
                  onClick={() => handleFollow(user.uid)}
                  className={`px-4 py-1 rounded-full font-bold text-sm transition-colors ${
                    followingIds.has(user.uid) 
                      ? 'border border-twitter hover:bg-red-50 hover:text-red-500 hover:border-red-500' 
                      : 'bg-black dark:bg-white text-white dark:text-black hover:opacity-80'
                  }`}
                >
                  {followingIds.has(user.uid) ? 'إلغاء' : 'متابعة'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4">
          <h2 className="text-xl font-bold mb-4">ماذا يحدث</h2>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="hover:bg-twitter-hover cursor-pointer transition-colors">
                <p className="text-xs text-twitter-secondary">ترند في السعودية</p>
                <p className="font-bold">#تواصل_عالمي</p>
                <p className="text-xs text-twitter-secondary">1,234 منشور</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'username'>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [resetInfo, setResetInfo] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const authErrorMessage = (code: string, fallback?: string) => {
    if (!code && fallback) return fallback;
    if (code.includes('invalid-credential') || code.includes('wrong-password')) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
    if (code.includes('invalid-email')) return 'بريد إلكتروني غير صالح';
    if (code.includes('user-not-found')) return 'لا يوجد حساب مرتبط بهذا البريد';
    if (code.includes('user-disabled')) return 'تم تعطيل هذا الحساب';
    if (code.includes('too-many-requests')) return 'محاولات كثيرة، حاول لاحقاً';
    if (code.includes('network-request-failed')) return 'مشكلة اتصال بالشبكة، تحقق من الإنترنت';
    if (code.includes('popup-closed-by-user') || code.includes('cancelled-popup-request') || code.includes('popup-blocked')) return 'تم إغلاق نافذة تسجيل Google قبل الإتمام';
    if (code.includes('unauthorized-domain')) return 'النطاق الحالي غير مصرّح به في Firebase. أضف localhost و 127.0.0.1 إلى Authorized domains في إعدادات المصادقة';
    return fallback || 'تعذر تسجيل الدخول، حاول مرة أخرى';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetInfo('');
    setLoading(true);
    try {
      if (isRegistering) {
        await registerWithEmail(email, password, name, username);
      } else {
        if (loginMethod === 'email') {
          await loginWithEmail(email, password);
        } else {
          await loginWithUsername(username, password);
        }
      }
    } catch (err: any) {
      const errorCode = err.code;
      if (errorCode === 'auth/user-not-found') {
        setError('اسم المستخدم غير موجود');
      } else if (errorCode === 'auth/username-already-exists') {
        setError('اسم المستخدم موجود مسبقاً');
      } else if (errorCode === 'auth/wrong-password') {
        setError('كلمة المرور غير صحيحة');
      } else if (errorCode === 'auth/invalid-email') {
        setError('البريد الإلكتروني غير صالح');
      } else {
        const code: string = err?.code || '';
        setError(authErrorMessage(code, err?.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) return;
    setError('');
    setResetInfo('');
    setResetLoading(true);
    try {
      await resetPassword(email);
      setResetInfo('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك. إذا لم تجده، تحقق من مجلد الرسائل غير المرغوب فيها.');
      setCooldown(60);
    } catch (err: any) {
      const code: string = err?.code || '';
      if (code.includes('invalid-email')) {
        setError('بريد إلكتروني غير صالح');
      } else if (code.includes('user-not-found')) {
        setError('لا يوجد حساب مرتبط بهذا البريد');
      } else if (code.includes('too-many-requests')) {
        setError('محاولات كثيرة، حاول لاحقاً');
      } else if (code.includes('operation-not-allowed')) {
        setError('تم تعطيل مزود البريد/كلمة المرور في إعدادات Firebase');
      } else if (code.includes('unauthorized-continue-uri') || code.includes('invalid-continue-uri')) {
        setError('النطاق غير مصرّح به لرابط المتابعة. أضف نطاق التطبيق إلى Authorized domains في Firebase');
      } else {
        setError('تعذر إرسال رسالة إعادة التعيين، تحقق من البريد وحاول مرة أخرى');
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      await loginWithGoogle();
    } catch (err: any) {
      const code: string = err?.code || '';
      setError(authErrorMessage(code, err?.message));
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row w-full">
      <div className="flex-1 bg-blue-500 flex items-center justify-center p-8">
        <Twitter className="w-64 h-64 text-white fill-current" />
      </div>
      <div className="flex-1 flex flex-col justify-center p-8 md:p-16 bg-white dark:bg-black">
        <Twitter className="w-12 h-12 text-blue-500 fill-current mb-8" />
        <h1 className="text-5xl md:text-7xl font-bold mb-12">يحدث الآن</h1>
        <h2 className="text-3xl font-bold mb-8">{isRegistering ? 'أنشئ حسابك' : 'انضم إلى تواصل عالمي اليوم.'}</h2>
        
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 mb-8">
          {isRegistering && (
            <div className="relative">
              <UserIcon className="absolute left-4 top-3 w-5 h-5 text-twitter-secondary" />
              <input
                type="text"
                placeholder="الاسم الكامل"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full py-3 pl-12 pr-4 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          )}
          
          {isRegistering && (
            <div className="relative">
              <UserIcon className="absolute left-4 top-3 w-5 h-5 text-twitter-secondary" />
              <input
                type="text"
                placeholder="اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full py-3 pl-12 pr-4 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          )}
          
          {!isRegistering && (
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setLoginMethod('email')}
                className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors ${
                  loginMethod === 'email'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                البريد الإلكتروني
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('username')}
                className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors ${
                  loginMethod === 'username'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                اسم المستخدم
              </button>
            </div>
          )}
          
          {!isRegistering && loginMethod === 'email' && (
            <div className="relative">
              <Mail className="absolute left-4 top-3 w-5 h-5 text-twitter-secondary" />
              <input
                type="email"
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full py-3 pl-12 pr-4 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          )}
          
          {!isRegistering && loginMethod === 'username' && (
            <div className="relative">
              <UserIcon className="absolute left-4 top-3 w-5 h-5 text-twitter-secondary" />
              <input
                type="text"
                placeholder="اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full py-3 pl-12 pr-4 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          )}
          <div className="relative">
            <Lock className="absolute left-4 top-3 w-5 h-5 text-twitter-secondary" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full py-3 pl-12 pr-12 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <button
              type="button"
              aria-label="إظهار/إخفاء كلمة المرور"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-4 top-3 text-twitter-secondary hover:opacity-80"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex justify-end px-2">
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={!email || resetLoading || cooldown > 0}
              className="text-blue-500 hover:underline text-sm disabled:opacity-50"
            >
              {cooldown > 0 ? `إعادة الإرسال خلال ${cooldown}ث` : 'نسيت كلمة المرور؟'}
            </button>
          </div>
          {!isOnline && <p className="text-red-500 text-sm px-4">لا يوجد اتصال بالإنترنت</p>}
          {error && <p className="text-red-500 text-sm px-4">{error}</p>}
          {resetInfo && <p className="text-green-600 text-sm px-4">{resetInfo}</p>}
          <button
            type="submit"
            disabled={loading || !isOnline}
            className="w-full bg-blue-500 text-white font-bold py-3 rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {loading ? 'جاري التحميل...' : (isRegistering ? 'إنشاء حساب' : 'تسجيل الدخول')}
          </button>
        </form>

        <div className="w-full max-w-sm space-y-4">
          <div className="flex items-center gap-4 text-twitter-secondary mb-4">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
            <span>أو</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={!isOnline}
            className="flex items-center justify-center gap-3 w-full border border-gray-300 dark:border-gray-700 rounded-full py-3 px-6 font-bold hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors mb-4 disabled:opacity-50"
          >
            <img src="https://www.google.com/favicon.ico" alt="" className="w-5 h-5" />
            التسجيل من خلال Google
          </button>

          <p className="text-twitter-secondary">
            {isRegistering ? 'لديك حساب بالفعل؟' : 'ليس لديك حساب؟'}
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-blue-500 hover:underline mr-2 font-bold"
            >
              {isRegistering ? 'تسجيل الدخول' : 'إنشاء حساب'}
            </button>
          </p>
        </div>

        <p className="text-xs text-twitter-secondary max-w-sm mt-12">
          بالتسجيل، أنت توافق على شروط الخدمة وسياسة الخصوصية، بما في ذلك استخدام ملفات تعريف الارتباط.
        </p>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Ensure user document exists
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: currentUser.uid,
            displayName: currentUser.displayName || 'مستخدم جديد',
            email: currentUser.email,
            photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.uid}`,
            headerURL: 'https://picsum.photos/seed/header/1500/500',
            bio: 'أهلاً بك في تواصل عالمي!',
            followersCount: 0,
            followingCount: 0,
            createdAt: serverTimestamp(),
          });
        }
      }
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Twitter className="w-12 h-12 text-blue-500 animate-pulse" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Router>
          <div className="min-h-screen flex justify-center max-w-7xl mx-auto" dir="rtl">
            {!user ? (
              <Login />
            ) : (
              <>
                <Sidebar user={user} />
                <main className="flex-1 border-l border-twitter max-w-2xl">
                  <AnimatePresence mode="wait">
                    <Suspense fallback={<div className="flex items-center justify-center p-12"><Twitter className="w-6 h-6 text-blue-500 animate-spin" /></div>}>
                      <Routes>
                        <Route path="/" element={<Feed user={user} />} />
                        <Route path="/search" element={<SearchPage currentUser={user} />} />
                        <Route path="/notifications" element={<Notifications currentUser={user} />} />
                        <Route path="/messages" element={<Messages currentUser={user} />} />
                        <Route path="/friends" element={<Friends currentUser={user} />} />
                        <Route path="/display" element={<Display />} />
                        <Route path="/security" element={<Security />} />
                        <Route path="/profile/:uid" element={<Profile currentUser={user} />} />
                        <Route path="*" element={<Navigate to="/" />} />
                      </Routes>
                    </Suspense>
                  </AnimatePresence>
                </main>
                <RightSidebar currentUser={user} />
              </>
            )}
          </div>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
