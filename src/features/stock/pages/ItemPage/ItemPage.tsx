import { useState } from 'react';
import { useParams } from 'react-router';
import { BranchItemHistory, Notice } from '@/shared/components';
import { routes } from '@/shared/constants';
import { useLocale } from '@/shared/hooks';
import { ItemActions, type ItemMessage } from './ItemActions';

// One item in the storekeeper's branch: where its pieces are, other branches and online, its full history, and the
// storekeeper's actions on it. What an action did (e.g. a write-off sent for approval) shows under the header.
export const ItemPage = () => {
  const { variantId = '' } = useParams();
  const { text } = useLocale();
  const [message, setMessage] = useState<ItemMessage | null>(null);
  return (
    <BranchItemHistory
      variantId={variantId}
      back={{ to: routes.storekeeper.stock, label: text.storekeeper.stock.title }}
      actions={(data) => <ItemActions data={data} onMessage={setMessage} />}
      notice={message && <Notice tone={message.tone}>{message.text}</Notice>}
    />
  );
};
