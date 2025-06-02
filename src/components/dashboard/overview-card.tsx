// src/components/dashboard/overview-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface OverviewCardProps {
  title: string;
  IconComponent: LucideIcon;
  items: { id: string; name: string; detail?: string }[];
  emptyMessage?: string;
}

export function OverviewCard({ title, IconComponent, items, emptyMessage = "Gösterilecek öğe bulunmamaktadır." }: OverviewCardProps) {
  return (
    <Card className="shadow-lg h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-headline">{title}</CardTitle>
        <IconComponent className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="text-sm p-2 border-b last:border-b-0 hover:bg-muted/50 rounded-md transition-colors">
                <p className="font-medium">{item.name}</p>
                {item.detail && <p className="text-xs text-muted-foreground">{item.detail}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}
