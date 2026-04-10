import { useState, useMemo, useCallback } from 'react';
import {
  Bell,
  Search,
  Filter,
  Shield,
  User,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  FileText,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '../../state/auth-context';
import { clearAllNotifications, deleteNotification, markNotificationRead } from '../../lib/notifications-api';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../../components/ui/select';
import { useNotificationFilters } from '../../lib/notification-filters';
import { NotificationConfirmDialogs } from '../../components/notification-confirm-dialogs';
import { NotificationGroupList } from '../../components/notification-group-list';
import { NotificationPageHeader } from '../../components/notification-page-header';
import { NotificationStatsCards } from '../../components/notification-stats-cards';

// Admin-specific notification types
const notificationConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  // Payment related
  payment_submitted: { icon: CreditCard, color: 'text-info', bg: 'bg-info/10', label: 'Payment Submitted' },
  payment_approved: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', label: 'Payment Approved' },
  payment_rejected: { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'Payment Rejected' },
  payment_verified: { icon: Shield, color: 'text-success', bg: 'bg-success/10', label: 'Payment Verified' },
  payment_flagged: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10', label: 'Payment Flagged' },

  // User management
  user_created: { icon: User, color: 'text-success', bg: 'bg-success/10', label: 'User Created' },
  user_suspended: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10', label: 'User Suspended' },
  user_activated: { icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', label: 'User Activated' },
  user_deactivated: { icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted', label: 'User Deactivated' },
  staff_user_created: { icon: Users, color: 'text-primary', bg: 'bg-primary/10', label: 'Staff Created' },

  // System
  system_alert: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10', label: 'System Alert' },
  system_maintenance: { icon: Settings, color: 'text-primary', bg: 'bg-primary/10', label: 'Maintenance' },
  audit_alert: { icon: FileText, color: 'text-warning', bg: 'bg-warning/10', label: 'Audit Alert' },

  // Default
  default: { icon: Bell, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Notification' }
};

const getNotificationConfig = (type: string) => {
  return notificationConfig[type] || notificationConfig.default;
};

export function AdminNotificationsPage() {
  const { notifications, markAllRead, refreshNotifications } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  // Filter for admin-relevant notifications
  const adminNotifications = useMemo(() => {
    const adminTypes = [
      'payment_submitted', 'payment_approved', 'payment_rejected', 'payment_verified', 'payment_flagged',
      'user_created', 'user_suspended', 'user_activated', 'user_deactivated', 'staff_user_created',
      'system_alert', 'system_maintenance', 'audit_alert'
    ];
    return notifications.filter(n => adminTypes.includes(n.type) || !n.type);
  }, [notifications]);

  const matchesTypeFilter = useCallback((notification: any, currentTypeFilter: string) => {
    if (currentTypeFilter === 'all') return true;
    if (currentTypeFilter === 'payment') return !!notification.type?.includes('payment');
    if (currentTypeFilter === 'user') return !!notification.type?.includes('user');
    if (currentTypeFilter === 'system') {
      return !!notification.type?.includes('system') || !!notification.type?.includes('audit');
    }
    if (currentTypeFilter === 'action_required') return !notification.read;
    return true;
  }, []);

  const {
    unreadCount,
    readCount,
    groupedNotifications,
    hasNotifications,
    hasAnyNotifications,
  } = useNotificationFilters({
    notifications: adminNotifications,
    activeTab,
    typeFilter,
    searchQuery,
    matchesTypeFilter,
  });

  const handleMarkOneRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      await refreshNotifications();
      toast.success('Marked as read');
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
      await refreshNotifications();
      setDeletingId(null);
      toast.success('Notification deleted');
    } catch {
      toast.error('Failed to delete notification');
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotifications();
      await refreshNotifications();
      setShowClearAllConfirm(false);
      toast.success('All notifications cleared');
    } catch {
      toast.error('Failed to clear notifications');
    }
  };

  // Stats for admin notifications
  const stats = useMemo(() => {
    const pendingPayments = adminNotifications.filter(n => n.type === 'payment_submitted' && !n.read).length;
    const userAlerts = adminNotifications.filter(n => n.type?.includes('user') && !n.read).length;
    const systemAlerts = adminNotifications.filter(n => (n.type?.includes('system') || n.type?.includes('audit')) && !n.read).length;
    return { pendingPayments, userAlerts, systemAlerts, total: adminNotifications.length };
  }, [adminNotifications]);

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <NotificationPageHeader
        title="Admin Notifications"
        titleIcon={<Bell className="h-6 w-6 text-primary" />}
        subtitle={
          <>
            {stats.pendingPayments > 0 && (
              <span className="text-warning font-medium">{stats.pendingPayments} pending payments</span>
            )}
            {stats.pendingPayments === 0 && unreadCount === 0 && 'All caught up!'}
            {unreadCount > 0 && stats.pendingPayments === 0 && (
              <span className="text-primary font-medium">{unreadCount} unread</span>
            )}
            {readCount > 0 && ` • ${readCount} read`}
          </>
        }
        unreadCount={unreadCount}
        hasAnyNotifications={hasAnyNotifications}
        onMarkAllRead={markAllRead}
        onClearAll={() => setShowClearAllConfirm(true)}
      />

      <NotificationStatsCards
        columnsClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        stats={[
          {
            label: 'Total',
            value: stats.total,
            valueClassName: 'text-primary',
            cardClassName: 'overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background',
            iconContainerClassName: 'bg-primary/15',
            icon: <Bell className="h-5 w-5 text-primary" />,
          },
          {
            label: 'Pending Payments',
            value: stats.pendingPayments,
            valueClassName: 'text-warning',
            cardClassName: 'overflow-hidden border-warning/20 bg-gradient-to-br from-warning/5 via-background to-background',
            iconContainerClassName: 'bg-warning/15',
            icon: <CreditCard className="h-5 w-5 text-warning" />,
          },
          {
            label: 'User Alerts',
            value: stats.userAlerts,
            valueClassName: 'text-info',
            cardClassName: 'overflow-hidden border-info/20 bg-gradient-to-br from-info/5 via-background to-background',
            iconContainerClassName: 'bg-info/15',
            icon: <Users className="h-5 w-5 text-info" />,
          },
          {
            label: 'System Alerts',
            value: stats.systemAlerts,
            valueClassName: 'text-destructive',
            cardClassName: 'overflow-hidden border-destructive/20 bg-gradient-to-br from-destructive/5 via-background to-background',
            iconContainerClassName: 'bg-destructive/15',
            icon: <AlertTriangle className="h-5 w-5 text-destructive" />,
          },
        ]}
      />

      {/* Tabs & Filters */}
      <div className="space-y-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
            <TabsTrigger value="all" className="gap-2 text-[13px]">
              All
              <Badge variant="secondary" className="text-[10px] h-5">{adminNotifications.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="unread" className="gap-2 text-[13px]">
              Unread
              {unreadCount > 0 && (
                <Badge variant="default" className="text-[10px] h-5 bg-primary">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="read" className="gap-2 text-[13px]">
              Read
              {readCount > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5">{readCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px] h-9">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="payment">Payments</SelectItem>
              <SelectItem value="user">User Management</SelectItem>
              <SelectItem value="system">System & Audit</SelectItem>
              <SelectItem value="action_required">Action Required</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notifications List */}
      {!hasAnyNotifications ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Bell className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-[15px] font-medium text-muted-foreground">No notifications yet</p>
            <p className="text-[13px] text-muted-foreground/70 mt-1">
              Admin notifications will appear here
            </p>
          </CardContent>
        </Card>
      ) : !hasNotifications ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-[15px] font-medium text-muted-foreground">No matching notifications</p>
            <p className="text-[13px] text-muted-foreground/70 mt-1">
              Try adjusting your filters or search query
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setActiveTab('all');
                setTypeFilter('all');
                setSearchQuery('');
              }}
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <NotificationGroupList
            groupedNotifications={groupedNotifications}
            getNotificationConfig={getNotificationConfig}
            onMarkOneRead={handleMarkOneRead}
            onDelete={(id) => setDeletingId(id)}
            getCardClassName={(notification: any) => {
              const needsAction =
                !notification.read &&
                (notification.type === 'payment_submitted' ||
                  notification.type === 'user_suspended' ||
                  notification.type === 'system_alert');
              if (needsAction) return 'border-warning/40 bg-warning/[0.03]';
              return !notification.read ? 'border-primary/30 bg-primary/[0.03]' : 'border-border/50';
            }}
            renderTopBadges={(notification: any) => {
              const needsAction =
                !notification.read &&
                (notification.type === 'payment_submitted' ||
                  notification.type === 'user_suspended' ||
                  notification.type === 'system_alert');
              if (needsAction) {
                return (
                  <Badge variant="default" className="h-5 px-1.5 text-[10px] bg-warning text-warning-foreground">
                    Action Required
                  </Badge>
                );
              }
              if (!notification.read) {
                return (
                  <Badge variant="default" className="h-5 px-1.5 text-[10px] bg-primary">
                    New
                  </Badge>
                );
              }
              return null;
            }}
          />
        </div>
      )}

      <NotificationConfirmDialogs
        deletingId={deletingId}
        setDeletingId={setDeletingId}
        showClearAllConfirm={showClearAllConfirm}
        setShowClearAllConfirm={setShowClearAllConfirm}
        onDelete={handleDelete}
        onClearAll={handleClearAll}
      />
    </div>
  );
}
