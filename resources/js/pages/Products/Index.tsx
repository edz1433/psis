"use client";

import { usePage, useForm, Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';

import AdminLayout from "@/layouts/AdminLayout";

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
  Row,
  FilterFn,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Trash2,
  Pencil,
  Plus,
  Search,
  X,
  Package,
  AlertCircle,
  Ban,
  AlertTriangle,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { route } from 'ziggy-js';

import CreateProduct from "./Create";
import EditProduct from "./Edit";

interface Supplier {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  barcode: string;
  product_img?: string | null;
  price: number;
  formatted_price: string;
  my_price: number;
  my_formatted_price: string;
  capital: number;
  formatted_capital: string;
  my_capital: number;
  my_formatted_capital: string;
  my_stock: number;
  my_stock_formatted: string;
  my_stock_status: string;
  my_is_low_stock: boolean;
  my_is_out_of_stock: boolean;
  global_stock?: number;
  global_stock_formatted?: string;
  global_stock_status?: string;
  suppliers_count?: number;
  display_supplier?: { id: number; name: string } | null;
  category?: Category;
  order_items_count?: number;
  stocks?: Array<{
    supplier_id: number;
    supplier_name: string;
    stock: number;
    capital: number;
    markup: number;
    price: number;
    formatted_price: string;
    status: string;
  }> | null;
}

interface PageProps extends Record<string, unknown> {
  products: Product[];
  suppliers: Supplier[];
  categories: Category[];
  userRole: number | string;
  userSupplierId: number | null;
  isAdmin: boolean;
}

const globalFilterAllColumns: FilterFn<Product> = (
  row: Row<Product>,
  _columnId: string,
  filterValue: string
) => {
  if (!filterValue?.trim()) return true;
  const term = filterValue.toLowerCase().trim();

  const fields = [
    row.original.name || "",
    row.original.barcode || "",
    row.original.category?.name || "",
    row.original.display_supplier?.name || "",
    ...(row.original.stocks?.map((s: any) => s.supplier_name) ?? []),
  ];

  return fields.some((val) => val?.toLowerCase().includes(term));
};

export default function ProductIndex() {
  const { props } = usePage<PageProps>();
  const { products, suppliers, categories, userRole, userSupplierId, isAdmin: propIsAdmin } = props;

  const currentIsAdmin = propIsAdmin ?? (Number(userRole) === 1);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [globalFilter, setGlobalFilter] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form for Delete
  const deleteForm = useForm({});

  const getDisplayName = (prod: any) =>
    prod?.name?.trim() || "Unnamed Product";

  const openCreate = () => setCreateOpen(true);

  const openEdit = (product: Product) => {
    setSelectedProduct(product);
    setEditOpen(true);
  };

  const openDelete = (product: Product) => {
    setSelectedProduct(product);
    setDeleteOpen(true);
  };

  const handleDelete = () => {
    if (!selectedProduct?.id) return;

    deleteForm.delete(route("products.destroy", selectedProduct.id), {
      onSuccess: () => {
        toast.success(`${getDisplayName(selectedProduct)} deleted successfully`);
        setDeleteOpen(false);
        setSelectedProduct(null);
      },
      onError: () => {
        toast.error("Cannot delete product", {
          description: "This product is used in existing orders.",
        });
      },
      preserveScroll: true,
    });
  };

  const columns = useMemo<ColumnDef<Product>[]>(() => [
    {
      id: "rowNumber",
      header: "#",
      size: 60,
      cell: ({ row }) => (
        <div className="text-center text-muted-foreground">{row.index + 1}</div>
      ),
    },
    {
      id: "product_img",
      header: "Image",
      size: 80,
      cell: ({ row }) => {
        const url = row.original.product_img;
        return url ? (
          <img
            src={url}
            alt={row.original.name}
            className="w-12 h-12 object-cover rounded-md border shadow-sm"
          />
        ) : (
          <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground border">
            No img
          </div>
        );
      },
    },
    {
      accessorKey: "name",
      header: "Product Name",
    },
    {
      accessorKey: "barcode",
      header: "Barcode",
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground tracking-wider">
          {row.original.barcode || "—"}
        </span>
      ),
    },
    {
      id: "capital",
      header: currentIsAdmin ? "Capital (main)" : "Your Capital",
      cell: ({ row }) => {
        const p = row.original;
        const capital = currentIsAdmin ? p.capital : p.my_capital;
        const formatted = currentIsAdmin ? p.formatted_capital : p.my_formatted_capital;
        return <span>₱{formatted || Number(capital || 0).toFixed(2)}</span>;
      },
    },
    {
      id: "price",
      header: currentIsAdmin ? "Price (main)" : "Your Price",
      cell: ({ row }) => {
        const p = row.original;
        const price = currentIsAdmin ? p.price : p.my_price;
        const formatted = currentIsAdmin ? p.formatted_price : p.my_formatted_price;
        return <span>₱{formatted || Number(price || 0).toFixed(2)}</span>;
      },
    },
    {
      id: "stock",
      header: currentIsAdmin ? "Total Stock" : "Your Stock",
      cell: ({ row }) => {
        const p = row.original;
        const stock = currentIsAdmin ? p.global_stock ?? 0 : p.my_stock ?? 0;
        const isLow = currentIsAdmin ? false : p.my_is_low_stock;
        const isOut = currentIsAdmin ? false : p.my_is_out_of_stock;

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  {isOut ? (
                    <Ban className="h-4 w-4 text-destructive" />
                  ) : isLow ? (
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                  ) : (
                    <Package className="h-4 w-4 text-green-600" />
                  )}
                  <span
                    className={cn(
                      "font-medium",
                      isOut && "text-destructive",
                      isLow && "text-orange-600"
                    )}
                  >
                    {currentIsAdmin ? (p.global_stock_formatted ?? stock) : p.my_stock_formatted}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {currentIsAdmin
                  ? `From ${p.suppliers_count ?? 0} supplier(s)`
                  : p.my_stock_status}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: "category.name",
      header: "Category",
      cell: ({ row }) => row.original.category?.name || "—",
    },
    {
      accessorKey: "display_supplier.name",
      header: "Supplier",
      cell: ({ row }) => row.original.display_supplier?.name || "—",
    },
    {
      accessorKey: "order_items_count",
      header: "Orders",
      size: 100,
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => openEdit(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={() => openDelete(row.original)}
            disabled={!!row.original.order_items_count}
            title={row.original.order_items_count ? "Cannot delete — has orders" : ""}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      size: 110,
    },
  ], [currentIsAdmin]);

  const table = useReactTable({
    data: products,
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

  return (
    <AdminLayout>
      <Head title="Products" />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Products</h1>
            <p className="text-muted-foreground mt-1">
              {products.length} product{products.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Product
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, barcode, category, supplier..."
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

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Product List</CardTitle>
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
                      <TableCell
                        colSpan={columns.length}
                        className="h-32 text-center text-muted-foreground"
                      >
                        No products found.
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

        {/* Create Product Dialog */}
        <CreateProduct
          open={createOpen}
          onOpenChange={setCreateOpen}
          suppliers={suppliers}
          categories={categories}
          isAdmin={currentIsAdmin}
          userSupplierId={userSupplierId}
        />

        {/* Edit Product Dialog - Now supports image update perfectly */}
        <EditProduct
          open={editOpen}
          onOpenChange={setEditOpen}
          product={selectedProduct}
          suppliers={suppliers}
          categories={categories}
          isAdmin={currentIsAdmin}
          userSupplierId={userSupplierId}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Delete Product
              </DialogTitle>
              <DialogDescription>
                Permanently delete <strong>{selectedProduct ? getDisplayName(selectedProduct) : ""}</strong>?
                <br />
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteForm.processing}
              >
                {deleteForm.processing ? "Deleting..." : "Yes, Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
