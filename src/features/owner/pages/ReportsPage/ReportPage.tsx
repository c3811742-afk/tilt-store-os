import { Navigate, useParams } from 'react-router';
import { reportIds, type ReportId } from '@/shared/api';
import { routes, withQuery } from '@/shared/constants';
import { viewForReport } from '../../constants/analysis';

// An older report address (/owner/reports/brands, kept in alerts and bookmarks) opens the analysis in that view.
export const ReportPage = () => {
  const { reportId = '' } = useParams();
  const known = (reportIds as readonly string[]).includes(reportId);
  return <Navigate replace to={known ? withQuery(routes.owner.reports, { view: viewForReport[reportId as ReportId] ?? reportId }) : routes.owner.reports} />;
};
