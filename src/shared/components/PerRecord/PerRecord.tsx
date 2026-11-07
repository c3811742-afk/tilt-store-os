import { useParams } from 'react-router';
import type { PerRecordProps } from './PerRecord.types';

// A page about one record starts fresh for each record (a different brand, product or transfer), so nothing
// from the previous one stays on screen while the new one loads.
export const PerRecord = ({ children }: PerRecordProps) => {
  const params = useParams();
  return <div key={JSON.stringify(params)}>{children}</div>;
};
