"use client";

import { usePage, useForm, Head, router } from "@inertiajs/react";
import AdminLayout from "@/layouts/AdminLayout";
import { useMemo, useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  SortingState,
  PaginationState,
  useReactTable,
  FilterFn,
  Row,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash2,
  Pencil,
  Plus,
  AlertTriangle,
  Search,
  X,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { route } from "ziggy-js";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Tenant {
  id: number;
  first_name: string;
  last_name: string;
  property_id: number;
  room_unit_id?: number;
  monthly_rent: string;
  property?: { id: number; name: string };
  room_unit?: { id: number; name: string };
}

interface Property {
  id: number;
  name: string;
  type: string;
}

interface Payment {
  id: number;
  tenant_id: number;
  property_id: number;
  room_unit_id?: number;
  billing_month?: string;
  monthly_rent_amount?: string;
  previous_balance?: string;
  amount: string;
  paid_amount: string;
  payment_date?: string;
  due_date: string;
  period_start: string;
  period_end: string;
  payment_method: string;
  reference_number?: string;
  status: string;
  notes?: string;
  tenant?: Tenant;
  property?: Property;
  received_by?: { id: number; fname: string; lname: string };
}

interface PageProps extends Record<string, unknown> {
  payments: Payment[];
  tenants: Tenant[];
  properties: Property[];
}

type FormData = {
  payment_id: string;
  tenant_id: string;
  property_id: string;
  billing_month: string;
  amount: string;
  paid_amount: string;
  payment_date: string;
  due_date: string;
  payment_method: string;
  reference_number: string;
  notes: string;
};

type GenerateFormData = {
  billing_month: string;
  due_date: string;
  tenant_id: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { value: "cash",          label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "gcash",         label: "GCash" },
  { value: "maya",          label: "Maya" },
  { value: "check",         label: "Check" },
];

const statusStyles: Record<string, string> = {
  paid:    "bg-emerald-100 text-emerald-800 border-emerald-300",
  unpaid: "bg-amber-100 text-amber-800 border-amber-300",
  partial: "bg-blue-100 text-blue-800 border-blue-300",
  overdue: "bg-rose-100 text-rose-800 border-rose-300",
};

const methodLabel = (m: string) => PAYMENT_METHODS.find((x) => x.value === m)?.label ?? m;
const fmt     = (v: string | number) => `₱${Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
const fmtDate = (v?: string) => v
  ? new Date(v).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
  : "None";
const fullTenantName = (tenant?: Tenant) => tenant ? `${tenant.first_name} ${tenant.last_name}` : "Unknown tenant";
const balanceOf = (payment?: Payment) => payment ? Number(payment.amount) - Number(payment.paid_amount ?? 0) : 0;
const MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

// ── Filter ────────────────────────────────────────────────────────────────────
const globalFilterFn: FilterFn<Payment> = (row: Row<Payment>, _columnId: string, value: string) => {
  if (!value?.trim()) return true;
  const term = value.toLowerCase();
  return [
    row.original.tenant ? `${row.original.tenant.first_name} ${row.original.tenant.last_name}` : "",
    row.original.property?.name ?? "",
    row.original.payment_method,
    row.original.status,
    row.original.reference_number ?? "",
  ].some((f) => f.toLowerCase().includes(term));
};

// ── Form Component (defined OUTSIDE parent to prevent focus loss) ──────────────
interface PaymentFormProps {
  isEdit: boolean;
  form: ReturnType<typeof useForm<FormData>>;
  billings: Payment[];
  onBillingSelect: (paymentId: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

function PaymentForm({ isEdit, form, billings, onBillingSelect, onClose, onSubmit }: PaymentFormProps) {
  const selectedBilling = billings.find((payment) => String(payment.id) === form.data.payment_id);
  const remainingBalance = balanceOf(selectedBilling);

  return (
    <form onSubmit={onSubmit} className="space-y-5 py-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 md:col-span-2">
          <Label>Billing *</Label>
          <Select value={form.data.payment_id} onValueChange={onBillingSelect} disabled={isEdit}>
            <SelectTrigger><SelectValue placeholder="Select generated billing..." /></SelectTrigger>
            <SelectContent>
              {billings.map((billing) => (
                <SelectItem key={billing.id} value={String(billing.id)}>
                  {fullTenantName(billing.tenant)} - {billing.billing_month ?? "No billing month"} - Balance {fmt(balanceOf(billing))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.errors.payment_id && <p className="text-xs text-destructive">{form.errors.payment_id}</p>}
        </div>

        <div className="rounded-md border bg-muted/40 p-3 md:col-span-2">
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-4">
            <div>
              <div className="text-xs text-muted-foreground">Tenant</div>
              <div className="font-medium">{fullTenantName(selectedBilling?.tenant)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Billing Month</div>
              <div className="font-medium">{selectedBilling?.billing_month ?? "None"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Due Date</div>
              <div className="font-medium">{fmtDate(selectedBilling?.due_date)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Remaining Balance</div>
              <div className="font-medium">{selectedBilling ? fmt(remainingBalance) : fmt(0)}</div>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{isEdit ? "Total Paid Amount *" : "Payment Received *"}</Label>
          <Input
            type="number" min="0" step="0.01"
            value={form.data.paid_amount}
            onChange={(e) => form.setData("paid_amount", e.target.value)}
            placeholder="0.00"
          />
          {form.errors.paid_amount && <p className="text-xs text-destructive">{form.errors.paid_amount}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Payment Method *</Label>
          <Select value={form.data.payment_method} onValueChange={(v) => form.setData("payment_method", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Payment Date</Label>
          <Input
            type="date"
            value={form.data.payment_date}
            onChange={(e) => form.setData("payment_date", e.target.value)}
          />
          {form.errors.payment_date && <p className="text-xs text-destructive">{form.errors.payment_date}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Reference Number</Label>
          <Input
            value={form.data.reference_number}
            onChange={(e) => form.setData("reference_number", e.target.value)}
            placeholder="e.g. GCash ref, check no..."
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label>Notes</Label>
          <Textarea
            rows={2}
            value={form.data.notes}
            onChange={(e) => form.setData("notes", e.target.value)}
            placeholder="Additional notes..."
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={form.processing || !form.data.payment_id}>
          {form.processing
            ? (isEdit ? "Saving..." : "Recording...")
            : (isEdit ? "Save Payment" : "Record Payment")}
        </Button>
      </DialogFooter>
    </form>
  );
}
// ── Main Component ────────────────────────────────────────────────────────────
export default function PaymentsIndex() {
  const { props } = usePage<PageProps>();
  const { payments, tenants } = props;

  const [sorting, setSorting]       = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [search, setSearch]         = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [editOpen, setEditOpen]     = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected]     = useState<Payment | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const recordableBillings = useMemo(
    () => payments.filter((payment) => payment.billing_month),
    [payments],
  );
  const yearOptions = useMemo(() => {
    const years = new Set<string>();

    payments.forEach((payment) => {
      if (payment.billing_month) {
        years.add(payment.billing_month.slice(0, 4));
      } else if (payment.payment_date) {
        years.add(payment.payment_date.slice(0, 4));
      }
    });

    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [payments]);
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const period = payment.billing_month || payment.payment_date?.slice(0, 7) || "";
      const [year, month] = period.split("-");

      if (monthFilter !== "all" && month !== monthFilter) {
        return false;
      }

      if (yearFilter !== "all" && year !== yearFilter) {
        return false;
      }

      return true;
    });
  }, [monthFilter, payments, yearFilter]);

  const emptyForm: FormData = {
    payment_id: "", tenant_id: "", property_id: "", billing_month: "", amount: "", paid_amount: "", payment_date: today,
    due_date: today,
    payment_method: "cash", reference_number: "", notes: "",
  };

  const form = useForm<FormData>(emptyForm);
  const generateForm = useForm<GenerateFormData>({
    billing_month: today.slice(0, 7),
    due_date: today,
    tenant_id: "",
  });

  const openCreate = () => {
    form.reset();
    form.setData(emptyForm);
    setCreateOpen(true);
  };

  const selectBillingForPayment = (paymentId: string) => {
    const billing = payments.find((payment) => String(payment.id) === paymentId);
    if (!billing) {
      form.setData(emptyForm);
      return;
    }

    const remainingBalance = Math.max(balanceOf(billing), 0);

    form.setData({
      payment_id: String(billing.id),
      tenant_id: String(billing.tenant_id),
      property_id: String(billing.property_id),
      billing_month: billing.billing_month ?? "",
      amount: billing.amount,
      paid_amount: remainingBalance ? String(remainingBalance) : "",
      payment_date: today,
      due_date: billing.due_date,
      payment_method: billing.payment_method || "cash",
      reference_number: billing.reference_number ?? "",
      notes: billing.notes ?? "",
    });
  };

  const openEdit = (item: Payment) => {
    setSelected(item);
    form.setData({
      payment_id: String(item.id),
      tenant_id: String(item.tenant_id),
      property_id: String(item.property_id),
      billing_month: item.billing_month ?? "",
      amount: item.amount,
      paid_amount: item.paid_amount ?? "",
      payment_date: item.payment_date ?? "",
      due_date: item.due_date,
      payment_method: item.payment_method,
      reference_number: item.reference_number ?? "",
      notes: item.notes ?? "",
    });
    setEditOpen(true);
  };

  const handleSubmit = (e: React.FormEvent, isEdit = false) => {
    e.preventDefault();
    const opts = {
      onSuccess: () => {
        toast.success(isEdit ? "Payment updated" : "Payment recorded", { description: "Saved successfully." });
        form.reset();
        isEdit ? setEditOpen(false) : setCreateOpen(false);
        setSelected(null);
      },
      onError: (errors: Record<string, string>) => {
        toast.error("Validation failed", { description: Object.values(errors).join("\n"), duration: 7000 });
      },
      preserveScroll: true,
    };

    const paymentId = isEdit ? selected?.id : Number(form.data.payment_id);

    if (paymentId) {
      const billing = payments.find((payment) => payment.id === Number(paymentId));
      const paidAmount = isEdit
        ? Number(form.data.paid_amount || 0)
        : Number(billing?.paid_amount ?? 0) + Number(form.data.paid_amount || 0);

      router.patch(route("rentals.payments.update", paymentId), {
        ...form.data,
        paid_amount: String(paidAmount),
      }, opts);
    } else {
      toast.error("Select a generated billing first.");
    }
  };

  const handleDelete = () => {
    if (!selected?.id) return;
    form.delete(route("rentals.payments.destroy", selected.id), {
      onSuccess: () => {
        toast.success("Payment record deleted.");
        setDeleteOpen(false);
        setSelected(null);
      },
      onError: () => toast.error("Could not delete payment."),
      preserveScroll: true,
    });
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    generateForm.post(route("rentals.payments.generate"), {
      onSuccess: () => {
        toast.success("Billing generated");
        setGenerateOpen(false);
        generateForm.reset();
      },
      onError: (errors: Record<string, string>) => {
        toast.error("Could not generate billing", { description: Object.values(errors).join("\n"), duration: 7000 });
      },
      preserveScroll: true,
    });
  };

  const printMonthlyBilling = () => {
    if (!generateForm.data.billing_month) {
      toast.error("Select a billing month first.");
      return;
    }

    const params: Record<string, string> = { billing_month: generateForm.data.billing_month };
    if (generateForm.data.tenant_id) {
      params.tenant_id = generateForm.data.tenant_id;
    }

    window.open(route("rentals.payments.print", params), "_blank");
  };

  const stats = useMemo(() => {
    const collected = filteredPayments
      .filter((p) => p.status === "paid" || p.status === "partial")
      .reduce((s, p) => s + Number(p.paid_amount ?? p.amount), 0);
    return {
      total:     filteredPayments.length,
      paid:      filteredPayments.filter((p) => p.status === "paid").length,
      pending:   filteredPayments.filter((p) => p.status === "unpaid").length,
      overdue:   filteredPayments.filter((p) => p.status === "overdue").length,
      collected,
    };
  }, [filteredPayments]);

  const columns = useMemo<ColumnDef<Payment>[]>(() => [
    {
      id: "rowNumber",
      header: "#",
      size: 50,
      cell: ({ row }) => <div className="text-center text-muted-foreground">{row.index + 1}</div>,
    },
    {
      id: "tenant",
      header: "Tenant",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-sm">
            {row.original.tenant
              ? `${row.original.tenant.first_name} ${row.original.tenant.last_name}`
              : "—"}
          </div>
          <div className="text-xs text-muted-foreground">{row.original.property?.name ?? "—"}</div>
        </div>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ getValue }) => <span className="font-semibold">{fmt(getValue() as string)}</span>,
    },
    {
      accessorKey: "payment_date",
      header: "Payment Date",
      cell: ({ getValue }) => fmtDate(getValue() as string),
    },
    {
      accessorKey: "billing_month",
      header: "Billing Month",
      cell: ({ getValue }) => getValue() ? String(getValue()) : "None",
    },
    {
      accessorKey: "payment_method",
      header: "Method",
      cell: ({ getValue }) => (
        <span className="capitalize text-sm">{methodLabel(getValue() as string)}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className={cn(
          "inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize",
          statusStyles[row.original.status] ?? "bg-gray-100 text-gray-800 border-gray-300"
        )}>
          {row.original.status}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="icon" onClick={() => openEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={() => { setSelected(row.original); setDeleteOpen(true); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], []);

  const table = useReactTable({
    data: filteredPayments,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, pagination, globalFilter: search },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setSearch,
    globalFilterFn,
  });

  return (
    <AdminLayout>
      <Head title="Rental Payments" />
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Rental Payments</h1>
            <p className="text-muted-foreground mt-1">
              {filteredPayments.length} shown of {payments.length} total records
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setGenerateOpen(true)}>
              Generate Billing
            </Button>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Collected", value: fmt(stats.collected), icon: DollarSign,  color: "text-emerald-600" },
            { label: "Paid",            value: stats.paid,           icon: CheckCircle, color: "text-emerald-600" },
            { label: "Pending",         value: stats.pending,        icon: Clock,       color: "text-amber-600" },
            { label: "Overdue",         value: stats.overdue,        icon: AlertCircle, color: "text-rose-600" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className={cn("rounded-lg p-2 bg-muted", s.color)}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_180px_160px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tenant, property, method, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-10"
            />
            {search && (
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearch("")}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {MONTH_OPTIONS.map((month) => (
                <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(search || monthFilter !== "all" || yearFilter !== "all") && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch("");
                setMonthFilter("all");
                setYearFilter("all");
              }}
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Payment Records</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((h) => (
                        <TableHead
                          key={h.id}
                          className={cn(h.column.getCanSort() ? "cursor-pointer select-none" : "", h.column.id === "rowNumber" && "text-center")}
                          onClick={h.column.getToggleSortingHandler()}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {{ asc: " ↑", desc: " ↓" }[h.column.getIsSorted() as string] ?? null}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                        No payment records found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t text-sm gap-4">
              <div>
                Showing{" "}
                <strong>
                  {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                    table.getFilteredRowModel().rows.length
                  )}
                </strong>{" "}
                of <strong>{table.getFilteredRowModel().rows.length}</strong>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
                <span className="text-muted-foreground">Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span>
                <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Generate Billing Dialog */}
        <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Monthly Billing</DialogTitle>
              <DialogDescription>Select a tenant and month. Choose All tenants to generate billing for every active tenant.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Tenant *</Label>
                <Select value={generateForm.data.tenant_id || "all"} onValueChange={(value) => generateForm.setData("tenant_id", value === "all" ? "" : value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tenants</SelectItem>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={String(tenant.id)}>
                        {tenant.first_name} {tenant.last_name}{tenant.property ? ` - ${tenant.property.name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {generateForm.errors.tenant_id && <p className="text-xs text-destructive">{generateForm.errors.tenant_id}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Billing Month *</Label>
                <Input type="month" value={generateForm.data.billing_month} onChange={(e) => generateForm.setData("billing_month", e.target.value)} />
                {generateForm.errors.billing_month && <p className="text-xs text-destructive">{generateForm.errors.billing_month}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Due Date *</Label>
                <Input type="date" value={generateForm.data.due_date} onChange={(e) => generateForm.setData("due_date", e.target.value)} />
                {generateForm.errors.due_date && <p className="text-xs text-destructive">{generateForm.errors.due_date}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setGenerateOpen(false)}>Cancel</Button>
                <Button type="button" variant="outline" onClick={printMonthlyBilling}>
                  <Printer className="mr-2 h-4 w-4" />
                  PDF
                </Button>
                <Button type="submit" disabled={generateForm.processing}>{generateForm.processing ? "Generating..." : "Generate Billing"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Create Dialog */}
        <Dialog open={createOpen} onOpenChange={(o) => { if (!o) { setCreateOpen(false); form.reset(); } }}>
          <DialogContent className="sm:max-w-160 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>Enter the payment details for a tenant.</DialogDescription>
            </DialogHeader>
            <PaymentForm
              isEdit={false}
              form={form}
              billings={recordableBillings}
              onBillingSelect={selectBillingForPayment}
              onClose={() => setCreateOpen(false)}
              onSubmit={(e) => handleSubmit(e, false)}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={(o) => { if (!o) { setEditOpen(false); form.reset(); setSelected(null); } }}>
          <DialogContent className="sm:max-w-160 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Payment</DialogTitle>
              <DialogDescription>Update payment record details.</DialogDescription>
            </DialogHeader>
            <PaymentForm
              isEdit={true}
              form={form}
              billings={recordableBillings}
              onBillingSelect={selectBillingForPayment}
              onClose={() => setEditOpen(false)}
              onSubmit={(e) => handleSubmit(e, true)}
            />
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Delete Payment
              </DialogTitle>
              <DialogDescription>
                Delete this payment record of{" "}
                <strong>{selected ? fmt(selected.amount) : ""}</strong>? This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={form.processing}>
                {form.processing ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}


