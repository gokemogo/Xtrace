'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { defaultLocale, type Locale, locales } from '@/src/i18n/config';

// Import messages as regular imports
import enMessages from '@/src/i18n/messages/en.json';
import zhMessages from '@/src/i18n/messages/zh.json';

// Use a flexible shape for messages to avoid strict TS coupling to the JSON shape
type Messages = Record<string, any>;

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  // t now supports optional interpolation params: t('key.path', { name: '张三' })
  t: (key: string, params?: Record<string, string | number | boolean>) => string;
  messages: Messages;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const messages: Record<Locale, Messages> = {
  en: enMessages,
  zh: zhMessages,
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  // Get the translation function with optional interpolation params.
  const t = (
    key: string,
    params?: Record<string, string | number | boolean>,
  ): string => {
    const keys = key.split('.');
    let value: any = messages[locale];

    for (const k of keys) {
      value = value?.[k];
    }

    if (value === undefined || value === null) return key;

    // If the resolved value is not a string, return its JSON representation
    if (typeof value !== 'string') {
      try {
        return JSON.stringify(value);
      } catch (e) {
        return String(value);
      }
    }

    // Simple interpolation: replace {{var}} with params[var]
    if (params && Object.keys(params).length > 0) {
      return value.replace(/\{\{\s*([^}\s]+)\s*\}\}/g, (_match, name) => {
        const v = params[name];
        return v === undefined || v === null ? `{{${name}}}` : String(v);
      });
    }

    return value;
  };

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('langfuse-locale', newLocale);
    }
  };

  useEffect(() => {
    // Load saved locale from localStorage only on client side
    if (typeof window !== 'undefined') {
      const savedLocale = localStorage.getItem('langfuse-locale') as Locale;
      if (savedLocale && locales.includes(savedLocale)) {
        setLocaleState(savedLocale);
      }
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, messages: messages[locale] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}