export type CountsTab = 'open' | 'pending' | 'done';

export interface BranchCountsProps {
  countPath?: (countId: string) => string; // each count opens this page
  allowBlind?: boolean; // offer blind counts (branch managers)
  initialTab?: CountsTab;
}
