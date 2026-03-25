import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, limit, onSnapshot, addDoc, updateDoc, deleteDoc, Timestamp, serverTimestamp, increment, collectionGroup, writeBatch } from 'firebase/firestore';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
auth.useDeviceLanguage();
export const googleProvider = new GoogleAuthProvider();

// Auth helpers
export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const loginWithEmail = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);
export const loginWithUsername = async (username: string, pass: string) => {
  // البحث عن المستخدم بواسطة اسم المستخدم في Firestore
  const usersQuery = query(collection(db, 'users'), where('username', '==', username), limit(1));
  const snapshot = await getDocs(usersQuery);
  
  if (snapshot.empty) {
    throw new Error('auth/user-not-found');
  }
  
  const userDoc = snapshot.docs[0];
  const userData = userDoc.data();
  const userEmail = userData.email;
  
  if (!userEmail) {
    throw new Error('auth/invalid-email');
  }
  
  return signInWithEmailAndPassword(auth, userEmail, pass);
};

export const registerWithEmail = async (email: string, pass: string, name: string, username: string) => {
  // التحقق من أن اسم المستخدم غير مستخدم
  const usernameQuery = query(collection(db, 'users'), where('username', '==', username), limit(1));
  const usernameSnapshot = await getDocs(usernameQuery);
  
  if (!usernameSnapshot.empty) {
    throw new Error('auth/username-already-exists');
  }
  
  const res = await createUserWithEmailAndPassword(auth, email, pass);
  await updateProfile(res.user, { displayName: name });
  
  // إنشاء وثيقة المستخدم في Firestore مع اسم المستخدم
  const userRef = doc(db, 'users', res.user.uid);
  await setDoc(userRef, {
    uid: res.user.uid,
    email: email,
    displayName: name,
    username: username,
    photoURL: res.user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${res.user.uid}`,
    headerURL: 'https://picsum.photos/seed/header/1500/500',
    bio: 'أهلاً بك في تواصل عالمي!',
    followersCount: 0,
    followingCount: 0,
    createdAt: serverTimestamp(),
  });
  
  return res;
};

export const logout = () => signOut(auth);

export const hasPasswordProvider = () => !!auth.currentUser?.providerData.some(p => p.providerId === 'password');
export const changePassword = async (currentPassword: string, newPassword: string) => {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('USER_NOT_AUTHENTICATED');
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  await updatePassword(user, newPassword);
};
export const resetPassword = async (email: string) => {
  auth.languageCode = 'ar';
  const hasWindow = typeof window !== 'undefined' && window.location && window.location.origin;
  if (hasWindow) {
    try {
      const action = { url: `${window.location.origin}/`, handleCodeInApp: false as const };
      await sendPasswordResetEmail(auth, email, action);
      return;
    } catch (e: any) {
      const code: string = e?.code || '';
      if (code.includes('unauthorized-continue-uri') || code.includes('invalid-continue-uri') || code.includes('invalid-argument')) {
        // Fallback to default behavior without ActionCodeSettings
      } else {
        throw e;
      }
    }
  }
  await sendPasswordResetEmail(auth, email);
};

export const addNotification = async (toId: string, fromId: string, fromName: string, fromPhoto: string, type: 'like' | 'follow' | 'repost' | 'comment', postId?: string) => {
  await addDoc(collection(db, 'notifications'), {
    toId,
    fromId,
    fromName,
    fromPhoto,
    type,
    postId,
    timestamp: serverTimestamp(),
    read: false, // New field for read status
  });
};

// Error handling helper
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection
async function testConnection() {
  try {
    await getDoc(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

export { 
  collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, limit, onSnapshot, addDoc, updateDoc, deleteDoc, Timestamp, serverTimestamp, increment, onAuthStateChanged, collectionGroup, writeBatch
};
export type { User };
