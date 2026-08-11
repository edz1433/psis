"use client";

import { usePage, useForm, Head } from "@inertiajs/react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Trash2,
  Pencil,
  Plus,
  AlertTriangle,
  Search,
  Check,
  ChevronsUpDown,
  X,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { route } from "ziggy-js";

// ──────────────────────────────────────────────── Types
interface Supplier {
  id: number;
  name: string;
}

interface User {
  id: number;
  fname: string;
  lname: string;
  username: string;
  role: string;
  supplier_id: number;
  access: string[]; // ["1","3","7"]
}

interface PageProps extends Record<string, unknown> {
  users: User[];
  suppliers: Supplier[];
  menuEnums: Record<string, string>; // "1": "Dashboard", ...
}

// ──────────────────────────────────────────────── Custom global filter
const globalFilterAllColumns: FilterFn<User> = (
  row: Row<User>,
  _columnId: string,
  filterValue: string
) => {
  if (!filterValue?.trim()) return true;

  const term = filterValue.toLowerCase().trim();

  const fields = [
    row.original.fname + " " + row.original.lname,
    row.original.username,
    row.original.role,
  ];

  return fields.some((val) => val.toLowerCase().includes(term));
};

// ──────────────────────────────────────────────── Component
export default function UserIndex() {
  const { props } = usePage<PageProps>();
  const { users, suppliers, menuEnums } = props;

  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [globalFilter, setGlobalFilter] = useState("");

  const supplierMap = useMemo<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    suppliers.forEach((s) => {
      map[s.id] = s.name;
    });
    return map;
  }, [suppliers]);

  // ──────────────────────────────────────────────── Form
  const form = useForm<{
    fname: string;
    lname: string;
    username: string;
    password: string;
    role: string;
    supplier_id: string;
    access: string[];
  }>({
    fname: "",
    lname: "",
    username: "",
    password: "",
    role: "",
    supplier_id: "",
    access: [],
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<User | null>(null);

  const getDisplayName = (userData: typeof form.data | User) =>
    [userData.fname, userData.lname].filter(Boolean).join(" ") || userData.username || "User";

  const openCreate = () => {
    form.reset();
    setCreateOpen(true);
  };

  const openEdit = (user: User) => {
    setSelected(user);
    form.setData({
      fname: user.fname,
      lname: user.lname,
      username: user.username,
      password: "",
      role: user.role,
      supplier_id: String(user.supplier_id),
      access: user.access ?? [],
    });
    setEditOpen(true);
  };

  const openDelete = (user: User) => {
    setSelected(user);
    setDeleteOpen(true);
  };

  const handleSubmit = (e: React.FormEvent, isEdit = false) => {
    e.preventDefault();
    const displayName = getDisplayName(form.data);

    const options = {
      onSuccess: () => {
        toast.success(isEdit ? "User updated" : "User created", {
          description: `${displayName} (${form.data.username}) saved successfully.`,
        });
        form.reset();
        isEdit ? setEditOpen(false) : setCreateOpen(false);
        setSelected(null);
      },
      onError: (errors: Record<string, string>) => {
        const firstError = Object.values(errors)[0] as string | undefined;
        toast.error(isEdit ? "Update failed" : "Create failed", {
          description: firstError || "Please check the form and try again.",
          duration: 6000,
        });
      },
      preserveScroll: true,
    };

    if (isEdit && selected?.id) {
      form.patch(route("users.update", selected.id), options);
    } else {
      form.post(route("users.store"), options);
    }
  };

  const handleDelete = () => {
    if (!selected?.id) return;
    const displayName = getDisplayName(selected);

    form.delete(route("users.destroy", selected.id), {
      onSuccess: () => {
        toast.success("User deleted", {
          description: `${displayName} (${selected.username}) has been removed.`,
        });
        setDeleteOpen(false);
        setSelected(null);
      },
      onError: () => {
        toast.error("Delete failed", {
          description: "The user could not be deleted (possibly referenced elsewhere).",
        });
      },
      preserveScroll: true,
    });
  };

  // ──────────────────────────────────────────────── Columns (with new Access column)
  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: "rowNumber",
        header: "#",
        size: 60,
        cell: ({ row }) => (
          <div className="text-center text-muted-foreground">
            {row.index + 1}
          </div>
        ),
      },
      {
        accessorKey: "username",
        header: "Username",
      },
      {
        id: "fullName",
        header: "Name",
        cell: ({ row }) => (
          <div>{[row.original.fname, row.original.lname].filter(Boolean).join(" ")}</div>
        ),
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => {
          const role = row.original.role;
          const roleMap: Record<string, { label: string; color: string }> = {
            "1": { label: "Administrator", color: "bg-violet-100 text-violet-800 border-violet-300" },
            "2": { label: "Production", color: "bg-blue-100 text-blue-800 border-blue-300" },
            "3": { label: "Enterprise", color: "bg-amber-100 text-amber-800 border-amber-300" },
            "4": { label: "Accounting", color: "bg-amber-100 text-amber-800 border-amber-300" },
            "5": { label: "Budget", color: "bg-amber-100 text-amber-800 border-amber-300" },
          };
          const { label = "Unknown", color = "bg-gray-100 text-gray-800 border-gray-300" } =
            roleMap[role] || {};
          return (
            <span className={cn("inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border", color)}>
              {label}
            </span>
          );
        },
        size: 140,
      },
      {
        accessorKey: "supplier_id",
        header: "Supplier",
        cell: ({ row }) => {
          const id = row.original.supplier_id;
          const supplier = suppliers.find(s => s.id === id);
          return <div className="text-muted-foreground">
            {supplier ? supplier.name : (id ? `Supplier #${id}` : "—")}
          </div>;
        },
        size: 220,
      },
      {
        id: "access",
        header: "Access",
        cell: ({ row }) => {
          const accessIds = row.original.access ?? [];
          if (accessIds.length === 0) return <div className="text-muted-foreground">—</div>;

          const labels = accessIds
            .map(id => menuEnums[id] || `#${id}`)
            .join(", ");

          return (
            <div className="text-sm text-muted-foreground max-w-xs truncate" title={labels}>
              {labels}
            </div>
          );
        },
        size: 250,
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
              onClick={() => openDelete(row.original)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
        size: 110,
      },
    ],
    [suppliers, menuEnums] // ← add menuEnums dependency for access column
  );

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      pagination,
      globalFilter,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: globalFilterAllColumns,
  });

  // ──────────────────────────────────────────────── Role Combobox (unchanged)
  const roleOptions = [
    { id: "1", label: "Administrator" },
    { id: "2", label: "Production" },
    { id: "3", label: "Enterprise" },
    { id: "4", label: "Accounting" },
    { id: "5", label: "Budget" },
  ];

  const RoleCombobox = ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => {
    const [open, setOpen] = useState(false);

    const selected = roleOptions.find((o) => o.id === value);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between">
            {selected ? selected.label : "Select role..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search role..." />
            <CommandList>
              <CommandEmpty>No results.</CommandEmpty>
              <CommandGroup>
                {roleOptions.map((opt) => (
                  <CommandItem
                    key={opt.id}
                    value={opt.id}
                    onSelect={() => {
                      onChange(opt.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === opt.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {opt.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  // ──────────────────────────────────────────────── Supplier Combobox (unchanged)
  const SupplierCombobox = ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => {
    const [open, setOpen] = useState(false);

    const selected = suppliers.find((s) => String(s.id) === value);

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between">
            {selected ? selected.name : "Select supplier..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Search supplier..." />
            <CommandList>
              <CommandEmpty>No suppliers found.</CommandEmpty>
              <CommandGroup>
                {suppliers.map((s) => (
                  <CommandItem
                    key={s.id}
                    value={String(s.id)}
                    onSelect={() => {
                      onChange(String(s.id));
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === String(s.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {s.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  // ──────────────────────────────────────────────── Render
  return (
    <AdminLayout>
      <Head title="Users" />

      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground mt-1">
              {users.length} total
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New User
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, username, role..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 pr-10"
          />
          {globalFilter && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setGlobalFilter("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>User List</CardTitle>
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
                          className={cn(
                            h.column.getCanSort() ? "cursor-pointer select-none" : "",
                            h.column.id === "rowNumber" && "text-center"
                          )}
                          onClick={h.column.getToggleSortingHandler()}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {{
                            asc: " ↑",
                            desc: " ↓",
                          }[h.column.getIsSorted() as string] ?? null}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>

                <span className="text-muted-foreground">
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>

            <form onSubmit={(e) => handleSubmit(e)} className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Username *</Label>
                  <Input
                    value={form.data.username}
                    onChange={(e) => form.setData("username", e.target.value)}
                    placeholder="e.g. jdelacruz"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Role *</Label>
                  <RoleCombobox
                    value={form.data.role}
                    onChange={(v) => form.setData("role", v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input
                    value={form.data.fname}
                    onChange={(e) => form.setData("fname", e.target.value)}
                    placeholder="e.g. Juan"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input
                    value={form.data.lname}
                    onChange={(e) => form.setData("lname", e.target.value)}
                    placeholder="e.g. Dela Cruz"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    value={form.data.password}
                    onChange={(e) => form.setData("password", e.target.value)}
                    placeholder="Minimum 6 characters"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Supplier *</Label>
                  <SupplierCombobox
                    value={form.data.supplier_id}
                    onChange={(v) => form.setData("supplier_id", v)}
                  />
                </div>

                {/* Numeric Enum Menu Access */}
                <div className="md:col-span-2 space-y-4">
                  <Label>Menu Access Permissions</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(props.menuEnums).map(([id, label]) => (
                      <div key={id} className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id={`menu-${id}`}
                          checked={form.data.access.includes(id)}
                          onChange={(e) => {
                            const current = form.data.access || [];
                            const updated = e.target.checked
                              ? [...current, id]
                              : current.filter((m) => m !== id);
                            form.setData("access", updated);
                          }}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="space-y-0.5">
                          <Label htmlFor={`menu-${id}`} className="text-sm font-medium cursor-pointer">
                            {label}
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.processing}>
                  {form.processing ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>

            <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Username *</Label>
                  <Input
                    value={form.data.username}
                    onChange={(e) => form.setData("username", e.target.value)}
                    placeholder="e.g. jdelacruz"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Role *</Label>
                  <RoleCombobox
                    value={form.data.role}
                    onChange={(v) => form.setData("role", v)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input
                    value={form.data.fname}
                    onChange={(e) => form.setData("fname", e.target.value)}
                    placeholder="e.g. Juan"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input
                    value={form.data.lname}
                    onChange={(e) => form.setData("lname", e.target.value)}
                    placeholder="e.g. Dela Cruz"
                  />
                </div>

                <div className="space-y-2">
                  <Label>New Password (optional)</Label>
                  <Input
                    type="password"
                    value={form.data.password}
                    onChange={(e) => form.setData("password", e.target.value)}
                    placeholder="Leave blank to keep current"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Supplier *</Label>
                  <SupplierCombobox
                    value={form.data.supplier_id}
                    onChange={(v) => form.setData("supplier_id", v)}
                  />
                </div>

                {/* Numeric Enum Menu Access */}
                <div className="md:col-span-2 space-y-4">
                  <Label>Menu Access Permissions</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(props.menuEnums).map(([id, label]) => (
                      <div key={id} className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id={`menu-${id}`}
                          checked={form.data.access.includes(id)}
                          onChange={(e) => {
                            const current = form.data.access || [];
                            const updated = e.target.checked
                              ? [...current, id]
                              : current.filter((m) => m !== id);
                            form.setData("access", updated);
                          }}
                          className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="space-y-0.5">
                          <Label htmlFor={`menu-${id}`} className="text-sm font-medium cursor-pointer">
                            {label}
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.processing}>
                  {form.processing ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Delete User
              </DialogTitle>
              <DialogDescription>
                Permanently delete <strong>{selected ? getDisplayName(selected) : ""}</strong> ({selected?.username})?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={form.processing}
              >
                {form.processing ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
