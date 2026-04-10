import { Card, CardContent } from '../../../components/ui/card';
import { formatCurrency } from '../../lib/utils';

type StatementImportSummaryCardsProps = {
  totalRows?: number;
  strongMatches?: number;
  possibleMatches?: number;
  noMatches?: number;
  totalAmount?: number;
  compact?: boolean;
};

export function StatementImportSummaryCards({
  totalRows = 0,
  strongMatches = 0,
  possibleMatches = 0,
  noMatches,
  totalAmount,
  compact = false,
}: StatementImportSummaryCardsProps) {
  const hasTotalAmount = totalAmount !== undefined;
  const useNoMatchesCard = !hasTotalAmount;
  const paddingClass = compact ? 'p-3' : 'p-4';

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Card>
        <CardContent className={paddingClass}>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Rows</p>
          <p className="mt-1 text-[20px] font-semibold">{totalRows}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className={paddingClass}>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Strong Matches</p>
          <p className="mt-1 text-[20px] font-semibold text-success">{strongMatches}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className={paddingClass}>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Possible Matches</p>
          <p className="mt-1 text-[20px] font-semibold text-warning">{possibleMatches}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className={paddingClass}>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {hasTotalAmount ? 'Total Amount' : 'No Matches'}
          </p>
          <p className="mt-1 text-[20px] font-semibold">
            {hasTotalAmount
              ? formatCurrency(Number(totalAmount || 0))
              : (useNoMatchesCard ? (noMatches || 0) : 0)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
