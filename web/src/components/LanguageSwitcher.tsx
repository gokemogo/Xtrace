'use client';

import { useLanguage } from '@/src/contexts/LanguageContext';
import { locales, localeFlags, localeNames } from '@/src/i18n/config';
import { Button } from '@/src/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();

  const handleLanguageChange = (newLocale: string) => {
    setLocale(newLocale as any);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <span className="sr-only">{t('languages.en') === 'English' ? 'Switch language' : '切换语言'}</span>
          <div className="flex items-center gap-1">
            <span className="text-base">{localeFlags[locale]}</span>
            <ChevronDownIcon className="h-3 w-3" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleLanguageChange(loc)}
            className={`cursor-pointer ${
              loc === locale ? 'bg-accent text-accent-foreground' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{localeFlags[loc]}</span>
              <span>{localeNames[loc]}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}