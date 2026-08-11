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
import { AlertTriangle, Building2, Pencil, Plus, Search, Trash2, Users, X } from "lucide-react";
import { route } from "ziggy-js";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
  notes?: string;
  active_tenants_count?: number;
}

interface Property {
  id: number;
  name: string;
  type: string;
  has_rooms_units: boolean;
  address: string;
  description?: string;
  monthly_rate: string;
  floor_area?: string;
  total_units: number;
  status: string;
  amenities?: string[];
  notes?: string;
  active_tenants_count?: number;
  units_count?: number;
  units?: RentalUnit[];
}

interface PageProps extends Record<string, unknown> {
  properties: Property[];
}

type PropertyFormData = {
  name: string;
  type: string;
  has_rooms_units: string;
  address: string;
  description: string;
  monthly_rate: string;
  floor_area: string;
  total_units: string;
  status: string;
  amenities_input: string;
  notes: string;
};

type UnitFormData = {
  name: string;
  floor_level: string;
  capacity: string;
  status: string;
  notes: string;
};

const PROPERTY_TYPES = [
  { value: "dormitory", label: "Dormitory" },
  { value: "apartment_rental", label: "Apartment Rental" },
  { value: "boarding_house", label: "Boarding House" },
  { value: "commercial_space", label: "Commercial Space" },
  { value: "stall", label: "Stall" },
  { value: "office_space", label: "Office Space" },
  { value: "warehouse", label: "Warehouse" },
  { value: "house", label: "Whole House" },
  { value: "other", label: "Other" },
];

const STATUSES = [
  { value: "available", label: "Available" },
  { value: "occupied", label: "Occupied" },
  { value: "reserved", label: "Reserved" },
];

const statusStyles: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-800 border-emerald-300",
  occupied: "bg-blue-100 text-blue-800 border-blue-300",
  reserved: "bg-purple-100 text-purple-800 border-purple-300",
};

