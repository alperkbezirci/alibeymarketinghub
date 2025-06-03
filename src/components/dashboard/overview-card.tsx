// src/components/dashboard/overview-card.tsx
import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from '@/lib/utils';

interface OverviewItem {
  id: string;
  name: string;
  detail?: string;
  [key: string]: any; // Allow other properties like projectId
}
interface OverviewCardProps {
  title: string;
  IconComponent: LucideIcon;
  items: OverviewItem[];
  emptyMessage?: string;
  getItemHref?: (item: OverviewItem) => string | undefined;
}

export function OverviewCard({ title, IconComponent, items, emptyMessage = "Gösterilecek öğe bulunmamaktadır.", getItemHref }: OverviewCardProps) {
  return (
    <Card className="shadow-lg h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-headline">{title}</CardTitle>
        <IconComponent className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex-grow">
        {items.length > 0 ? (
          <ul className="space-y-1">
            {items.map((item) => {
              const href = getItemHref ? getItemHref(item) : undefined;
              const content = (
                <>
                  <p className="font-medium group-hover:underline">{item.name}</p>
                  {item.detail && <p className="text-xs text-muted-foreground">{item.detail}</p>}
                </>
              );

              return (
                <li key={item.id}>
                  {href ? (
                    <Link href={href} className="block p-2 border-b last:border-b-0 hover:bg-muted/50 rounded-md transition-colors group">
                      {content}
                    </Link>
                  ) : (
                    <div className="p-2 border-b last:border-b-0">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">{emptyMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}
