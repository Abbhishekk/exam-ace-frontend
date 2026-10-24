import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action
}) => {
  return (
    <div className="py-14 px-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 max-w-lg mx-auto my-6">
      <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3 shadow-inner">
        <Icon className="w-6 h-6 stroke-[1.5]" />
      </div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">{description}</p>
      {action && (
        <div className="mt-4">
          <Button size="sm" onClick={action.onClick} className="bg-primary hover:bg-primary/90">
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
};
