import { useState } from 'react';
import { useNavigate } from 'react-router';
import { searchProducts } from '@/shared/api';
import { SearchBox } from '@/shared/components';
import { useAsync, useLocale, useSession } from '@/shared/hooks';
import { fillText } from '@/shared/utils';
import { productPathFor } from '../navigation';

// The product search in the top bar: by name, brand, SKU or barcode.
export const ProductSearch = () => {
  const { text } = useLocale();
  const { session } = useSession();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const state = useAsync(() => searchProducts(query), [query]);
  const hits = state.status === 'success' ? state.data : [];
  if (!session || !productPathFor(session, { productId: '', name: '', brandName: '', detail: '' })) return null;

  return (
    <SearchBox
      label={text.shell.search}
      placeholder={text.shell.searchPlaceholder}
      value={query}
      onChange={setQuery}
      loading={state.status === 'loading' && query.trim() !== ''}
      emptyText={state.status === 'error' ? text.states.error.message : fillText(text.shell.noProducts, { query })}
      items={hits.map((hit) => ({ key: `${hit.productId}-${hit.variantId ?? ''}`, label: hit.name, detail: hit.detail, image: hit.photo, imageName: hit.name }))}
      onSelect={(item) => {
        const hit = hits.find((current) => `${current.productId}-${current.variantId ?? ''}` === item.key);
        const path = hit && productPathFor(session, hit);
        setQuery('');
        if (path) navigate(path);
      }}
    />
  );
};
