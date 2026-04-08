import { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CalendarClock,
  PauseCircle,
  PlayCircle,
  RotateCw,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';

import { apiFetch } from '../../lib/api';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Skeleton } from '../../../components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { formatCurrency, formatDate } from '../../../lib/utils';

export function ReminderCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    scheduleType: 'DAILY',
    dayOfWeek: '1',
    sendHour: '8',
    sendMinute: '0',
    minBalance: '',
    maxBalance: '',
    titleTemplate: 'Fee Balance Reminder',
    messageTemplate: 'Hello {{firstName}}, you still have an outstanding balance of MK {{balance}}. Please clear it as soon as possible.',
  });

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const result = await apiFetch<any[]>('/notifications/campaigns');
      setCampaigns(result || []);
    } catch {
      toast.error('Failed to load reminder campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCampaigns();
  }, []);

  const metrics = useMemo(() => ({
    active: campaigns.filter((campaign) => campaign.status === 'ACTIVE').length,
    paused: campaigns.filter((campaign) => campaign.status === 'PAUSED').length,
    dueNow: campaigns.filter((campaign) => campaign.status === 'ACTIVE' && new Date(campaign.nextRunAt) <= new Date()).length,
  }), [campaigns]);

  const createCampaign = async () => {
    if (!form.name.trim()) {
      toast.error('Campaign name is required');
      return;
    }

    setActionLoading('create');
    try {
      await apiFetch('/notifications/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          scheduleType: form.scheduleType,
          dayOfWeek: form.scheduleType === 'WEEKLY' ? Number(form.dayOfWeek) : undefined,
          sendHour: Number(form.sendHour),
          sendMinute: Number(form.sendMinute),
          minBalance: form.minBalance ? Number(form.minBalance) : undefined,
          maxBalance: form.maxBalance ? Number(form.maxBalance) : undefined,
          titleTemplate: form.titleTemplate,
          messageTemplate: form.messageTemplate,
        }),
      });

      toast.success('Reminder campaign created');
      setForm((current) => ({ ...current, name: '', minBalance: '', maxBalance: '' }));
      await loadCampaigns();
    } catch (err: any) {
      toast.error(err.message || 'Could not create campaign');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleStatus = async (campaign: any) => {
    setActionLoading(campaign.id);
    try {
      await apiFetch(`/notifications/campaigns/${campaign.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' }),
      });
      toast.success(campaign.status === 'ACTIVE' ? 'Campaign paused' : 'Campaign activated');
      await loadCampaigns();
    } catch (err: any) {
      toast.error(err.message || 'Could not update campaign');
    } finally {
      setActionLoading(null);
    }
  };

  const runCampaign = async (campaignId: string) => {
    setActionLoading(campaignId);
    try {
      const result = await apiFetch<any>(`/notifications/campaigns/${campaignId}/run`, {
        method: 'POST',
      });
      toast.success(`Sent ${result.sentCount} reminders`);
      await loadCampaigns();
    } catch (err: any) {
      toast.error(err.message || 'Could not run campaign');
    } finally {
      setActionLoading(null);
    }
  };

  const runDueCampaigns = async () => {
    setActionLoading('run-due');
    try {
      const result = await apiFetch<any>('/notifications/campaigns/run-due', {
        method: 'POST',
      });
      toast.success(`Processed ${result.processed} due campaign${result.processed === 1 ? '' : 's'}`);
      await loadCampaigns();
    } catch (err: any) {
      toast.error(err.message || 'Could not run due campaigns');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-[1400px] animate-fade-in space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-foreground">Scheduled Reminders</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Save reminder campaigns, run them on schedule, and keep overdue balances from slipping through.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => void loadCampaigns()} disabled={loading}>
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" className="h-9 gap-2" onClick={runDueCampaigns} disabled={actionLoading === 'run-due'}>
            {actionLoading === 'run-due' ? <RotateCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Run Due Now
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Active Campaigns</p>
            <p className="mt-1 text-[24px] font-semibold text-success">{metrics.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Paused Campaigns</p>
            <p className="mt-1 text-[24px] font-semibold text-muted-foreground">{metrics.paused}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Due Right Now</p>
            <p className="mt-1 text-[24px] font-semibold text-warning">{metrics.dueNow}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-[14px] font-medium">Create Campaign</h2>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Campaign Name</label>
                <Input value={form.name} onChange={(event: any) => setForm((current) => ({ ...current, name: event.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">Schedule</label>
                  <Select value={form.scheduleType} onValueChange={(value) => setForm((current) => ({ ...current, scheduleType: value }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Daily</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">Day of Week</label>
                  <Select
                    value={form.dayOfWeek}
                    onValueChange={(value) => setForm((current) => ({ ...current, dayOfWeek: value }))}
                    disabled={form.scheduleType !== 'WEEKLY'}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sunday</SelectItem>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">Send Hour</label>
                  <Input type="number" min="0" max="23" value={form.sendHour} onChange={(event: any) => setForm((current) => ({ ...current, sendHour: event.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">Send Minute</label>
                  <Input type="number" min="0" max="59" value={form.sendMinute} onChange={(event: any) => setForm((current) => ({ ...current, sendMinute: event.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">Min Balance</label>
                  <Input type="number" value={form.minBalance} onChange={(event: any) => setForm((current) => ({ ...current, minBalance: event.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-muted-foreground">Max Balance</label>
                  <Input type="number" value={form.maxBalance} onChange={(event: any) => setForm((current) => ({ ...current, maxBalance: event.target.value }))} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Title Template</label>
                <Input value={form.titleTemplate} onChange={(event: any) => setForm((current) => ({ ...current, titleTemplate: event.target.value }))} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted-foreground">Message Template</label>
                <textarea
                  className="min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.messageTemplate}
                  onChange={(event) => setForm((current) => ({ ...current, messageTemplate: event.target.value }))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Use placeholders like <code>{'{{firstName}}'}</code>, <code>{'{{studentCode}}'}</code>, and <code>{'{{balance}}'}</code>.
                </p>
              </div>

              <Button className="w-full gap-2" onClick={createCampaign} disabled={actionLoading === 'create'}>
                {actionLoading === 'create' ? <RotateCw className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
                Save Campaign
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-[14px] font-medium">Saved Campaigns</h2>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => <Skeleton key={item} className="h-24 rounded-xl" />)}
              </div>
            ) : campaigns.length > 0 ? (
              <div className="space-y-3">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="rounded-xl border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[14px] font-semibold">{campaign.name}</h3>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              campaign.status === 'ACTIVE'
                                ? 'bg-success/10 text-success border-success/20'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {campaign.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[12px] text-muted-foreground">
                          {campaign.scheduleType === 'DAILY'
                            ? `Daily at ${String(campaign.sendHour).padStart(2, '0')}:${String(campaign.sendMinute).padStart(2, '0')}`
                            : `Weekly on day ${campaign.dayOfWeek} at ${String(campaign.sendHour).padStart(2, '0')}:${String(campaign.sendMinute).padStart(2, '0')}`}
                        </p>
                      </div>
                      <div className="text-right text-[12px] text-muted-foreground">
                        <p>Next run: {formatDate(campaign.nextRunAt)}</p>
                        <p>Last run: {campaign.lastRunAt ? formatDate(campaign.lastRunAt) : 'Never'}</p>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      <div className="rounded-lg bg-muted/20 p-3 text-[12px]">
                        <p className="text-muted-foreground">Balance Range</p>
                        <p className="font-medium">
                          {campaign.minBalance !== null ? formatCurrency(Number(campaign.minBalance)) : 'Any'}
                          {' '}to{' '}
                          {campaign.maxBalance !== null ? formatCurrency(Number(campaign.maxBalance)) : 'Any'}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/20 p-3 text-[12px]">
                        <p className="text-muted-foreground">Template Preview</p>
                        <p className="font-medium">{campaign.titleTemplate}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1.5"
                        onClick={() => toggleStatus(campaign)}
                        disabled={actionLoading === campaign.id}
                      >
                        {campaign.status === 'ACTIVE' ? <PauseCircle className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
                        {campaign.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => runCampaign(campaign.id)}
                        disabled={actionLoading === campaign.id}
                      >
                        {actionLoading === campaign.id ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        Run Now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground">No reminder campaigns yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
