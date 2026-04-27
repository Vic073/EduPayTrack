export type Role = 'student' | 'admin' | 'accounts';

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  studentId?: string;
  program?: string;
  year?: string;
  avatar: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  group: 'Today' | 'This Week' | 'Earlier';
  type: string;
  read: boolean;
};
