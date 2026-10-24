import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StatusType =
  | 'published'
  | 'draft'
  | 'upcoming'
  | 'active'
  | 'completed'
  | 'easy'
  | 'medium'
  | 'hard'
  | 'valid'
  | 'error'
  | 'warning';

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className }) => {
  const norm = status.toLowerCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';

  if (['published', 'completed', 'easy', 'valid', 'active'].includes(norm)) {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
  } else if (['medium', 'upcoming', 'warning', 'needs_correction'].includes(norm)) {
    styles = 'bg-amber-50 text-amber-700 border-amber-200/80';
  } else if (['hard', 'error', 'failed', 'destructive'].includes(norm)) {
    styles = 'bg-rose-50 text-rose-700 border-rose-200/80';
  } else if (['draft', 'pending'].includes(norm)) {
    styles = 'bg-slate-100 text-slate-700 border-slate-200';
  }

  const display = label || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <Badge
      variant="outline"
      className={cn('text-[11px] font-medium px-2 py-0.5 rounded-md border capitalize', styles, className)}
    >
      {display}
    </Badge>
  );
};
