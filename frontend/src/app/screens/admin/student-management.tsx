import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  BellRing, 
  Loader2, 
  MoreHorizontal, 
  History, 
  Mail, 
  Eye, 
} from 'lucide-react';
import { toast } from 'sonner';

import { apiFetch } from '../../lib/api';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Skeleton } from '../../../components/ui/skeleton';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '../../../components/ui/table';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../../../components/ui/dropdown-menu';
import { formatCurrency } from '../../../lib/utils';
import { StudentPaymentHistoryDialog } from '../../components/admin/common/student-history-dialog';

export function StudentManagementPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sendingAlerts, setSendingAlerts] = useState(false);
  const [viewingStudentHistory, setViewingStudentHistory] = useState<any>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const result = await apiFetch<any[]>('/admin/students');
      setStudents(result);
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return students.filter(s => {
      const q = search.toLowerCase();
      if (!q) return true;
      return s.firstName?.toLowerCase().includes(q) 
          || s.lastName?.toLowerCase().includes(q) 
          || s.studentCode?.toLowerCase().includes(q) 
          || s.program?.toLowerCase().includes(q);
    });
  }, [students, search]);

  const handleNotifyReminders = async () => {
    setSendingAlerts(true);
    try {
      const result = await apiFetch<any>('/notifications/admin-send', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      toast.success(result.message || 'Reminders sent');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reminders');
    } finally {
      setSendingAlerts(false);
    }
  };

  const handleEmailRemainder = (s: any) => {
    if (s.user?.email) {
      const subject = 'Payment Reminder';
      const body = `Dear ${s.firstName},\n\n This is a reminder about your outstanding balance of ${formatCurrency(Number(s.currentBalance))}. Please make payment at your earliest convenience.\n\n Thank you.`;
      window.location.href = `mailto:${s.user.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      toast.success('Opening email client...');
    } else {
      toast.error('Student has no email address associated.');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-foreground">Student Management</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{students.length} student{students.length !== 1 ? 's' : ''} enrolled</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search students..." className="pl-9 h-9" value={search} onChange={(e: any) => setSearch(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={handleNotifyReminders} disabled={sendingAlerts}>
            {sendingAlerts ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
            Notify Unpaid
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 rounded" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="text-[13px] font-mono">{s.studentCode}</TableCell>
                    <TableCell 
                      className="text-[13px] font-medium cursor-pointer hover:text-primary hover:underline"
                      onClick={() => setViewingStudentHistory(s)}
                    >
                      {s.firstName} {s.lastName}
                    </TableCell>
                    <TableCell className="text-[13px]">{s.program}</TableCell>
                    <TableCell className="text-[13px]">{s.classLevel || s.academicYear || '—'}</TableCell>
                    <TableCell className="text-[13px] font-medium">
                      <span className={Number(s.currentBalance) > 0 ? 'text-warning' : 'text-success'}>
                         {formatCurrency(Number(s.currentBalance))}
                      </span>
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">{s.user?.email || '—'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[180px]">
                          <DropdownMenuItem onClick={() => setViewingStudentHistory(s)}><History className="h-4 w-4 mr-2" /> Payment History</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEmailRemainder(s)} disabled={!s.user?.email || s.currentBalance <= 0}><Mail className="h-4 w-4 mr-2" /> Send Reminder</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.info(`Viewing ${s.firstName} detail...`)}><Eye className="h-4 w-4 mr-2" /> View Details</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <StudentPaymentHistoryDialog student={viewingStudentHistory} open={!!viewingStudentHistory} onOpenChange={(open: boolean) => !open && setViewingStudentHistory(null)} />
    </div>
  );
}
