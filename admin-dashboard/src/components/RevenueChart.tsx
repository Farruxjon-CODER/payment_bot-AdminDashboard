"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RevenueData = {
  date: string;
  amount: number;
};

export function RevenueChart({ data }: { data: RevenueData[] }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Moliyaviy tushumlar dinamikasi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-87.5 w-full flex items-center justify-center text-muted-foreground animate-pulse bg-muted/20 rounded-md">
            Yuklanmoqda...
          </div>
        </CardContent>
      </Card>
    );
  }

  // A custom tooltip formatter to display UZS correctly
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-md p-3">
          <p className="font-medium mb-1 dark:text-slate-200">{label}</p>
          <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
            {new Intl.NumberFormat("uz-UZ").format(payload[0].value)} UZS
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Moliyaviy tushumlar dinamikasi</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-87.5 w-full flex items-center justify-center text-muted-foreground border rounded-md">
            Hozircha ma'lumot yo'q.
          </div>
        ) : (
          <div className="h-87.5 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 10, right: 30, left: 30, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.4} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#888888", fontSize: 12 }}
                  tickMargin={10}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#888888", fontSize: 12 }}
                  tickFormatter={(value) =>
                    `${(value / 1000000).toFixed(1)}M`
                  }
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorAmount)"
                  activeDot={{ r: 6, strokeWidth: 0, fill: "#10b981" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
