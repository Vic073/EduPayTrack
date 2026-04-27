import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  CreditCard,
  FileBarChart2,
  History,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Shield,
  ShieldCheck,
  Upload,
  UserCog,
  Users,
} from 'lucide-react';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const studentNav: NavItem[] = [
  { label: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
  { label: 'Upload Payment', href: '/student/upload-payment', icon: Upload },
  { label: 'Payment History', href: '/student/payment-history', icon: CreditCard },
  { label: 'Messages', href: '/messages', icon: MessageSquare },
  { label: 'Notifications', href: '/student/notifications', icon: Bell },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Verify Payments', href: '/admin/verify-payments', icon: ShieldCheck },
  { label: 'Reminder Campaigns', href: '/admin/reminder-campaigns', icon: CalendarClock },
  { label: 'Reconciliation', href: '/admin/reconciliation-history', icon: History },
  { label: 'Exceptions', href: '/admin/reconciliation-exceptions', icon: AlertTriangle },
  { label: 'Students', href: '/admin/students', icon: Users },
  { label: 'Fee Structure', href: '/admin/fee-structure', icon: BriefcaseBusiness },
  { label: 'Users', href: '/admin/users', icon: UserCog },
  { label: 'Reports', href: '/admin/reports', icon: FileBarChart2 },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: Shield },
  { label: 'Messages', href: '/messages', icon: MessageSquare },
  { label: 'Notifications', href: '/admin/notifications', icon: Bell },
  { label: 'Settings', href: '/settings', icon: Settings },
];
