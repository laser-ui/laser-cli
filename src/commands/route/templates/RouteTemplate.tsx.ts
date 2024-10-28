export default `import { useTranslation } from 'react-i18next';

import { AppRouteHeader } from '../../../components';

import styles from './RouteTemplate.module.scss';

export default function RouteTemplate() {
  const { t } = useTranslation();

  return (
    <>
      <AppRouteHeader>
        <AppRouteHeader.Breadcrumb list={[]} />
        <AppRouteHeader.Header />
      </AppRouteHeader>
      <div className={styles['app-route-template']}></div>
    </>
  );
}
`;
