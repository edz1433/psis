"use client";

import { usePage, useForm, Head } from '@inertiajs/react';
import { route } from 'ziggy-js';
import AdminLayout from "@/layouts/AdminLayout";
import { useMemo, useState } from 'react';
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
} from '@tanstack/react-table';

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
import { Trash2, Pencil, Plus, AlertTriangle, Search, Check, ChevronsUpDown } from "lucide-react";
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

interface Campus {
  id: number;
  campus_name: string;
  campus_abbr?: string;
}

interface User {
  id: number;
  fname: string;
  lname: string;
  username: string;
  role: string;
  campus_id: number;
}

interface PageProps {
  users: {
    data: User[];
  };
  campuses: Campus[];
  filters: Record<string, any>;
  [key: string]: unknown;
}

export default function UserIndex() {
  const { props } = usePage<PageProps>();
  const { users, campuses } = props;
  const data = users.data ?? [];

  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [globalFilter, setGlobalFilter] = useState("");

  const campusMap = useMemo<Record<number, string>>(() => {
    const map: Record<number, string> = {};
    campuses.forEach((c) => {
      map[c.id] = c.campus_abbr
        ? `${c.campus_name} (${c.campus_abbr})`
        : c.campus_name;
    });
    return map;
  }, [campuses]);

  const form = useForm({
    fname: "",
    lname: "",
    username: "",
    password: "",
    role: "",
    campus_id: "",
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const getDisplayName = (userData: typeof form.data | User) =>
    [userData.fname, userData.lname].filter(Boolean).join(" ") || userData.username || "User";

  const openCreate = () => {
    form.reset();
    form.clearErrors();
    setCreateOpen(true);
  };

  const openEdit = (user: User) => {
    setSelectedUser(user);
    form.setData({
      fname: user.fname,
      lname: user.lname,
      username: user.username,
      password: "",
      role: user.role,
      campus_id: String(user.campus_id),
    });
    form.clearErrors();
    setEditOpen(true);
  };

  const openDelete = (user: User) => {
    setSelectedUser(user);
    setDeleteOpen(true);
  };

  const handleSubmit = (e: React.FormEvent, isEdit = false) => {
    e.preventDefault();

    const displayName = getDisplayName(form.data);

    const options = {
      onSuccess: () => {
        form.reset();
        form.clearErrors();

        toast.success(isEdit ? "User updated" : "User created", {
          description: isEdit
            ? `${displayName} (${form.data.username}) has been updated successfully.`
            : `New user ${form.data.username} (${displayName}) has been created.`,
          duration: 4200,
        });

        if (isEdit) {
          setEditOpen(false);
          setSelectedUser(null);
        } else {
          setCreateOpen(false);
        }
      },
      onError: (errors: Record<string, string>) => {
        const errorList = Object.entries(errors)
          .map(([field, message]) => `• ${field}: ${message}`)
          .join("\n");

        toast.error(isEdit ? "Failed to update user" : "Failed to create user", {
          description: errorList || "Please check the form and try again.",
          duration: 7500,
          style: { whiteSpace: "pre-line" },
        });
      },
      preserveScroll: true,
    };

    if (isEdit && selectedUser?.id) {
      form.patch(route("users.update", selectedUser.id), options);
    } else {
      form.post(route("users.store"), options);
    }
  };

  const handleDelete = () => {
    if (!selectedUser?.id) return;

    const displayName = getDisplayName(selectedUser);

    form.delete(route("users.destroy", selectedUser.id), {
      onSuccess: () => {
        toast.success("User deleted", {
          description: `${displayName} (${selectedUser.username}) has been removed.`,
          duration: 4800,
        });
        setDeleteOpen(false);
        setSelectedUser(null);
      },
      onError: () => {
        toast.error("Delete failed", {
          description: "The user could not be deleted (possibly referenced elsewhere).",
          duration: 6500,
        });
      },
      preserveScroll: true,
    });
  };

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => <div className="font-medium text-muted-foreground">#{row.getValue("id")}</div>,
        size: 80,
      },
      { accessorKey: "username", header: "Username" },
      { accessorKey: "fname", header: "First Name" },
      { accessorKey: "lname", header: "Last Name" },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => {
          const role = row.getValue("role") as string;
          const roleMap: Record<string, { label: string; color: string }> = {
            "1": { label: "Admin", color: "bg-violet-100 text-violet-800 border-violet-300" },
            "2": { label: "Production", color: "bg-blue-100 text-blue-800 border-blue-300" },
            "3": { label: "Enterprise", color: "bg-amber-100 text-amber-800 border-amber-300" },
          };
          const { label = "Unknown", color = "bg-gray-100 text-gray-800 border-gray-300" } =
            roleMap[role] || {};
          return (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}
            >
              {label}
            </span>
          );
        },
        size: 140,
      },
      {
        accessorKey: "campus_id",
        header: "Campus",
        cell: ({ row }) => {
          const id = row.original.campus_id;
          return <div className="text-muted-foreground">{campusMap[id] ?? `Campus #${id}`}</div>;
        },
        size: 220,
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
        size: 120,
        enableSorting: false,
      },
    ],
    [campusMap]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, pagination, globalFilter },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
  });

  function SearchableCombobox({
    options,
    value,
    onChange,
    placeholder = "Select...",
    searchPlaceholder = "Search...",
    getOptionLabel,
    getOptionValue = (opt: any) => String(opt.id ?? opt.value),
  }: {
    options: any[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    getOptionLabel: (option: any) => string;
    getOptionValue?: (option: any) => string;
  }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const selected = options.find((o) => getOptionValue(o) === value);
    const filtered = search.trim()
      ? options.filter((o) =>
          getOptionLabel(o).toLowerCase().includes(search.toLowerCase())
        )
      : options;

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {selected ? getOptionLabel(selected) : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup className="max-h-60 overflow-auto">
                {filtered.map((opt) => (
                  <CommandItem
                    key={getOptionValue(opt)}
                    value={getOptionValue(opt)}
                    onSelect={() => {
                      onChange(getOptionValue(opt));
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === getOptionValue(opt) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {getOptionLabel(opt)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  const roleOptions = [
    { id: "1", label: "Admin" },
    { id: "2", label: "Production" },
    { id: "3", label: "Enterprise" },
  ];

  return (
    <AdminLayout>
      <Head title="Users Management" />

      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground mt-1">
              {table.getFilteredRowModel().rows.length} records
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name or username..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value || "")}
            className="pl-9"
          />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>User List</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={header.column.getCanSort() ? "cursor-pointer select-none" : ""}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: " ↑",
                            desc: " ↓",
                          }[header.column.getIsSorted() as string] ?? null}
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
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
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

        {/* CREATE DIALOG */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => handleSubmit(e)} className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-2">
                  <Label>Username *</Label>
                  <Input
                    value={form.data.username}
                    onChange={(e) => form.setData("username", e.target.value)}
                  />
                  {form.errors.username && <p className="text-sm text-destructive">{form.errors.username}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Role *</Label>
                  <SearchableCombobox
                    options={roleOptions}
                    value={form.data.role}
                    onChange={(v) => form.setData("role", v)}
                    placeholder="Select role..."
                    searchPlaceholder="Search role..."
                    getOptionLabel={(o) => o.label}
                    getOptionValue={(o) => o.id}
                  />
                  {form.errors.role && <p className="text-sm text-destructive">{form.errors.role}</p>}
                </div>

                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input
                    value={form.data.fname}
                    onChange={(e) => form.setData("fname", e.target.value)}
                  />
                  {form.errors.fname && <p className="text-sm text-destructive">{form.errors.fname}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input
                    value={form.data.lname}
                    onChange={(e) => form.setData("lname", e.target.value)}
                  />
                  {form.errors.lname && <p className="text-sm text-destructive">{form.errors.lname}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    value={form.data.password}
                    onChange={(e) => form.setData("password", e.target.value)}
                    autoComplete="new-password"
                  />
                  {form.errors.password && <p className="text-sm text-destructive">{form.errors.password}</p>}
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <Label>Campus *</Label>
                  <SearchableCombobox
                    options={campuses}
                    value={form.data.campus_id}
                    onChange={(v) => form.setData("campus_id", v)}
                    placeholder="Select campus..."
                    searchPlaceholder="Search campus..."
                    getOptionLabel={(c) =>
                      c.campus_abbr ? `${c.campus_name} (${c.campus_abbr})` : c.campus_name
                    }
                    getOptionValue={(c) => String(c.id)}
                  />
                  {form.errors.campus_id && <p className="text-sm text-destructive">{form.errors.campus_id}</p>}
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

        {/* EDIT DIALOG */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-2">
                  <Label>Username *</Label>
                  <Input
                    value={form.data.username}
                    onChange={(e) => form.setData("username", e.target.value)}
                  />
                  {form.errors.username && <p className="text-sm text-destructive">{form.errors.username}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Role *</Label>
                  <SearchableCombobox
                    options={roleOptions}
                    value={form.data.role}
                    onChange={(v) => form.setData("role", v)}
                    placeholder="Select role..."
                    getOptionLabel={(o) => o.label}
                    getOptionValue={(o) => o.id}
                  />
                  {form.errors.role && <p className="text-sm text-destructive">{form.errors.role}</p>}
                </div>

                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input
                    value={form.data.fname}
                    onChange={(e) => form.setData("fname", e.target.value)}
                  />
                  {form.errors.fname && <p className="text-sm text-destructive">{form.errors.fname}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input
                    value={form.data.lname}
                    onChange={(e) => form.setData("lname", e.target.value)}
                  />
                  {form.errors.lname && <p className="text-sm text-destructive">{form.errors.lname}</p>}
                </div>

                <div className="space-y-2">
                  <Label>New Password (optional)</Label>
                  <Input
                    type="password"
                    value={form.data.password}
                    onChange={(e) => form.setData("password", e.target.value)}
                    placeholder="Leave blank to keep current password"
                    autoComplete="new-password"
                  />
                  {form.errors.password && <p className="text-sm text-destructive">{form.errors.password}</p>}
                </div>

                <div className="sm:col-span-2 space-y-2">
                  <Label>Campus *</Label>
                  <SearchableCombobox
                    options={campuses}
                    value={form.data.campus_id}
                    onChange={(v) => form.setData("campus_id", v)}
                    placeholder="Select campus..."
                    searchPlaceholder="Search campus..."
                    getOptionLabel={(c) =>
                      c.campus_abbr ? `${c.campus_name} (${c.campus_abbr})` : c.campus_name
                    }
                    getOptionValue={(c) => String(c.id)}
                  />
                  {form.errors.campus_id && <p className="text-sm text-destructive">{form.errors.campus_id}</p>}
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

        {/* DELETE CONFIRMATION */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Delete User
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-medium">
                  {selectedUser ? getDisplayName(selectedUser) : ""} ({selectedUser?.username})
                </span>
                ? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
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