import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { View } from "react-native";

export type Language = "en" | "ar";

const LANGUAGE_KEY = "fixnow-language";

const translations: Record<string, string> = {
  "Home": "الرئيسية",
  "My jobs": "طلباتي",
  "Work": "العمل",
  "Profile": "الملف الشخصي",
  "Notifications": "الإشعارات",
  "LOCAL HOME SERVICES": "خدمات منزلية محلية",
  "A better fix": "حل أفضل",
  "starts here.": "يبدأ من هنا.",
  "Tell us what is wrong, choose a verified specialist, and follow every step until the job is done.": "أخبرنا بالمشكلة، اختر مختصًا موثوقًا، وتابع كل خطوة حتى إنجاز العمل.",
  "Start a service request": "ابدأ طلب خدمة",
  "Not sure who to call?": "مش متأكد مين تتصل فيه؟",
  "Get a safe, preliminary AI assessment in minutes.": "احصل على تقييم أولي آمن بالذكاء الاصطناعي خلال دقائق.",
  "Book a specialist": "احجز مع مختص",
  "What needs attention?": "شو اللي بحاجة لإصلاح؟",
  "Clear estimates before you choose.": "تقديرات واضحة قبل ما تختار.",
  "Loading local services…": "جاري تحميل الخدمات المحلية…",
  "Urgent home issue?": "عندك مشكلة منزلية طارئة؟",
  "For fire, sparking, gas smells, flooding, or immediate danger, move to safety and call emergency services.": "في حال وجود حريق أو شرر أو رائحة غاز أو فيضان أو خطر مباشر، ابتعد لمكان آمن واتصل بالطوارئ.",
  "Create emergency request": "إنشاء طلب طارئ",
  "HOW FIXNOW WORKS": "كيف يعمل FIXNOW",
  "Describe": "اوصف المشكلة",
  "Share what happened": "احكيلنا شو صار",
  "Choose": "اختار",
  "Compare local experts": "قارن بين المختصين المحليين",
  "Relax": "ارتاح",
  "Track from arrival to review": "تابع الخدمة من الوصول حتى التقييم",
  "Language": "اللغة",
  "العربية": "العربية",
  "English": "English",
  "Switch to Arabic": "تغيير للعربية",
  "Switch to English": "تغيير للإنجليزية",
  "Sign in": "تسجيل الدخول",
  "Sign out": "تسجيل الخروج",
  "Create an account": "إنشاء حساب",
  "Request": "طلب",
};

type LanguageContextValue = {
  language: Language;
  isArabic: boolean;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (value: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_KEY).then((stored) => {
      if (stored === "ar" || stored === "en") setLanguageState(stored);
    });
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    void AsyncStorage.setItem(LANGUAGE_KEY, next);
    if (typeof document !== "undefined") {
      document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = next;
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = language;
    }
  }, [language]);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "en" ? "ar" : "en");
  }, [language, setLanguage]);

  const t = useCallback(
    (value: string) => (language === "ar" ? translations[value] ?? value : value),
    [language],
  );

  const value = useMemo(
    () => ({ language, isArabic: language === "ar", setLanguage, toggleLanguage, t }),
    [language, setLanguage, toggleLanguage, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      <View style={{ flex: 1, direction: language === "ar" ? "rtl" : "ltr" }}>{children}</View>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
