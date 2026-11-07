import { Route, Routes } from 'react-router';
import { routes } from '@/shared/constants';
import { NotFoundPage } from '@/features/common/pages/NotFoundPage';
import { DataPage } from './pages/DataPage';
import { ErrorsPage } from './pages/ErrorsPage';
import { BackupsPage } from './pages/BackupsPage';

// The IT admin's pages, matched relative to /it. Every owner screen is open to them too (under /owner).
const relative = (path: string) => path.replace(`${routes.it.data}/`, '');

export const ItRoutes = () => (
  <Routes>
    <Route index element={<DataPage />} />
    <Route path={relative(routes.it.errors)} element={<ErrorsPage />} />
    <Route path={relative(routes.it.backups)} element={<BackupsPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
