// src/app/(app)/reports/page.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart as LucideLineChart, BarChart as BarChartIcon, PieChart as LucidePieChart } from "lucide-react";
import { BarChart, Bar, Line, Pie, PieChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

// TODO: Define proper types for chart data
// Data will be fetched and processed from Firebase
const taskCompletionData: any[] = [];
const projectStatusData: any[] = [];

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

// TODO: Add useEffect to fetch and process data from Firebase for these charts


export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-bold">Raporlar</h1>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
             <LucideLineChart className="mr-2 h-5 w-5 text-primary"/> Kişisel Performans Özeti
          </CardTitle>
          <CardDescription>Görev tamamlama ve proje katılım durumlarınız (veriler Firebase'den gelecek).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold mb-2">Aylık Görev Tamamlama Oranları</h3>
            {taskCompletionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={taskCompletionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12}/>
                  <Tooltip />
                  <Legend wrapperStyle={{fontSize: "12px"}} />
                  <Bar dataKey="completed" name="Tamamlanan Görevler" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="overdue" name="Geciken Görevler" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Görev tamamlama verisi bulunmamaktadır.</p>
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Katıldığım Projelerin Durumu</h3>
            {projectStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={projectStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    fontSize={12}
                  >
                    {projectStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{fontSize: "12px"}} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
               <p className="text-sm text-muted-foreground text-center py-8">Proje durum verisi bulunmamaktadır.</p>
            )}
          </div>
        </CardContent>
      </Card>
      <p className="text-center text-muted-foreground">
        Bu alanda kendi performansınızla ilgili detaylı görseller ve istatistikler yer alacaktır. Veriler Firebase'den yüklenecektir.
      </p>
    </div>
  );
}
