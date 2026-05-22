import { useTranslation } from 'react-i18next';
import { PagePlaceholder } from '@/components/PagePlaceholder';

export default function Power() {
  const { t } = useTranslation();
  return <PagePlaceholder title={t('nav.power')} />;
}
