import type { TextShape } from '@/shared/types';
import { brand } from '../brand';
import type { en } from './en';

export const ar: TextShape<typeof en> = {
  meta: {
    title: `نظام المتجر | ${brand.name}`,
  },
  common: {
    switchLanguage: 'English',
    darkMode: 'الوضع الداكن',
    lightMode: 'الوضع الفاتح',
    loading: 'جارٍ التحميل…',
    tryAgain: 'حاول مرة أخرى',
    backToHome: 'العودة إلى الرئيسية',
  },
  states: {
    error: {
      title: 'حدث خطأ ما',
      message: 'تعذّر تحميل هذا المحتوى. يُرجى المحاولة مرة أخرى.',
    },
    empty: {
      title: 'لا يوجد شيء هنا بعد',
      message: 'لا يوجد ما يُعرض حاليًا.',
    },
    crash: {
      title: 'حدث خطأ ما',
      message: 'حدث خطأ غير متوقع. يُرجى المحاولة مرة أخرى أو العودة إلى الصفحة الرئيسية.',
    },
  },
  notFound: {
    title: 'الصفحة غير موجودة',
    message: 'الصفحة التي تبحث عنها غير موجودة أو تم نقلها.',
  },
  home: {
    title: 'نظام المتجر',
    subtitle: 'المبيعات والمخزون والمرتجعات وتسويات الماركات لكل الفروع.',
    cta: 'تسجيل الدخول',
  },
};
