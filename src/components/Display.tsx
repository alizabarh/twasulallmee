import React from 'react';
import { useTheme } from './ThemeContext';
import { Check, Sun, Moon, Coffee } from 'lucide-react';

const Display = () => {
  const { theme, setTheme } = useTheme();

  const themes = [
    { id: 'light', name: 'افتراضي', icon: Sun, bg: 'bg-white', text: 'text-black', border: 'border-gray-200' },
    { id: 'dim', name: 'خافت', icon: Coffee, bg: 'bg-[#15202b]', text: 'text-white', border: 'border-gray-700' },
    { id: 'dark', name: 'أضواء مطفأة', icon: Moon, bg: 'bg-black', text: 'text-white', border: 'border-gray-800' },
  ];

  return (
    <div className="flex-1 max-w-2xl border-l border-twitter min-h-screen">
      <div className="sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-10 p-4 border-b border-twitter">
        <h1 className="text-xl font-bold">المظهر</h1>
      </div>

      <div className="p-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">تخصيص عرضك</h2>
          <p className="text-twitter-secondary">إدارة الخلفية. يتم تطبيق هذه الإعدادات على جميع حساباتك في تواصل عالمي على هذا المتصفح.</p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-2xl border border-twitter">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white">
              <Check className="w-6 h-6" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold">تواصل عالمي</span>
                <span className="text-twitter-secondary">@GlobalConnect · الآن</span>
              </div>
              <p>في تواصل عالمي، يمكنك تخصيص مظهرك ليناسب ذوقك. اختر من بين السمات المختلفة المتاحة!</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-twitter-secondary text-sm px-2">الخلفية</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as any)}
                className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  theme === t.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-transparent'
                } ${t.bg} ${t.text} shadow-sm hover:opacity-90`}
              >
                <t.icon className="w-5 h-5" />
                <span className="font-bold">{t.name}</span>
                {theme === t.id && <Check className="w-5 h-5 text-blue-500 ml-auto" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Display;
