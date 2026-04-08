import { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  RotateCw, 
  Search, 
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '../../../components/ui/dialog';

export function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<any>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const result = await apiFetch<any[]>('/admin/audit-logs?limit=250');
      setLogs(result);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filter !== 'all') {
        const action = log.action?.toLowerCase() || '';
        if (filter === 'payment' && !action.includes('payment')) return false;
        if (filter === 'user' && !action.includes('user')) return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!log.action?.toLowerCase().includes(query) && !log.actor?.role?.toLowerCase().includes(query)) return false;
      }
      return true;
    });
  }, [logs, filter, searchQuery]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1200px] animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6" /> Audit Logs
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Track system activities and changes</p>
        </div>
        <Button size="sm" variant="outline" onClick={loadLogs} disabled={loading}>
          <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search logs..." value={searchQuery} onChange={(e: any) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="payment">Payments</SelectItem>
            <SelectItem value="user">Users</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 rounded" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead><TableHead>Action</TableHead><TableHead>Actor</TableHead><TableHead>Target</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log: any, idx: number) => (
                  <TableRow key={idx} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLog(log)}>
                    <TableCell className="text-[12px] text-muted-foreground whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{log.action}</Badge></TableCell>
                    <TableCell className="text-[13px] font-medium">{log.actor?.role || 'Unknown'}</TableCell>
                    <TableCell className="text-[13px] text-muted-foreground truncate max-w-[150px]">{log.targetType}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Technical details and system metadata for this log entry.
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 py-2">
               <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-muted-foreground uppercase text-[10px]">Action</p><p className="font-bold">{selectedLog.action}</p></div>
                  <div><p className="text-muted-foreground uppercase text-[10px]">Time</p><p>{new Date(selectedLog.timestamp).toLocaleString()}</p></div>
               </div>
               <div className="pt-2 border-t">
                  <p className="text-muted-foreground uppercase text-[10px] mb-2">Details</p>
                  <pre className="bg-muted p-3 rounded text-[11px] overflow-auto max-h-[300px]">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
               </div>
            </div>
          )}
          <DialogFooter><Button onClick={() => setSelectedLog(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
