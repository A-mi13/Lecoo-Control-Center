import { useTranslation } from 'react-i18next';
import { PagePlaceholder } from '@/components/PagePlaceholder';

export default function LedRing() {
  const { t } = useTranslation();
  return <PagePlaceholder title={t('nav.led')} />;
}
