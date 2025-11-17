import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

export default function LanguageSwitcher() {
  const router = useRouter();
  const { t } = useTranslation('common');
  const { locale, pathname, asPath, query } = router;

  const changeLanguage = (newLocale: string) => {
    router.push({ pathname, query }, asPath, { locale: newLocale });
  };

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="language" className="text-sm text-gray-700">
        {t('language')}:
      </label>
      <select
        id="language"
        value={locale}
        onChange={(e) => changeLanguage(e.target.value)}
        className="block px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="bg">{t('bulgarian')}</option>
        <option value="en">{t('english')}</option>
      </select>
    </div>
  );
}
