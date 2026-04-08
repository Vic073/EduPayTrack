import { useState, useEffect } from 'react';
import { 
  Plus, 
  Pencil, 
  Trash2 
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
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '../../../components/ui/dialog';
import { formatCurrency } from '../../lib/utils';

export function FeeStructurePage() {
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [program, setProgram] = useState('');
  const [academicYear, setAcademicYear] = useState('');

  const loadFees = async () => {
    setLoading(true);
    try {
      const result = await apiFetch<any[]>('/admin/fee-structures');
      setFees(result || []);
    } catch {
      toast.error('Failed to load fee structures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFees(); }, []);

  const handleEditClick = (fee: any) => {
    setEditId(fee.id);
    setTitle(fee.title || '');
    setAmount(fee.amount?.toString() || '');
    setProgram(fee.program || '');
    setAcademicYear(fee.academicYear || '');
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!title || !amount) {
      toast.error('Title and amount are required');
      return;
    }
    setCreating(true);
    try {
      if (editId) {
        await apiFetch(`/admin/fee-structures/${editId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title,
            amount: Number(amount),
            program: program && program !== 'none' ? program : undefined,
            academicYear: academicYear && academicYear !== 'none' ? academicYear : undefined,
          }),
        });
        toast.success('Fee structure updated');
      } else {
        await apiFetch('/admin/fee-structures', {
          method: 'POST',
          body: JSON.stringify({
            title,
            amount: Number(amount),
            program: program && program !== 'none' ? program : undefined,
            academicYear: academicYear && academicYear !== 'none' ? academicYear : undefined,
          }),
        });
        toast.success('Fee structure created');
      }
      setShowCreate(false); setEditId(null); setTitle(''); setAmount(''); setProgram(''); setAcademicYear('');
      loadFees();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this fee structure? This will recalculate all student balances.')) return;
    try {
      await apiFetch(`/admin/fee-structures/${id}`, { method: 'DELETE' });
      toast.success('Fee structure deleted');
      loadFees();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1000px] animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-foreground">Fee Structure</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Manage tuition and fee schedules</p>
        </div>
        <Button size="sm" className="gap-1.5 h-8" onClick={() => { setEditId(null); setTitle(''); setAmount(''); setProgram(''); setAcademicYear(''); setShowCreate(true); }}>
          <Plus className="h-3.5 w-3.5" /> Add Fee
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead><TableHead>Program</TableHead><TableHead>Year</TableHead><TableHead>Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fees.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell className="text-[13px] font-medium">{f.title}</TableCell>
                    <TableCell className="text-[13px]">{f.program || 'All'}</TableCell>
                    <TableCell className="text-[13px]">{f.academicYear || f.classLevel || '—'}</TableCell>
                    <TableCell className="text-[13px] font-medium">{formatCurrency(Number(f.amount))}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEditClick(f)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(f.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {fees.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No fee structures defined</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Fee Structure' : 'Add Fee Structure'}</DialogTitle>
            <DialogDescription>
              Define the amount and criteria for this fee schedule.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div><label className="text-[13px] font-medium">Title *</label><Input value={title} onChange={(e: any) => setTitle(e.target.value)} placeholder="Semester 1 Tuition" className="h-10" /></div>
            <div><label className="text-[13px] font-medium">Amount (MWK) *</label><Input type="number" value={amount} onChange={(e: any) => setAmount(e.target.value)} placeholder="0" className="h-10" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[13px] font-medium">Program</label><Input value={program} onChange={(e: any) => setProgram(e.target.value)} placeholder="All Programs" className="h-10" /></div>
              <div><label className="text-[13px] font-medium">Year</label><Input value={academicYear} onChange={(e: any) => setAcademicYear(e.target.value)} placeholder="All Years" className="h-10" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={creating}>{creating ? 'Saving...' : 'Save Changes'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
