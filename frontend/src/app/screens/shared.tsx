import { useState } from 'react';
import { Bell, CheckCheck, Settings as SettingsIcon, User, Lock, Palette, Loader2, AlertTriangle, XCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

import { useAuth } from '../state/auth-context';
import { apiFetch } from '../lib/api';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';

/* ===== NOTIFICATIONS ===== */

export function NotificationsPage() {
  const { notifications, markAllRead } = useAuth();
  const unreadCount = notifications.filter(n => !n.read).length;

  const typeIcons: Record<string, any> = {
    fee_assigned: <FileText className="h-5 w-5 text-primary" />,
    payment_submitted: <CheckCheck className="h-5 w-5 text-info" />,
    payment_approved: <CheckCheck className="h-5 w-5 text-success" />,
    payment_rejected: <XCircle className="h-5 w-5 text-destructive" />,
    balance_reminder: <AlertTriangle className="h-5 w-5 text-warning" />,
    system: <Bell className="h-5 w-5 text-muted-foreground" />,
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[800px] animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notifications
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" className="gap-1.5 h-8 text-[12px]" onClick={markAllRead}>
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-[13px] text-muted-foreground">
              No notifications yet.
            </CardContent>
          </Card>
        ) : (
          notifications.map((n) => (
            <Card key={n.id} className={`transition-colors ${!n.read ? 'border-primary/20 bg-primary/[0.02]' : ''}`}>
              <CardContent className="py-3 px-4 flex items-start gap-3">
                <div className="mt-0.5">{typeIcons[n.type] || <Bell className="h-5 w-5 text-muted-foreground" />}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium">{n.title}</p>
                    {!n.read && (
                      <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{n.description}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{n.time}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

/* ===== SETTINGS ===== */

export function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Fill in both current and new password');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setChangingPassword(true);
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('WARNING: This will permanently delete your account and all associated data. Are you absolutely sure?')) return;
    try {
      await apiFetch('/auth/me', { method: 'DELETE' });
      toast.success('Account deleted successfully');
      window.location.href = '/login';
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete account');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[700px] animate-fade-in">
      <div>
        <h1 className="text-[20px] font-semibold tracking-tight text-foreground flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-primary" />
          Settings
        </h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Manage your account preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile" className="gap-1.5 text-[13px]">
            <User className="h-3.5 w-3.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 text-[13px]">
            <Lock className="h-3.5 w-3.5" /> Security
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-1.5 text-[13px]">
            <Palette className="h-3.5 w-3.5" /> Theme
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="text-[14px] font-medium">Profile Information</h3>

              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-bold">
                  {user?.avatar || 'U'}
                </div>
                <div>
                  <p className="text-[15px] font-medium">{user?.name || 'User'}</p>
                  <p className="text-[13px] text-muted-foreground">{user?.email}</p>
                  <Badge variant="outline" className="text-[11px] mt-1 capitalize">{user?.role}</Badge>
                </div>
              </div>

              {user?.role === 'student' && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                  <div>
                    <p className="text-[12px] text-muted-foreground uppercase tracking-wide">Student ID</p>
                    <p className="text-[14px] font-medium mt-0.5">{user?.studentId || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[12px] text-muted-foreground uppercase tracking-wide">Program</p>
                    <p className="text-[14px] font-medium mt-0.5">{user?.program || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[12px] text-muted-foreground uppercase tracking-wide">Academic Year</p>
                    <p className="text-[14px] font-medium mt-0.5">{user?.year || '—'}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="text-[14px] font-medium">Change Password</h3>
                <div className="space-y-3 max-w-sm">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium">Current Password</label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      className="h-10"
                      disabled={changingPassword}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium">New Password</label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="h-10"
                      placeholder="Minimum 8 characters"
                      disabled={changingPassword}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium">Confirm New Password</label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="h-10"
                      disabled={changingPassword}
                    />
                  </div>
                  <Button onClick={handlePasswordChange} disabled={changingPassword} className="h-9">
                    {changingPassword ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-1" />Changing...</>
                    ) : (
                      'Change Password'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {user?.role === 'student' && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-5 space-y-4 text-destructive">
                  <h3 className="text-[14px] font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Danger Zone
                  </h3>
                  <p className="text-[13px] text-destructive/80">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  <Button variant="destructive" onClick={handleDeleteAccount} className="h-9">
                    Delete Account
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="text-[14px] font-medium">Theme Preference</h3>
              <div className="grid grid-cols-3 gap-3 max-w-md">
                {(['light', 'dark', 'system'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`border rounded-lg p-3 text-center transition-all ${
                      theme === t
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-primary/30 hover:bg-muted/50'
                    }`}
                  >
                    <span className="text-xl">{t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '💻'}</span>
                    <p className="text-[12px] font-medium mt-1 capitalize">{t}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
