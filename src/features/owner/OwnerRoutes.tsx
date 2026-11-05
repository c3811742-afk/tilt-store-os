import { Route, Routes } from 'react-router';
import { routes } from '@/shared/constants';
import { NotFoundPage } from '@/features/common/pages/NotFoundPage';
import { OwnerLayout } from './layout/OwnerLayout';
import { DashboardPage } from './pages/DashboardPage';
import { MorningPage } from './pages/MorningPage';
import { BrandsPage } from './pages/BrandsPage';
import { BrandPage, NewBrandPage } from './pages/BrandPage';
import { ProductsPage } from './pages/ProductsPage';
import { NewProductPage, ProductPage } from './pages/ProductPage';
import { ImportProductsPage } from './pages/ImportProductsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { BranchesPage, BranchPage } from './pages/BranchesPage';
import { CurrenciesPage } from './pages/CurrenciesPage';
import { TaxPage } from './pages/TaxPage';
import { RolesPage, StaffMemberPage, StaffPage } from './pages/StaffPage';
import { PromotionPage, PromotionsPage } from './pages/PromotionsPage';
import { BatchPage, CostingPage } from './pages/CostingPage';
import { DefectsPage } from './pages/DefectsPage';
import { ItemHistoryPage, StockPage } from './pages/StockPage';
import { TransfersPage } from './pages/TransfersPage';
import { BrandPayoutsPage, PayoutsPage, StatementPage } from './pages/PayoutsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { ReportPage, ReportsPage } from './pages/ReportsPage';
import { PoliciesPage } from './pages/PoliciesPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ActivityPage } from './pages/ActivityPage';
import { CustomerPage, CustomersPage } from './pages/CustomersPage';
import { SettingsPage } from './pages/SettingsPage';

// The owner's pages. Paths come from routes.owner; they're matched relative to /owner.
const relative = (path: string) => path.replace(`${routes.owner.dashboard}/`, '');

export const OwnerRoutes = () => (
  <Routes>
    <Route element={<OwnerLayout />}>
      <Route index element={<DashboardPage />} />
      <Route path={relative(routes.owner.morning)} element={<MorningPage />} />
      <Route path={relative(routes.owner.brands)} element={<BrandsPage />} />
      <Route path={relative(routes.owner.newBrand)} element={<NewBrandPage />} />
      <Route path={relative(routes.owner.brand)} element={<BrandPage />} />
      <Route path={relative(routes.owner.products)} element={<ProductsPage />} />
      <Route path={relative(routes.owner.newProduct)} element={<NewProductPage />} />
      <Route path={relative(routes.owner.importProducts)} element={<ImportProductsPage />} />
      <Route path={relative(routes.owner.product)} element={<ProductPage />} />
      <Route path={relative(routes.owner.categories)} element={<CategoriesPage />} />
      <Route path={relative(routes.owner.branches)} element={<BranchesPage />} />
      <Route path={relative(routes.owner.newBranch)} element={<BranchPage />} />
      <Route path={relative(routes.owner.branch)} element={<BranchPage />} />
      <Route path={relative(routes.owner.currencies)} element={<CurrenciesPage />} />
      <Route path={relative(routes.owner.tax)} element={<TaxPage />} />
      <Route path={relative(routes.owner.staff)} element={<StaffPage />} />
      <Route path={relative(routes.owner.newStaff)} element={<StaffMemberPage />} />
      <Route path={relative(routes.owner.staffMember)} element={<StaffMemberPage />} />
      <Route path={relative(routes.owner.roles)} element={<RolesPage />} />
      <Route path={relative(routes.owner.promotions)} element={<PromotionsPage />} />
      <Route path={relative(routes.owner.newPromotion)} element={<PromotionPage />} />
      <Route path={relative(routes.owner.promotion)} element={<PromotionPage />} />
      <Route path={relative(routes.owner.costing)} element={<CostingPage />} />
      <Route path={relative(routes.owner.batch)} element={<BatchPage />} />
      <Route path={relative(routes.owner.defects)} element={<DefectsPage />} />
      <Route path={relative(routes.owner.stock)} element={<StockPage />} />
      <Route path={relative(routes.owner.itemHistory)} element={<ItemHistoryPage />} />
      <Route path={relative(routes.owner.transfers)} element={<TransfersPage />} />
      <Route path={relative(routes.owner.payouts)} element={<PayoutsPage />} />
      <Route path={relative(routes.owner.brandPayouts)} element={<BrandPayoutsPage />} />
      <Route path={relative(routes.owner.statement)} element={<StatementPage />} />
      <Route path={relative(routes.owner.expenses)} element={<ExpensesPage />} />
      <Route path={relative(routes.owner.reports)} element={<ReportsPage />} />
      <Route path={relative(routes.owner.report)} element={<ReportPage />} />
      <Route path={relative(routes.owner.policies)} element={<PoliciesPage />} />
      <Route path={relative(routes.owner.approvals)} element={<ApprovalsPage />} />
      <Route path={relative(routes.owner.notifications)} element={<NotificationsPage />} />
      <Route path={relative(routes.owner.activity)} element={<ActivityPage />} />
      <Route path={relative(routes.owner.customers)} element={<CustomersPage />} />
      <Route path={relative(routes.owner.customer)} element={<CustomerPage />} />
      <Route path={relative(routes.owner.settings)} element={<SettingsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);
