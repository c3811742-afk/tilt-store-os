import type { ReactNode } from 'react';

export interface TimelineStep {
  key: string;
  label: ReactNode;
  detail?: ReactNode; // who and when
  state: 'done' | 'current' | 'upcoming' | 'stopped'; // stopped: rejected or cancelled here
}

export interface StatusTimelineProps {
  steps?: TimelineStep[];
  label?: string; // accessible name of the list
}
