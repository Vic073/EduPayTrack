import { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

import { apiFetch } from '../../lib/api';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
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
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../../components/ui/select';
import { formatCurrency, formatDate } from '../../../lib/utils';

export function ReportsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => {
    Promise.all([
      apiFetch<any[]>('/admin/payments?status=ALL'),
      apiFetch<any[]>('/admin/students'),
    ])
      .then(([p, s]) => { setPayments(p); setStudents(s); })
      .catch(() => toast.error('Failed to load report data'))
      .finally(() => setLoading(false));
  }, []);

  const filteredPayments = useMemo(() => payments.filter(p => {
    if (dateRange === 'all') return true;
    const paymentDate = new Date(p.paymentDate || p.submittedAt);
    const now = new Date();
    if (dateRange === 'today') return paymentDate.toDateString() === now.toDateString();
    return true;
  }), [payments, dateRange]);

  const approvedPayments = useMemo(() => filteredPayments.filter(p => p.status === 'APPROVED'), [filteredPayments]);
  const totalCollected = useMemo(() => approvedPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0), [approvedPayments]);
  const totalOutstanding = useMemo(() => students.reduce((sum, s) => sum + Number(s.currentBalance || 0), 0), [students]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-[1200px]">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Financial Reports</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Collections, balances, and payment insights</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-9 gap-2" onClick={() => window.print()}>Print</Button>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px] h-9"><Calendar className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="overflow-hidden border-success/20 bg-gradient-to-br from-success/5 via-background to-background">
          <CardContent className="pt-5 pb-5 px-5 flex items-start justify-between gap-4">
            <div><p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground leading-none mb-4">Total Collected</p>
            <p className="text-[28px] font-bold text-success leading-none">{formatCurrency(totalCollected)}</p>
            <p className="mt-4 text-[12px] text-muted-foreground font-medium">{approvedPayments.length} approved payments</p></div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/15"><TrendingUp className="h-6 w-6 text-success" /></div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardContent className="pt-5 pb-5 px-5 flex items-start justify-between gap-4">
            <div><p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground leading-none mb-4">Outstanding</p>
            <p className="text-[28px] font-bold text-primary leading-none">{formatCurrency(totalOutstanding)}</p>
            <p className="mt-4 text-[12px] text-muted-foreground font-medium">{students.length} students tracked</p></div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15"><DollarSign className="h-6 w-6 text-primary" /></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b flex justify-between items-center"><h2 className="text-[15px] font-medium">Recent Approved Payments</h2></div>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Amount</TableHead><TableHead>Date</TableHead><TableHead>Reference</TableHead></TableRow></TableHeader>
            <TableBody>
              {approvedPayments.slice(0, 10).map(p => (
                <TableRow key={p.id}>
                  <TableCell className="text-[13px] font-medium">{p.student?.firstName} {p.student?.lastName}</TableCell>
                  <TableCell className="text-[13px] font-medium">{formatCurrency(p.amount)}</TableCell>
                  <TableCell className="text-[13px]">{formatDate(p.paymentDate || p.submittedAt)}</TableCell>
                  <TableCell className="text-[13px] text-muted-foreground font-mono">{p.externalReference || p.receiptNumber || 'N/A'}</TableCell>
                </TableRow>
              ))}
              {approvedPayments.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No data found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
