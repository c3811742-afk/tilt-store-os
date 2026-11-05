import type { getProduct } from '@/shared/api';

export type ProductData = Awaited<ReturnType<typeof getProduct>>;
