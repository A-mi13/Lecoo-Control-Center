import { useTranslation } from 'react-i18next';
import { PagePlaceholder } from '@/components/PagePlaceholder';

export default function Fans() {
  const { t } = useTranslation();
  return <PagePlaceholder title={t('nav.fans')} />;
}
