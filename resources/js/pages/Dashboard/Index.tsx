"use client";

import { useEffect, useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import AdminLayout from "@/layouts/AdminLayout";
import { routes } from "@/routes";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import {
  Building,
  Calendar as CalendarIcon,
  LayoutDashboard,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { endOfMonth, format, parseISO, startOfMonth, subMonths } from "date-fns";
import type { DateRange } from "react-day-picker";

type Kpi = {
  title: string;
  value: string;
  detail: string;
};

type ChartSeries = {
  name: string;
  data: number[];
};

type MonthlyData = {
  categories: string[];
  data: number[];
};

type NameValue = {
  name: string;
  value: number;
};

type RecentRow = {
  id: number;
  reference: string;
  customer: string;
  property?: string;
  amount: string;
  status: string;
  date: string;
};

type Section = {
  id: string;
  label: string;
};

type DashboardData = {
  dateRange: {
    from: string;
    to: string;
  };
  sections: Section[];
  overview: {
    kpis: Kpi[];
    revenueSeries: {
      categories: string[];
      series: ChartSeries[];
    };
  };
  pos: {
    kpis: Kpi[];
    monthlySales: MonthlyData;
    recentSales: RecentRow[];
  };
  shop: {
    kpis: Kpi[];
    monthlySales: MonthlyData;
    statusBreakdown: NameValue[];
    recentOrders: RecentRow[];
  };
  rentals: {
    kpis: Kpi[];
    monthlyCollections: MonthlyData;
    occupancy: NameValue[];
    recentPayments: RecentRow[];
  };
};

type PageProps = {
  dashboard: DashboardData;
};

const sectionIcons = {
  "1": LayoutDashboard,
  "12": ShoppingCart,
  "2": ShoppingBag,
  "4": Building,
} as const;

const normalizeMoney = (value: string) => value.replace(/^PHP\s*/i, "₱");

const formatDateButton = (range?: DateRange) => {
  if (!range?.from) {
    return "Select date range";
  }

  if (!range.to) {
    return format(range.from, "MMM dd, yyyy");
  }

  return `${format(range.from, "MMM dd, yyyy")} - ${format(range.to, "MMM dd, yyyy")}`;
};

export default function CompleteBusinessDashboard() {
  const { dashboard } = usePage<PageProps>().props;
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeDashboard, setActiveDashboard] = useState(dashboard.sections[0]?.id ?? "1");
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>({
    from: parseISO(dashboard.dateRange.from),
    to: parseISO(dashboard.dateRange.to),
  });

  useEffect(() => {
    setMounted(true);
    const update = () => setIsDark(document.documentElement.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!dashboard.sections.some((section) => section.id === activeDashboard)) {
      setActiveDashboard(dashboard.sections[0]?.id ?? "1");
    }
  }, [activeDashboard, dashboard.sections]);

  const colors = useMemo(
    () =>
      isDark
        ? {
            primary: "#22c55e",
            secondary: "#38bdf8",
            accent: "#f59e0b",
            muted: "#94a3b8",
            danger: "#f87171",
            grid: "rgba(148,163,184,0.22)",
          }
        : {
            primary: "#16a34a",
            secondary: "#0284c7",
            accent: "#d97706",
            muted: "#64748b",
            danger: "#dc2626",
            grid: "rgba(203,213,225,0.8)",
          },
    [isDark],
  );

  const baseOptions: ApexOptions = {
    chart: { fontFamily: "Inter, sans-serif", toolbar: { show: false } },
    dataLabels: { enabled: false },
    grid: { borderColor: colors.grid },
    legend: { labels: { colors: colors.muted }, position: "top" },
    tooltip: { theme: isDark ? "dark" : "light" },
    xaxis: { labels: { style: { colors: colors.muted } } },
    yaxis: { labels: { style: { colors: colors.muted } } },
  };

  const applyDateRange = () => {
    if (!tempDateRange?.from || !tempDateRange?.to) {
      return;
    }

    router.get(
      routes.dashboard(),
      {
        from: format(tempDateRange.from, "yyyy-MM-dd"),
        to: format(tempDateRange.to, "yyyy-MM-dd"),
      },
      {
        preserveScroll: true,
        preserveState: false,
      },
    );
  };

  const quickSetRange = (preset: string) => {
    const now = new Date();
    let from: Date;
    let to: Date;

    switch (preset) {
      case "lastMonth":
        from = startOfMonth(subMonths(now, 1));
        to = endOfMonth(subMonths(now, 1));
        break;
      case "last3Months":
        from = startOfMonth(subMonths(now, 3));
        to = endOfMonth(now);
        break;
      case "thisYear":
        from = new Date(now.getFullYear(), 0, 1);
        to = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        from = startOfMonth(now);
        to = endOfMonth(now);
    }

    setTempDateRange({ from, to });
  };

  const resetRange = () => router.get(routes.dashboard(), {}, { preserveScroll: true });

  if (!mounted) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-background" />
      </AdminLayout>
    );
  }

  const renderKpis = (items: Kpi[]) => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{item.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight">{normalizeMoney(item.value)}</div>
            <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderMonthlyChart = (title: string, monthly: MonthlyData, name: string, type: "bar" | "area" = "bar") => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ReactApexChart
            type={type}
            height="100%"
            series={[{ name, data: monthly.data }]}
            options={{
              ...baseOptions,
              chart: { ...baseOptions.chart, type },
              colors: [type === "area" ? colors.secondary : colors.primary],
              stroke: { curve: "smooth", width: type === "area" ? 3 : 0 },
              xaxis: { ...baseOptions.xaxis, categories: monthly.categories },
            }}
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderDonutChart = (title: string, items: NameValue[]) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ReactApexChart
            type="donut"
            height="100%"
            series={items.map((item) => item.value)}
            options={{
              ...baseOptions,
              labels: items.map((item) => item.name),
              colors: [colors.primary, colors.secondary, colors.accent, colors.danger],
            }}
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderRecent = (title: string, rows: RecentRow[]) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ReceiptText className="h-5 w-5 text-emerald-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border">
          <div className="grid grid-cols-[1.1fr_1.4fr_1fr_0.8fr] bg-muted px-4 py-2 text-xs font-medium uppercase text-muted-foreground">
            <span>Reference</span>
            <span>Name</span>
            <span>Amount</span>
            <span>Status</span>
          </div>
          {rows.length > 0 ? (
            rows.map((row) => (
              <div key={`${title}-${row.id}`} className="grid grid-cols-[1.1fr_1.4fr_1fr_0.8fr] items-center border-t px-4 py-3 text-sm">
                <div>
                  <div className="font-medium">{row.reference}</div>
                  <div className="text-xs text-muted-foreground">{row.date}</div>
                </div>
                <div>
                  <div>{row.customer}</div>
                  {row.property && <div className="text-xs text-muted-foreground">{row.property}</div>}
                </div>
                <div className="font-medium">{normalizeMoney(row.amount)}</div>
                <div className="text-muted-foreground">{row.status}</div>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">No records found for this date range.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      {renderKpis(dashboard.overview.kpis)}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ReactApexChart
              type="area"
              height="100%"
              series={dashboard.overview.revenueSeries.series}
              options={{
                ...baseOptions,
                chart: { ...baseOptions.chart, type: "area" },
                colors: [colors.primary, colors.secondary, colors.accent],
                stroke: { curve: "smooth", width: 3 },
                xaxis: { ...baseOptions.xaxis, categories: dashboard.overview.revenueSeries.categories },
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeDashboard) {
      case "12":
        return (
          <div className="space-y-6">
            {renderKpis(dashboard.pos.kpis)}
            {renderMonthlyChart("POS Sales", dashboard.pos.monthlySales, "POS Sales", "area")}
            {renderRecent("Recent POS Transactions", dashboard.pos.recentSales)}
          </div>
        );
      case "2":
        return (
          <div className="space-y-6">
            {renderKpis(dashboard.shop.kpis)}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {renderMonthlyChart("Shop Revenue", dashboard.shop.monthlySales, "Shop Revenue", "area")}
              {renderDonutChart("Order Status", dashboard.shop.statusBreakdown)}
            </div>
            {renderRecent("Recent Shop Orders", dashboard.shop.recentOrders)}
          </div>
        );
      case "4":
        return (
          <div className="space-y-6">
            {renderKpis(dashboard.rentals.kpis)}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {renderMonthlyChart("Rental Collections", dashboard.rentals.monthlyCollections, "Collections", "bar")}
              {renderDonutChart("Rental Occupancy", dashboard.rentals.occupancy)}
            </div>
            {renderRecent("Recent Rental Payments", dashboard.rentals.recentPayments)}
          </div>
        );
      default:
        return renderOverview();
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen space-y-8 bg-slate-50 p-6 dark:bg-slate-950 md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="mt-2 text-sm text-muted-foreground">Real-time overview for POS, Shop, and Rentals based on your access.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[280px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatDateButton(tempDateRange)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="flex flex-wrap gap-2 p-3">
                  {[
                    { label: "This Month", value: "thisMonth" },
                    { label: "Last Month", value: "lastMonth" },
                    { label: "Last 3 Months", value: "last3Months" },
                    { label: "This Year", value: "thisYear" },
                  ].map((preset) => (
                    <Button key={preset.value} type="button" variant="ghost" size="sm" onClick={() => quickSetRange(preset.value)}>
                      {preset.label}
                    </Button>
                  ))}
                </div>
                <Calendar mode="range" selected={tempDateRange} onSelect={setTempDateRange} numberOfMonths={2} />
                <div className="flex justify-end border-t p-3">
                  <Button type="button" onClick={applyDateRange}>
                    Apply Filter
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button type="button" variant="outline" onClick={resetRange}>
              Reset
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 rounded-lg border bg-background p-1.5">
          {dashboard.sections.map((section) => {
            const Icon = sectionIcons[section.id as keyof typeof sectionIcons] ?? LayoutDashboard;

            return (
              <Button
                key={section.id}
                type="button"
                variant={activeDashboard === section.id ? "default" : "ghost"}
                onClick={() => setActiveDashboard(section.id)}
                className={cn("gap-2 rounded-md", activeDashboard === section.id && "shadow-sm")}
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </Button>
            );
          })}
        </div>

        {dashboard.sections.length > 0 ? (
          renderContent()
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              You do not have dashboard modules assigned yet.
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
