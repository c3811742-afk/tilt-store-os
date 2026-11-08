import type { ReactNode } from 'react';
import type { DefectFoundAt } from '@/shared/types';

export interface BranchDefectsProps {
  title?: string; // the page title; the actions sit next to it, in the page header
  subtitle?: string;
  children?: ReactNode; // shown under the header, above the defects (e.g. returns waiting for inspection)
  foundAtOptions?: DefectFoundAt[]; // where a reported defect can have been found
  showLiability?: boolean; // record and show who carries the cost (storekeepers)
  showPhotos?: boolean; // allow photos when reporting (storekeepers)
}
