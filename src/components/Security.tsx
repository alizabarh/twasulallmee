import React, { useState, useMemo } from 'react';
import { Lock, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { changePassword, hasPasswordProvider } from '../firebase';
import { motion } from 'motion/react';

const Security = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const canChange = useMemo(() => hasPasswordProvider(), []);
  const isValid = useMemo(() => {
    return newPassword.length >= 6 && newPassword === confirmPassword && currentPassword.length > 0;
  }, [currentPassword, newPassword, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!isValid || !canChange) return;
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess('تم تحديث كلمة المرور بنجاح');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err?.message || 'حدث خطأ غير متوقع';
      setError(msg.includes('auth/wrong-password') ? 'كلمة المرور الحالية غير صحيحة' : msg.includes('auth/too-many-requests') ? 'محاولات كثيرة، حاول لاحقاً' : msg.includes('requires-recent-login') ? 'يرجى تسجيل الدخول مجدداً ثم إعادة المحاولة' : 'تعذر تحديث كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 max-w-2xl border-l border-twitter min-h-screen">
      <div className="sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-10 p-4 border-b border-twitter">
        <h1 className="text-xl font-bold">الأمان</h1>
      </div>
      <div className="p-6 space-y-6">
        {!canChange ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-1" />
            <div>
              <p className="font-bold">لا يمكن تعديل كلمة المرور</p>
              <p className="text-sm text-twitter-secondary">يبدو أن حسابك مسجل بمزوّد خارجي مثل Google. لتعيين كلمة مرور، اربط مزوّد البريد/كلمة المرور من إعدادات الحساب.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-900 p-6 rounded-2xl border border-twitter space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-5 h-5" />
              <h2 className="text-lg font-bold">تغيير كلمة المرور</h2>
            </div>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                placeholder="كلمة المرور الحالية"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-full py-3 pl-12 pr-4 focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <button
                type="button"
                aria-label="إظهار/إخفاء كلمة المرور"
                onClick={() => setShowCurrent(v => !v)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-twitter-secondary hover:opacity-80"
              >
                {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                placeholder="كلمة المرور الجديدة (6 أحرف على الأقل)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-full py-3 pl-12 pr-4 focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <button
                type="button"
                aria-label="إظهار/إخفاء كلمة المرور"
                onClick={() => setShowNew(v => !v)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-twitter-secondary hover:opacity-80"
              >
                {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="تأكيد كلمة المرور الجديدة"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-full py-3 pl-12 pr-4 focus:ring-1 focus:ring-blue-500 outline-none"
              />
              <button
                type="button"
                aria-label="إظهار/إخفاء كلمة المرور"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-twitter-secondary hover:opacity-80"
              >
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
            {success && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <Check className="w-4 h-4" />
                <span>{success}</span>
              </div>
            )}
            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={!isValid || loading}
              type="submit"
              className="bg-black dark:bg-white text-white dark:text-black font-bold px-6 py-3 rounded-full disabled:opacity-50"
            >
              {loading ? 'جارٍ التحديث...' : 'حفظ التغييرات'}
            </motion.button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Security;
