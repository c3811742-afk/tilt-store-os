import { useEffect, useState } from 'react';
import { onDataChange } from '@/shared/api';

// A number that goes up whenever data changes anywhere (a checkout in any branch, an edit in another tab of the app).
// Put it in a useAsync's deps to reload the data live.
export const useLiveVersion = () => {
  const [version, setVersion] = useState(0);
  useEffect(() => onDataChange(() => setVersion((current) => current + 1)), []);
  return version;
};
