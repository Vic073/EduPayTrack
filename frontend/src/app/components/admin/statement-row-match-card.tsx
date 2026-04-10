import { CheckCircle2, Link2, RotateCw, Sparkles } from 'lucide-react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { formatCurrency } from '../../lib/utils';
import type { StatementImportRow, StatementSuggestion } from '../../lib/admin-payments-api';

type StatementRowMatchCardProps = {
  row: StatementImportRow;
  actionLoading?: string;
  onAssistApprove: (row: StatementImportRow, suggestion: StatementSuggestion) => void;
  onMatchPayment: (row: StatementImportRow, suggestion: StatementSuggestion) => void;
};

export function StatementRowMatchCard({
  row,
  actionLoading,
  onAssistApprove,
  onMatchPayment,
}: StatementRowMatchCardProps) {
  return (
    <div className="space-y-3 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={`text-[10px] ${
                row.matchState === 'STRONG_MATCH'
                  ? 'bg-success/10 text-success border-success/20'
                  : row.matchState === 'POSSIBLE_MATCH'
                    ? 'bg-warning/10 text-warning border-warning/20'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {row.matchState === 'STRONG_MATCH'
                ? 'Strong Match'
                : row.matchState === 'POSSIBLE_MATCH'
                  ? 'Possible Match'
                  : 'No Match'}
            </Badge>
            {row.resolvedPaymentId && (
              <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/20">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Reconciled
              </Badge>
            )}
            {row.autoApprovedPaymentId && (
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                <Sparkles className="mr-1 h-3 w-3" />
                Assisted Approval
              </Badge>
            )}
          </div>
          <p className="mt-2 text-[13px] font-medium">
            {row.payerName || 'Unknown payer'} {row.reference ? `• ${row.reference}` : ''}
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {formatCurrency(Number(row.amount || 0))}
            {row.transactionDate ? ` • ${new Date(row.transactionDate).toLocaleDateString()}` : ''}
            {row.description ? ` • ${row.description}` : ''}
          </p>
        </div>
      </div>

      {(row.suggestions?.length || 0) > 0 ? (
        <div className="space-y-2">
          {(row.suggestions || []).map((suggestion) => (
            <div key={suggestion.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3">
              <div>
                <p className="text-[13px] font-medium">
                  {suggestion.student?.firstName} {suggestion.student?.lastName}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {suggestion.student?.studentCode} • {suggestion.reference} • score {suggestion.score}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">{suggestion.reasons?.join(', ')}</p>
                {suggestion.canAutoApprove && (
                  <p className="mt-1 text-[11px] font-medium text-primary">Eligible for assisted approval</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestion.canAutoApprove && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                    disabled={!!row.resolvedPaymentId || actionLoading === suggestion.id}
                    onClick={() => onAssistApprove(row, suggestion)}
                  >
                    {actionLoading === suggestion.id ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Assist Approve
                  </Button>
                )}
                <Button
                  size="sm"
                  className="h-8 gap-1.5"
                  disabled={!!row.resolvedPaymentId || actionLoading === suggestion.id}
                  onClick={() => onMatchPayment(row, suggestion)}
                >
                  {actionLoading === suggestion.id ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                  Match Payment
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[12px] text-muted-foreground">No likely pending payment matches were found for this row.</p>
      )}
    </div>
  );
}
