import type { ReactNode } from 'react';

import { Card, CardContent } from '../../components/ui/card';

type NotificationStatCard = {
  label: string;
  value: number;
  valueClassName: string;
  cardClassName: string;
  iconContainerClassName: string;
  icon: ReactNode;
};

type NotificationStatsCardsProps = {
  columnsClassName: string;
  stats: NotificationStatCard[];
};

export function NotificationStatsCards({ columnsClassName, stats }: NotificationStatsCardsProps) {
  return (
    <div className={columnsClassName}>
      {stats.map((stat) => (
        <Card key={stat.label} className={stat.cardClassName}>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                <p className={`text-[24px] font-bold mt-1 ${stat.valueClassName}`}>{stat.value}</p>
              </div>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${stat.iconContainerClassName}`}>
                {stat.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
