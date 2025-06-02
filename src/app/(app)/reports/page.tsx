// src/app/(app)/reports/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, BarChart as BarChartIcon, PieChart } from "lucide-react";
import { BarChart, Bar, Line, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieSector } from 'recharts';

// Placeholder data for charts
const taskCompletionData = [
  { month: 'Ocak', completed: 12, overdue: 2 },
  { month: 'Şubat', completed: 18, overdue: 3 },
  { month: 'Mart', completed: 25, overdue: 1 },
  { month: 'Nisan', completed: 20, overdue: 4 },
  { month: 'Mayıs', completed: 30, overdue: 2 },
  { month: 'Haziran', completed: 22, overdue: 1 },
];

const projectStatusData = [
  { name: 'Devam Ediyor', value: 5 },
  { name: 'Tamamlandı', value: 12 },
  { name: 'Planlama', value: 3 },
  { name: 'Beklemede', value: 1 },
];
const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];


export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline font-bold">Raporlar</h1>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
             <LineChart className="mr-2 h-5 w-5 text-primary"/> Kişisel Performans Özeti
          </CardTitle>
          <CardDescription>Görev tamamlama ve proje katılım durumlarınız.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold mb-2">Aylık Görev Tamamlama Oranları</h3>
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
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Katıldığım Projelerin Durumu</h3>
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
                    <PieSector key={`cell-${index}`} fill={COLORS[index % COLORS.length]} name={entry.name}/>
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{fontSize: "12px"}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <p className="text-center text-muted-foreground">
        Bu alanda kendi performansınızla ilgili detaylı görseller ve istatistikler yer alacaktır.
      </p>
    </div>
  );
}
