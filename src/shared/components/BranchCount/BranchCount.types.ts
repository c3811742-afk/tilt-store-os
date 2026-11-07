export interface BranchCountProps {
  countId: string;
  back?: { to: string; label: string }; // the list of counts
  canDecide?: boolean; // the branch manager may approve or reject it
}
