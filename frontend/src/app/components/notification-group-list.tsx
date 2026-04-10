import { CheckCheck, Clock, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

type NotificationItem = {
  id: string;
  read?: boolean;
  title?: string;
  description?: string;
  time?: string;
  type?: string;
};

type NotificationConfig = {
  icon: any;
  color: string;
  bg: string;
  label: string;
};

type NotificationGroupListProps = {
  groupedNotifications: Record<string, NotificationItem[]>;
  getNotificationConfig: (type: string) => NotificationConfig;
  onMarkOneRead: (id: string) => void;
  onDelete: (id: string) => void;
  getCardClassName?: (notification: NotificationItem) => string;
  renderTopBadges?: (notification: NotificationItem) => ReactNode;
};

const GROUP_ORDER: Array<{ key: string; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'earlier', label: 'Earlier' },
];

export function NotificationGroupList({
  groupedNotifications,
  getNotificationConfig,
  onMarkOneRead,
  onDelete,
  getCardClassName,
  renderTopBadges,
}: NotificationGroupListProps) {
  return (
    <>
      {GROUP_ORDER.map((group) => {
        const notifications = groupedNotifications[group.key] || [];
        if (notifications.length === 0) return null;

        return (
          <div key={group.key} className="space-y-2">
            <h3 className="sticky top-0 z-10 bg-background/95 px-1 py-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
              {group.label} ({notifications.length})
            </h3>
            <div className="space-y-2">
              {notifications.map((notification) => {
                const config = getNotificationConfig(notification.type || '');
                const Icon = config.icon;
                const cardClassName = getCardClassName
                  ? getCardClassName(notification)
                  : !notification.read
                    ? 'border-primary/30 bg-primary/[0.03]'
                    : 'border-border/50';

                return (
                  <Card key={notification.id} className={`group transition-all hover:shadow-sm ${cardClassName}`}>
                    <CardContent className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className={`h-10 w-10 rounded-xl ${config.bg} flex flex-shrink-0 items-center justify-center`}>
                          <Icon className={`h-5 w-5 ${config.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className={`text-[13px] ${!notification.read ? 'font-semibold' : 'font-medium'}`}>
                                  {notification.title}
                                </p>
                                {renderTopBadges ? (
                                  renderTopBadges(notification)
                                ) : (
                                  !notification.read && (
                                    <Badge variant="default" className="h-5 px-1.5 text-[10px] bg-primary">
                                      New
                                    </Badge>
                                  )
                                )}
                              </div>
                              <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">
                                {notification.description}
                              </p>
                              <div className="mt-2 flex items-center gap-3">
                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {notification.time}
                                </span>
                                <Badge variant="outline" className={`h-5 text-[10px] ${config.color} border-current`}>
                                  {config.label}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => onMarkOneRead(notification.id)}
                                  title="Mark as read"
                                >
                                  <CheckCheck className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => onDelete(notification.id)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
