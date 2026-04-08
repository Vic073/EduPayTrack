import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Download,
  Link2,
  RotateCw,
  Search,
  Sparkles,
  Split,
} from 'lucide-react';
import { toast } from 'sonner';

import { apiFetch } from '../../lib/api';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import { Skeleton } from '../../../components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { formatCurrency, formatDate } from '../../../lib/utils';

export function ReconciliationExceptionsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadExceptions = async () => {
    setLoading(true);
    try {
      const result = await apiFetch<any>('/admin/reconciliation/exceptions');
      setData(result);
    } catch {
      toast.error('Failed to load reconciliation exceptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadExceptions();
  }, []);

  const filteredItems = useMemo(() => {
    const items = data?.items || [];
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item: any) =>
      item.reference?.toLowerCase().includes(query) ||
      item.payerName?.toLowerCase().includes(query) ||
      item.importFileName?.toLowerCase().includes(query) ||
      item.topSuggestion?.student?.studentCode?.toLowerCase().includes(query) ||
      `${item.topSuggestion?.student?.firstName || ''} ${item.topSuggestion?.student?.lastName || ''}`.toLowerCase().includes(query)
    );
  }, [data, search]);

  const exportExceptions = () => {
    const headers = [
      'Type',
      'Import File',
      'Row',
      'Reference',
      'Payer Name',
      'Amount',
      'Date',
      'Reason',
      'Top Suggestion Student',
      'Top Suggestion Score',
    ];

    const rows = (filteredItems || []).map((item: any) => [
      item.exceptionType,
      item.importFileName || '',
      item.rowNumber,
      item.reference || '',
      item.payerName || '',
      item.amount || 0,
      item.transactionDate ? formatDate(item.transactionDate) : '',
      item.reason || '',
      item.topSuggestion?.student
        ? `${item.topSuggestion.student.firstName} ${item.topSuggestion.student.lastName}`
        : '',
      item.topSuggestion?.score || '',
    ]);

    const csv = [headers.join(','), ...rows.map((row: any[]) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `reconciliation-exceptions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success('Exception queue exported');
  };

  const renderExceptionBadge = (type: string) => {
    if (type === 'NO_MATCH') {
      return <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">No Match</Badge>;
    }
    if (type === 'MULTIPLE_MATCHES') {
      return <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20">Multiple Matches</Badge>;
    }
    return <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">Near Auto-Approve</Badge>;
  };

  return (
    <div className="max-w-[1400px] animate-fade-in space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-foreground">Exception Queue</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Focus only on the imported statement rows that still need human judgment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => void loadExceptions()} disabled={loading}>
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-2" onClick={exportExceptions} disabled={!filteredItems.length}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-[420px] rounded-xl" />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Exceptions</p>
                <p className="mt-1 text-[22px] font-semibold">{data?.summary?.total || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">No Match</p>
                <p className="mt-1 text-[22px] font-semibold text-destructive">{data?.summary?.noMatch || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Multiple Matches</p>
                <p className="mt-1 text-[22px] font-semibold text-warning">{data?.summary?.multipleMatches || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Near Auto-Approve</p>
                <p className="mt-1 text-[22px] font-semibold text-primary">{data?.summary?.nearAutoApprove || 0}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="max-w-[640px]">
                  <p className="text-[13px] text-muted-foreground">
                    `No Match` means no pending payment candidate was found. `Multiple Matches` means several students look plausible. `Near Auto-Approve`
                    means the row was close to assisted approval but missed at least one safeguard.
                  </p>
                </div>
                <div className="relative min-w-[220px] flex-1 max-w-[320px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search exceptions..."
                    className="h-9 pl-9"
                    value={search}
                    onChange={(event: any) => setSearch(event.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Import</TableHead>
                      <TableHead>Statement Row</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Top Suggestion</TableHead>
                      <TableHead>Signals</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{renderExceptionBadge(item.exceptionType)}</TableCell>
                        <TableCell className="text-[12px]">
                          <p className="font-medium">{item.importFileName}</p>
                          <p className="text-muted-foreground">{new Date(item.importedAt).toLocaleString()}</p>
                        </TableCell>
                        <TableCell className="text-[12px]">
                          <p className="font-medium">Row {item.rowNumber}</p>
                          <p className="font-mono text-muted-foreground">{item.reference || 'N/A'}</p>
                          <p className="text-muted-foreground">{item.payerName || 'Unknown payer'}</p>
                          <p className="font-medium">{formatCurrency(Number(item.amount || 0))}</p>
                        </TableCell>
                        <TableCell className="text-[12px] text-muted-foreground">{item.reason}</TableCell>
                        <TableCell className="text-[12px]">
                          {item.topSuggestion ? (
                            <div>
                              <p className="font-medium">
                                {item.topSuggestion.student?.firstName} {item.topSuggestion.student?.lastName}
                              </p>
                              <p className="text-muted-foreground">{item.topSuggestion.student?.studentCode}</p>
                              <p className="text-muted-foreground">Score {item.topSuggestion.score}</p>
                            </div>
                          ) : (
                            'No suggestion'
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {item.exceptionType === 'NO_MATCH' && (
                              <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/20">
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                Manual lookup needed
                              </Badge>
                            )}
                            {item.exceptionType === 'MULTIPLE_MATCHES' && (
                              <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20">
                                <Split className="mr-1 h-3 w-3" />
                                Compare candidates
                              </Badge>
                            )}
                            {item.exceptionType === 'NEAR_AUTO_APPROVE' && (
                              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                <Sparkles className="mr-1 h-3 w-3" />
                                One safeguard missing
                              </Badge>
                            )}
                            {item.topSuggestion && (
                              <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">
                                <Link2 className="mr-1 h-3 w-3" />
                                {item.topSuggestion.reasons?.slice(0, 2).join(', ')}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredItems.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                          No exception rows matched your search.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
