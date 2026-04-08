import { useState, useEffect } from 'react';
import { Receipt } from 'lucide-react';
import { toast } from 'sonner';

import { apiFetch } from '../../../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent } from '../../../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../../components/ui/table';
import { Skeleton } from '../../../../components/ui/skeleton';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { PaymentStatusBadge } from './payment-helpers';
import { PaymentDialog, Payment } from '../../payment-dialog';

interface Student {
  id: string;
  name: string;
  email?: string;
  studentId?: string;
  program?: string;
}

interface StudentPaymentHistoryDialogProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentPaymentHistoryDialog({ 
  student, 
  open, 
  onOpenChange 
}: StudentPaymentHistoryDialogProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  useEffect(() => {
    if (open && student?.id) {
      loadPayments();
    }
  }, [open, student?.id]);

  const loadPayments = async () => {
    if (!student?.id) return;
    setLoading(true);
    try {
      const result = await apiFetch<Payment[]>(`/admin/students/${student.id}/payments`);
      setPayments(result || []);
    } catch {
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment History</DialogTitle>
          <DialogDescription>
            {student.name} • {student.studentId || 'No ID'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : payments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No payments found for this student.
              </CardContent>
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-[13px]">
                      {p.paymentDate ? formatDate(p.paymentDate) : formatDate(p.submittedAt)}
                    </TableCell>
                    <TableCell className="text-[13px] font-mono">
                      {p.receiptNumber || p.externalReference || '—'}
                    </TableCell>
                    <TableCell className="text-[13px]">
                      {p.method?.replace(/_/g, ' ') || '—'}
                    </TableCell>
                    <TableCell className="text-[13px] font-medium">
                      {formatCurrency(Number(p.amount))}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => setSelectedPayment(p)}
                      >
                        <Receipt className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Payment Details Dialog */}
          <PaymentDialog
            payment={selectedPayment}
            open={!!selectedPayment}
            onOpenChange={(open) => {
              if (!open) setSelectedPayment(null);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
