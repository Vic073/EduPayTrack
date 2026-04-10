import { CheckCheck, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '../../components/ui/button';

type NotificationPageHeaderProps = {
  title: string;
  subtitle: ReactNode;
  titleIcon: ReactNode;
  unreadCount: number;
  hasAnyNotifications: boolean;
  onMarkAllRead: () => void;
  onClearAll: () => void;
};

export function NotificationPageHeader({
  title,
  subtitle,
  titleIcon,
  unreadCount,
  hasAnyNotifications,
  onMarkAllRead,
  onClearAll,
}: NotificationPageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground flex items-center gap-2">
          {titleIcon}
          {title}
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2">
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={onMarkAllRead}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
        {hasAnyNotifications && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-9 text-destructive hover:text-destructive"
            onClick={onClearAll}
          >
            <Trash2 className="h-4 w-4" /> Clear all
          </Button>
        )}
      </div>
    </div>
  );
}
