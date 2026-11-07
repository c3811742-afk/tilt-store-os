import { Route, Routes } from 'react-router';
import { routes } from '@/shared/constants';
import { NotFoundPage } from '@/features/common/pages/NotFoundPage';
import { OverviewPage } from './pages/OverviewPage';
import { SalesPage } from './pages/SalesPage';
import { StockPage } from './pages/StockPage';
import { ReturnsPage } from './pages/ReturnsPage';
import { PromotionsPage } from './pages/PromotionsPage';

// The brand portal's pages, matched relative to /brand.
const relative = (path: string) => path.replace(`${routes.brand.home}/`, '');

export const BrandRoutes = () => (
  <Routes>
    <Route index element={<OverviewPage />} />
    <Route path={relative(routes.brand.sales)} element={<SalesPage />} />
    <Route path={relative(routes.brand.stock)} element={<StockPage />} />
    <Route path={relative(routes.brand.returns)} element={<ReturnsPage />} />
    <Route path={relative(routes.brand.promotions)} element={<PromotionsPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