const typeLabel = (type: string) => PROPERTY_TYPES.find((item) => item.value === type)?.label ?? type;
const statusLabel = (status: string) => STATUSES.find((item) => item.value === status)?.label ?? status;
const money = (value: string | number) => `PHP ${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

const globalFilterFn: FilterFn<Property> = (row: Row<Property>, _columnId: string, value: string) => {
  if (!value?.trim()) return true;
  const term = value.toLowerCase();
  return [row.original.name, row.original.address, row.original.type, row.original.status]
    .some((field) => field?.toLowerCase().includes(term));
};

interface PropertyFormProps {
  isEdit: boolean;
  form: ReturnType<typeof useForm<PropertyFormData>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

function PropertyForm({ isEdit, form, onClose, onSubmit }: PropertyFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5 py-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 md:col-span-2">
          <Label>Property Name *</Label>
          <Input value={form.data.name} onChange={(e) => form.setData("name", e.target.value)} placeholder="e.g. Mabini Dormitory" />
          {form.errors.name && <p className="text-xs text-destructive">{form.errors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Property Type *</Label>
          <Select value={form.data.type} onValueChange={(value) => form.setData("type", value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PROPERTY_TYPES.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
          </Select>
          {form.errors.type && <p className="text-xs text-destructive">{form.errors.type}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Has Rooms/Units *</Label>
          <Select value={form.data.has_rooms_units} onValueChange={(value) => form.setData("has_rooms_units", value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Yes</SelectItem>
              <SelectItem value="0">No</SelectItem>
            </SelectContent>
          </Select>
          {form.errors.has_rooms_units && <p className="text-xs text-destructive">{form.errors.has_rooms_units}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Status *</Label>
          <Select value={form.data.status} onValueChange={(value) => form.setData("status", value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}</SelectContent>
          </Select>
          {form.errors.status && <p className="text-xs text-destructive">{form.errors.status}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Default Monthly Rate</Label>
          <Input type="number" min="0" step="0.01" value={form.data.monthly_rate} onChange={(e) => form.setData("monthly_rate", e.target.value)} />
          {form.errors.monthly_rate && <p className="text-xs text-destructive">{form.errors.monthly_rate}</p>}
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label>Address/Location *</Label>
          <Input value={form.data.address} onChange={(e) => form.setData("address", e.target.value)} placeholder="Full address or location" />
          {form.errors.address && <p className="text-xs text-destructive">{form.errors.address}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Floor Area (sqm)</Label>
          <Input type="number" min="0" step="0.01" value={form.data.floor_area} onChange={(e) => form.setData("floor_area", e.target.value)} />
        </div>

        {form.data.has_rooms_units === "1" && (
          <div className="space-y-1.5">
            <Label>Expected Units</Label>
            <Input type="number" min="1" value={form.data.total_units} onChange={(e) => form.setData("total_units", e.target.value)} />
            {form.errors.total_units && <p className="text-xs text-destructive">{form.errors.total_units}</p>}
          </div>
        )}

        <div className="space-y-1.5 md:col-span-2">
          <Label>Amenities</Label>
          <Input value={form.data.amenities_input} onChange={(e) => form.setData("amenities_input", e.target.value)} placeholder="WiFi, Water, Parking" />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label>Description</Label>
          <Textarea rows={2} value={form.data.description} onChange={(e) => form.setData("description", e.target.value)} />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <Label>Notes</Label>
          <Textarea rows={2} value={form.data.notes} onChange={(e) => form.setData("notes", e.target.value)} />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={form.processing}>{form.processing ? "Saving..." : (isEdit ? "Save Changes" : "Create Property")}</Button>
      </DialogFooter>
    </form>
  );
}

export default function PropertiesIndex() {
  const { props } = usePage<PageProps>();
  const { properties } = props;

  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [selected, setSelected] = useState<Property | null>(null);
  const [editingUnit, setEditingUnit] = useState<RentalUnit | null>(null);

  const emptyForm: PropertyFormData = {
    name: "",
    type: "dormitory",
    has_rooms_units: "1",
    address: "",
    description: "",
    monthly_rate: "",
    floor_area: "",
    total_units: "1",
    status: "available",
    amenities_input: "",
    notes: "",
  };

  const form = useForm<PropertyFormData>(emptyForm);
  const unitForm = useForm<UnitFormData>({ name: "", floor_level: "", capacity: "1", status: "available", notes: "" });

  const parseAmenities = (raw: string) => raw.split(",").map((item) => item.trim()).filter(Boolean);
  const resetUnitForm = () => unitForm.setData({ name: "", floor_level: "", capacity: "1", status: "available", notes: "" });

  const openCreate = () => {
    form.reset();
    form.setData(emptyForm);
    setCreateOpen(true);
  };

  const openEdit = (property: Property) => {
    setSelected(property);
    form.setData({
      name: property.name,
      type: property.type,
      has_rooms_units: property.has_rooms_units ? "1" : "0",
      address: property.address,
      description: property.description ?? "",
      monthly_rate: property.monthly_rate,
      floor_area: property.floor_area ?? "",
      total_units: String(property.total_units),
      status: property.status,
      amenities_input: (property.amenities ?? []).join(", "),
      notes: property.notes ?? "",
    });
    setEditOpen(true);
  };

  const openUnits = (property: Property) => {
    setSelected(property);
    setEditingUnit(null);
    resetUnitForm();
    setUnitsOpen(true);
  };

  const submitProperty = (e: React.FormEvent, isEdit = false) => {
    e.preventDefault();
    const payload = {
      ...form.data,
      has_rooms_units: form.data.has_rooms_units === "1",
      amenities: parseAmenities(form.data.amenities_input),
    };

    const opts = {
      onSuccess: () => {
        toast.success(isEdit ? "Property updated" : "Property created");
        form.reset();
        setCreateOpen(false);
        setEditOpen(false);
        setSelected(null);
      },
      onError: (errors: Record<string, string>) => toast.error("Validation failed", { description: Object.values(errors).join("\n"), duration: 7000 }),
      preserveScroll: true,
    };

    if (isEdit && selected?.id) {
      form.transform(() => payload);
      form.patch(route("rentals.properties.update", selected.id), opts);
    } else {
      form.transform(() => payload);
      form.post(route("rentals.properties.store"), opts);
    }
  };

  const submitUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;

    const opts = {
      onSuccess: () => {
        toast.success(editingUnit ? "Room/unit updated" : "Room/unit created");
        setEditingUnit(null);
        resetUnitForm();
      },
      onError: (errors: Record<string, string>) => toast.error("Validation failed", { description: Object.values(errors).join("\n"), duration: 7000 }),
      preserveScroll: true,
    };

    if (editingUnit) {
      unitForm.patch(route("rentals.properties.units.update", [selected.id, editingUnit.id]), opts);
    } else {
      unitForm.post(route("rentals.properties.units.store", selected.id), opts);
    }
  };

  const editUnit = (unit: RentalUnit) => {
    setEditingUnit(unit);
    unitForm.setData({
      name: unit.name,
      floor_level: unit.floor_level ?? "",
      capacity: String(unit.capacity),
      status: unit.status,
      notes: unit.notes ?? "",
    });
  };

  const deleteUnit = (unit: RentalUnit) => {
    if (!selected) return;
    unitForm.delete(route("rentals.properties.units.destroy", [selected.id, unit.id]), {
      onSuccess: () => toast.success("Room/unit deleted"),
      onError: (errors) => toast.error("Cannot delete", { description: Object.values(errors).join("\n") }),
      preserveScroll: true,
    });
  };

  const deleteProperty = () => {
    if (!selected) return;
    form.delete(route("rentals.properties.destroy", selected.id), {
      onSuccess: () => {
        toast.success("Property deleted");
        setDeleteOpen(false);
        setSelected(null);
      },
      onError: (errors) => toast.error("Cannot delete", { description: Object.values(errors).join("\n") }),
      preserveScroll: true,
    });
  };

  const stats = useMemo(() => ({
    total: properties.length,
    withUnits: properties.filter((property) => property.has_rooms_units).length,
    direct: properties.filter((property) => !property.has_rooms_units).length,
  }), [properties]);

  const columns = useMemo<ColumnDef<Property>[]>(() => [
    { id: "rowNumber", header: "#", size: 50, cell: ({ row }) => <div className="text-center text-muted-foreground">{row.index + 1}</div> },
    {
      accessorKey: "name",
      header: "Property",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-xs text-muted-foreground truncate max-w-56">{row.original.address}</div>
        </div>
      ),
    },
    { accessorKey: "type", header: "Type", cell: ({ getValue }) => <Badge variant="outline">{typeLabel(getValue() as string)}</Badge> },
    {
      id: "assignment",
      header: "Assignment",
      cell: ({ row }) => row.original.has_rooms_units
        ? <span>{row.original.units_count ?? 0} rooms/units</span>
        : <span className="text-muted-foreground">Direct property</span>,
    },
    { accessorKey: "monthly_rate", header: "Default Rate", cell: ({ getValue }) => <span className="font-medium">{money(getValue() as string)}</span> },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className={cn("inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border", statusStyles[row.original.status] ?? "bg-gray-100 text-gray-800 border-gray-300")}>
          {statusLabel(row.original.status)}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="icon" onClick={() => openEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
          {row.original.has_rooms_units && <Button variant="outline" size="icon" onClick={() => openUnits(row.original)} title="Manage rooms/units"><Building2 className="h-4 w-4" /></Button>}
          <Button
            variant="destructive"
            size="icon"
            onClick={() => { setSelected(row.original); setDeleteOpen(true); }}
            disabled={(row.original.active_tenants_count ?? 0) > 0}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], []);

  const table = useReactTable({
    data: properties,
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
      <Head title="Properties / Units" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Properties / Units</h1>
            <p className="text-muted-foreground mt-1">{properties.length} total properties</p>
          </div>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Property</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total, icon: Building2, color: "text-primary" },
            { label: "With Units", value: stats.withUnits, icon: Users, color: "text-blue-600" },
            { label: "Direct", value: stats.direct, icon: Building2, color: "text-emerald-600" },
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
          <Input placeholder="Search name, address, type, status..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-10" />
          {search && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearch("")}><X className="h-4 w-4" /></Button>}
        </div>

        <Card>
          <CardHeader className="pb-3"><CardTitle>Property List</CardTitle></CardHeader>
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
                    <TableRow><TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">No properties found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={createOpen} onOpenChange={(open) => { if (!open) { setCreateOpen(false); form.reset(); } }}>
          <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add New Property</DialogTitle><DialogDescription>Set up the rental property and whether tenants assign directly or through rooms/units.</DialogDescription></DialogHeader>
            <PropertyForm isEdit={false} form={form} onClose={() => setCreateOpen(false)} onSubmit={(e) => submitProperty(e, false)} />
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={(open) => { if (!open) { setEditOpen(false); form.reset(); setSelected(null); } }}>
          <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Property</DialogTitle><DialogDescription>Update details for {selected?.name}.</DialogDescription></DialogHeader>
            <PropertyForm isEdit={true} form={form} onClose={() => setEditOpen(false)} onSubmit={(e) => submitProperty(e, true)} />
          </DialogContent>
        </Dialog>

        <Dialog open={unitsOpen} onOpenChange={(open) => { if (!open) { setUnitsOpen(false); setEditingUnit(null); unitForm.reset(); } }}>
          <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Rooms/Units for {selected?.name}</DialogTitle><DialogDescription>Manage rooms, apartment units, boarding rooms, stalls, or other assignable spaces.</DialogDescription></DialogHeader>
            <form onSubmit={submitUnit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Name/Number *</Label>
                <Input value={unitForm.data.name} onChange={(e) => unitForm.setData("name", e.target.value)} />
                {unitForm.errors.name && <p className="text-xs text-destructive">{unitForm.errors.name}</p>}
              </div>
              <div className="space-y-1.5"><Label>Floor/Level</Label><Input value={unitForm.data.floor_level} onChange={(e) => unitForm.setData("floor_level", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Capacity *</Label><Input type="number" min="1" value={unitForm.data.capacity} onChange={(e) => unitForm.setData("capacity", e.target.value)} /></div>
              <div className="space-y-1.5">
                <Label>Status *</Label>
                <Select value={unitForm.data.status} onValueChange={(value) => unitForm.setData("status", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-5"><Label>Notes</Label><Textarea rows={2} value={unitForm.data.notes} onChange={(e) => unitForm.setData("notes", e.target.value)} /></div>
              <div className="md:col-span-5 flex justify-end gap-2">
                {editingUnit && <Button type="button" variant="outline" onClick={() => { setEditingUnit(null); resetUnitForm(); }}>Cancel Edit</Button>}
                <Button type="submit" disabled={unitForm.processing}>{editingUnit ? "Save Unit" : "Add Unit"}</Button>
              </div>
            </form>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Floor/Level</TableHead><TableHead>Capacity</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(selected?.units ?? []).length ? (selected?.units ?? []).map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium">{unit.name}</TableCell>
                      <TableCell>{unit.floor_level || <span className="text-muted-foreground">None</span>}</TableCell>
                      <TableCell>{unit.active_tenants_count ?? 0}/{unit.capacity}</TableCell>
                      <TableCell><Badge variant="outline">{statusLabel(unit.status)}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="ghost" size="icon" onClick={() => editUnit(unit)}><Pencil className="h-4 w-4" /></Button>
                        <Button type="button" variant="ghost" size="icon" disabled={(unit.active_tenants_count ?? 0) > 0} onClick={() => deleteUnit(unit)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No rooms/units yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Delete Property</DialogTitle>
              <DialogDescription>Permanently delete <strong>{selected?.name}</strong>? This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={deleteProperty} disabled={form.processing}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
