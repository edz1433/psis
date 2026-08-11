"use client";

import { Head, useForm, usePage } from "@inertiajs/react";
import AdminLayout from "@/layouts/AdminLayout";
import { useMemo, useState } from "react";
import {
  ColumnDef,
  FilterFn,
  PaginationState,
  Row,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { AlertTriangle, Building2, Pencil, Plus, Search, Trash2, UserCheck, Users, UserX, X } from "lucide-react";
import { route } from "ziggy-js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface RentalUnit {
  id: number;
  property_id: number;
  name: string;
  floor_level?: string;
  capacity: number;
  status: string;
  active_tenants_count?: number;
}

interface Property {
  id: number;
  name: string;
  type: string;
  has_rooms_units: boolean;
  address: string;
  monthly_rate: string;
  status: string;
  units?: RentalUnit[];
}

interface Tenant {
  id: number;
  property_id: number;
  room_unit_id?: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  national_id?: string;
  address?: string;
  occupation?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  monthly_rent: string;
  status: string;
  notes?: string;
  payments_count?: number;
  property?: Property;
  room_unit?: RentalUnit;
}

interface PageProps extends Record<string, unknown> {
  tenants: Tenant[];
  properties: Property[];
}

type FormData = {
  property_id: string;
  room_unit_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  national_id: string;
  address: string;
  occupation: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  monthly_rent: string;
  status: string;
  notes: string;
};

const TENANT_STATUSES = [
  { value: "active", label: "Active" },
  { value: "ended", label: "Ended" },
  { value: "evicted", label: "Evicted" },
];

const statusStyles: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-300",
  ended: "bg-gray-100 text-gray-700 border-gray-300",
  evicted: "bg-rose-100 text-rose-800 border-rose-300",
};

const money = (value: string | number) => `PHP ${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

const globalFilterFn: FilterFn<Tenant> = (row: Row<Tenant>, _columnId: string, value: string) => {
  if (!value?.trim()) return true;
  const term = value.toLowerCase();
  return [
    `${row.original.first_name} ${row.original.last_name}`,
    row.original.email ?? "",
    row.original.phone,
    row.original.property?.name ?? "",
    row.original.room_unit?.name ?? "",
    row.original.status,
  ].some((field) => field.toLowerCase().includes(term));
};

interface TenantFormProps {
  isEdit: boolean;
  form: ReturnType<typeof useForm<FormData>>;
  properties: Property[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

function TenantForm({ isEdit, form, properties, onClose, onSubmit }: TenantFormProps) {
  const selectedProperty = properties.find((property) => String(property.id) === form.data.property_id);
  const units = selectedProperty?.units ?? [];

  return (
    <form onSubmit={onSubmit} className="space-y-5 py-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 md:col-span-2">
          <Label>Property *</Label>
          <Select
            value={form.data.property_id}
            onValueChange={(value) => {
              const property = properties.find((item) => String(item.id) === value);
              form.setData({
                ...form.data,
                property_id: value,
                room_unit_id: "",
                monthly_rent: property ? property.monthly_rate : form.data.monthly_rent,
              });
            }}
          >
            <SelectTrigger><SelectValue placeholder="Select property..." /></SelectTrigger>
            <SelectContent>
              {properties.map((property) => (
                <SelectItem key={property.id} value={String(property.id)}>
                  {property.name} - {property.type.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.errors.property_id && <p className="text-xs text-destructive">{form.errors.property_id}</p>}
        </div>

        {selectedProperty?.has_rooms_units && (
          <div className="space-y-1.5 md:col-span-2">
            <Label>Room/Unit *</Label>
            <Select value={form.data.room_unit_id} onValueChange={(value) => form.setData("room_unit_id", value)}>
              <SelectTrigger><SelectValue placeholder="Select room/unit..." /></SelectTrigger>
              <SelectContent>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={String(unit.id)}>
                    {unit.name}{unit.floor_level ? ` - ${unit.floor_level}` : ""} ({unit.active_tenants_count ?? 0}/{unit.capacity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.errors.room_unit_id && <p className="text-xs text-destructive">{form.errors.room_unit_id}</p>}
          </div>
        )}

        <div className="space-y-1.5">
          <Label>First Name *</Label>
          <Input value={form.data.first_name} onChange={(e) => form.setData("first_name", e.target.value)} />
          {form.errors.first_name && <p className="text-xs text-destructive">{form.errors.first_name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Last Name *</Label>
          <Input value={form.data.last_name} onChange={(e) => form.setData("last_name", e.target.value)} />
          {form.errors.last_name && <p className="text-xs text-destructive">{form.errors.last_name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={form.data.email} onChange={(e) => form.setData("email", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Phone *</Label>
          <Input value={form.data.phone} onChange={(e) => form.setData("phone", e.target.value)} />
          {form.errors.phone && <p className="text-xs text-destructive">{form.errors.phone}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>National ID</Label>
          <Input value={form.data.national_id} onChange={(e) => form.setData("national_id", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Occupation</Label>
          <Input value={form.data.occupation} onChange={(e) => form.setData("occupation", e.target.value)} />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label>Address</Label>
          <Input value={form.data.address} onChange={(e) => form.setData("address", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Emergency Contact Name</Label>
          <Input value={form.data.emergency_contact_name} onChange={(e) => form.setData("emergency_contact_name", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Emergency Contact Phone</Label>
          <Input value={form.data.emergency_contact_phone} onChange={(e) => form.setData("emergency_contact_phone", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Monthly Rent *</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.data.monthly_rent}
            onChange={(e) => form.setData("monthly_rent", e.target.value)}
          />
          {form.errors.monthly_rent && <p className="text-xs text-destructive">{form.errors.monthly_rent}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Status *</Label>
          <Select value={form.data.status} onValueChange={(value) => form.setData("status", value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TENANT_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label>Notes</Label>
          <Textarea rows={2} value={form.data.notes} onChange={(e) => form.setData("notes", e.target.value)} />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={form.processing}>
          {form.processing ? "Saving..." : (isEdit ? "Save Changes" : "Add Tenant")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function TenantsIndex() {
  const { props } = usePage<PageProps>();
  const { tenants, properties } = props;

  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Tenant | null>(null);

  const emptyForm: FormData = {
    property_id: "",
    room_unit_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    national_id: "",
    address: "",
    occupation: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    monthly_rent: "",
    status: "active",
    notes: "",
  };

  const form = useForm<FormData>(emptyForm);

  const openCreate = () => {
    form.reset();
    form.setData(emptyForm);
    setCreateOpen(true);
  };

  const openEdit = (tenant: Tenant) => {
    setSelected(tenant);
    form.setData({
      property_id: String(tenant.property_id),
      room_unit_id: tenant.room_unit_id ? String(tenant.room_unit_id) : "",
      first_name: tenant.first_name,
      last_name: tenant.last_name,
      email: tenant.email ?? "",
      phone: tenant.phone,
      national_id: tenant.national_id ?? "",
      address: tenant.address ?? "",
      occupation: tenant.occupation ?? "",
      emergency_contact_name: tenant.emergency_contact_name ?? "",
      emergency_contact_phone: tenant.emergency_contact_phone ?? "",
      monthly_rent: tenant.monthly_rent,
      status: tenant.status,
      notes: tenant.notes ?? "",
    });
    setEditOpen(true);
  };

  const handleSubmit = (e: React.FormEvent, isEdit = false) => {
    e.preventDefault();
    const fullName = `${form.data.first_name} ${form.data.last_name}`.trim();

    const opts = {
      onSuccess: () => {
        toast.success(isEdit ? "Tenant updated" : "Tenant added", { description: `${fullName} saved successfully.` });
        form.reset();
        setCreateOpen(false);
        setEditOpen(false);
        setSelected(null);
      },
      onError: (errors: Record<string, string>) => {
        toast.error("Validation failed", { description: Object.values(errors).join("\n"), duration: 7000 });
      },
      preserveScroll: true,
    };

    if (isEdit && selected?.id) {
      form.patch(route("rentals.tenants.update", selected.id), opts);
    } else {
      form.post(route("rentals.tenants.store"), opts);
    }
  };

  const handleDelete = () => {
    if (!selected) return;
    form.delete(route("rentals.tenants.destroy", selected.id), {
      onSuccess: () => {
        toast.success("Tenant removed.");
        setDeleteOpen(false);
        setSelected(null);
      },
      onError: (errors) => toast.error("Cannot delete", { description: Object.values(errors).join("\n") }),
      preserveScroll: true,
    });
  };

  const stats = useMemo(() => ({
    total: tenants.length,
    active: tenants.filter((tenant) => tenant.status === "active").length,
    ended: tenants.filter((tenant) => tenant.status === "ended").length,
    evicted: tenants.filter((tenant) => tenant.status === "evicted").length,
  }), [tenants]);

  const columns = useMemo<ColumnDef<Tenant>[]>(() => [
    { id: "rowNumber", header: "#", size: 50, cell: ({ row }) => <div className="text-center text-muted-foreground">{row.index + 1}</div> },
    {
      id: "name",
      header: "Tenant",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.first_name} {row.original.last_name}</div>
          <div className="text-xs text-muted-foreground">{row.original.phone}</div>
        </div>
      ),
    },
    {
      id: "property",
      header: "Property / Room",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-sm">{row.original.property?.name ?? "None"}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.room_unit?.name ?? (row.original.property?.has_rooms_units ? "No room/unit" : "Direct assignment")}
          </div>
        </div>
      ),
    },
    { accessorKey: "monthly_rent", header: "Monthly Rent", cell: ({ getValue }) => <span className="font-medium">{money(getValue() as string)}</span> },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className={cn("inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize", statusStyles[row.original.status] ?? "bg-gray-100 text-gray-700 border-gray-300")}>
          {row.original.status}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="icon" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="destructive" size="icon" onClick={() => { setSelected(row.original); setDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ], []);

  const table = useReactTable({
    data: tenants,
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
      <Head title="Tenants" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
            <p className="text-muted-foreground mt-1">{tenants.length} total tenants</p>
          </div>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Tenant</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total, icon: Users, color: "text-primary" },
            { label: "Active", value: stats.active, icon: UserCheck, color: "text-emerald-600" },
            { label: "Ended", value: stats.ended, icon: Building2, color: "text-gray-600" },
            { label: "Evicted", value: stats.evicted, icon: UserX, color: "text-rose-600" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className={cn("rounded-lg p-2 bg-muted", stat.color)}><stat.icon className="h-5 w-5" /></div>
                <div><p className="text-2xl font-bold">{stat.value}</p><p className="text-xs text-muted-foreground">{stat.label}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search name, phone, property, room, status..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-10" />
          {search && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearch("")}><X className="h-4 w-4" /></Button>}
        </div>

        <Card>
          <CardHeader className="pb-3"><CardTitle>Tenant List</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} onClick={header.column.getToggleSortingHandler()}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length ? table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">No tenants found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={createOpen} onOpenChange={(open) => { if (!open) { setCreateOpen(false); form.reset(); } }}>
          <DialogContent className="sm:max-w-170 max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add New Tenant</DialogTitle><DialogDescription>Fill in the tenant information and monthly rent.</DialogDescription></DialogHeader>
            <TenantForm isEdit={false} form={form} properties={properties} onClose={() => setCreateOpen(false)} onSubmit={(e) => handleSubmit(e, false)} />
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={(open) => { if (!open) { setEditOpen(false); form.reset(); setSelected(null); } }}>
          <DialogContent className="sm:max-w-170 max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Tenant</DialogTitle><DialogDescription>Update information for {selected?.first_name} {selected?.last_name}.</DialogDescription></DialogHeader>
            <TenantForm isEdit={true} form={form} properties={properties} onClose={() => setEditOpen(false)} onSubmit={(e) => handleSubmit(e, true)} />
          </DialogContent>
        </Dialog>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Remove Tenant</DialogTitle>
              <DialogDescription>Permanently remove <strong>{selected?.first_name} {selected?.last_name}</strong>? Related payment records will also be deleted.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={form.processing}>{form.processing ? "Removing..." : "Remove Tenant"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
