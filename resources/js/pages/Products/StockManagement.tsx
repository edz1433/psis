import { FormEvent, useMemo, useState } from "react";
import { Head, useForm } from "@inertiajs/react";
import { route } from "ziggy-js";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRightLeft,
  Boxes,
  ClipboardList,
  PackagePlus,
  Search,
} from "lucide-react";

import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type MovementType =
  | "restock"
  | "damaged"
  | "expired"
  | "transfer"
  | "correction_add"
  | "correction_deduct";

interface StockRecord {
  id: number;
  product_id: number;
  product_name: string;
  barcode?: string | null;
  category?: string | null;
  supplier_id: number;
  supplier_name: string;
  stock: number;
  capital: number;
  markup: number;
  price: number;
  status: string;
}

interface Movement {
  id: number;
  type: string;
  quantity: number;
  stock_before: number;
  stock_after: number;
  reference_no?: string | null;
  remarks?: string | null;
  created_at?: string | null;
  product_name: string;
  supplier_name: string;
  destination_supplier_name?: string | null;
  user_name?: string | null;
}

interface Supplier {
  id: number;
  name: string;
}

interface PageProps {
  stocks: StockRecord[];
  movements: Movement[];
  suppliers: Supplier[];
  isAdmin: boolean;
  userSupplierId: number | null;
}

const movementOptions: Array<{ value: MovementType; label: string; description: string }> = [
  { value: "restock", label: "Restock", description: "Add newly received stock." },
  { value: "damaged", label: "Damaged", description: "Deduct stock that can no longer be sold." },
  { value: "expired", label: "Expired", description: "Deduct expired items from inventory." },
  { value: "transfer", label: "Transfer", description: "Move stock to another supplier/campus." },
  { value: "correction_add", label: "Correction Add", description: "Increase stock after a count correction." },
  { value: "correction_deduct", label: "Correction Deduct", description: "Decrease stock after a count correction." },
];

const movementLabels: Record<string, string> = {
  restock: "Restock",
  damaged: "Damaged",
  expired: "Expired",
  transfer: "Transfer Out",
  transfer_in: "Transfer In",
  correction_add: "Correction Add",
  correction_deduct: "Correction Deduct",
};

const movementTone: Record<string, string> = {
  restock: "bg-emerald-50 text-emerald-700 border-emerald-200",
  transfer_in: "bg-emerald-50 text-emerald-700 border-emerald-200",
  damaged: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-red-50 text-red-700 border-red-200",
  transfer: "bg-blue-50 text-blue-700 border-blue-200",
  correction_add: "bg-amber-50 text-amber-700 border-amber-200",
  correction_deduct: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function StockManagement({ stocks, movements, suppliers }: PageProps) {
  const [search, setSearch] = useState("");

  const form = useForm({
    product_stock_id: "",
    type: "damaged" as MovementType,
    quantity: "",
    destination_supplier_id: "",
    reference_no: "",
    remarks: "",
  });

  const selectedStock = useMemo(
    () => stocks.find((stock) => stock.id.toString() === form.data.product_stock_id),
    [form.data.product_stock_id, stocks],
  );

  const filteredStocks = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return stocks;

    return stocks.filter((stock) =>
      [
        stock.product_name,
        stock.barcode ?? "",
        stock.category ?? "",
        stock.supplier_name,
        stock.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [search, stocks]);

  const submit = (event: FormEvent) => {
    event.preventDefault();

    if (!form.data.product_stock_id || !form.data.quantity) {
      toast.warning("Select a product stock and enter a quantity.");
      return;
    }

    if (form.data.type === "transfer" && !form.data.destination_supplier_id) {
      toast.warning("Select a destination supplier for transfer.");
      return;
    }

    form.post(route("products.stock-management.store"), {
      preserveScroll: true,
      onSuccess: () => {
        toast.success("Stock movement recorded");
        form.reset("quantity", "destination_supplier_id", "reference_no", "remarks");
      },
      onError: (errors) => {
        toast.error("Could not record stock movement", {
          description: Object.values(errors).join("\n") || "Please check the form.",
        });
      },
    });
  };

  return (
    <AdminLayout>
      <Head title="Stock Management" />

      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Stock Management</h1>
          <p className="text-muted-foreground">
            Record damaged, expired, transferred, restocked, and corrected inventory without editing product records.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-emerald-700" />
                New Stock Movement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-5">
                <div className="space-y-2">
                  <Label>Product Stock</Label>
                  <Select
                    value={form.data.product_stock_id}
                    onValueChange={(value) => form.setData("product_stock_id", value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select product stock" />
                    </SelectTrigger>
                    <SelectContent>
                      {stocks.map((stock) => (
                        <SelectItem key={stock.id} value={stock.id.toString()}>
                          {stock.product_name} - {stock.supplier_name} ({stock.stock})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.errors.product_stock_id && (
                    <p className="text-sm text-destructive">{form.errors.product_stock_id}</p>
                  )}
                </div>

                {selectedStock && (
                  <div className="rounded-md border bg-muted/40 p-3 text-sm">
                    <div className="font-medium">{selectedStock.product_name}</div>
                    <div className="mt-1 text-muted-foreground">
                      {selectedStock.supplier_name} · Current stock:{" "}
                      <span className="font-semibold text-foreground">{selectedStock.stock}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Movement Type</Label>
                  <Select
                    value={form.data.type}
                    onValueChange={(value) => form.setData("type", value as MovementType)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {movementOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {movementOptions.find((option) => option.value === form.data.type)?.description}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    value={form.data.quantity}
                    onChange={(event) => form.setData("quantity", event.target.value)}
                    placeholder="0"
                  />
                  {form.errors.quantity && <p className="text-sm text-destructive">{form.errors.quantity}</p>}
                </div>

                {form.data.type === "transfer" && (
                  <div className="space-y-2">
                    <Label>Destination Supplier</Label>
                    <Select
                      value={form.data.destination_supplier_id}
                      onValueChange={(value) => form.setData("destination_supplier_id", value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select destination" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers
                          .filter((supplier) => supplier.id !== selectedStock?.supplier_id)
                          .map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id.toString()}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {form.errors.destination_supplier_id && (
                      <p className="text-sm text-destructive">{form.errors.destination_supplier_id}</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="reference_no">Reference No.</Label>
                  <Input
                    id="reference_no"
                    value={form.data.reference_no}
                    onChange={(event) => form.setData("reference_no", event.target.value)}
                    placeholder="DR, memo, count sheet, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={form.data.remarks}
                    onChange={(event) => form.setData("remarks", event.target.value)}
                    placeholder="Reason or notes"
                  />
                  {form.errors.remarks && <p className="text-sm text-destructive">{form.errors.remarks}</p>}
                </div>

                <Button type="submit" className="w-full" disabled={form.processing}>
                  {form.data.type === "transfer" ? (
                    <ArrowRightLeft className="h-4 w-4" />
                  ) : form.data.type === "restock" ? (
                    <PackagePlus className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  {form.processing ? "Saving..." : "Record Movement"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-emerald-700" />
                  Current Stock
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search product, barcode, supplier..."
                    className="pl-9"
                  />
                </div>

                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStocks.length ? (
                        filteredStocks.map((stock) => (
                          <TableRow key={stock.id}>
                            <TableCell>
                              <div className="font-medium">{stock.product_name}</div>
                              <div className="text-xs text-muted-foreground">{stock.barcode || "No barcode"}</div>
                            </TableCell>
                            <TableCell>{stock.supplier_name}</TableCell>
                            <TableCell>{stock.category || "-"}</TableCell>
                            <TableCell className="text-right font-semibold">{stock.stock}</TableCell>
                            <TableCell>{stock.status}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                            No stock records found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Movements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Before</TableHead>
                        <TableHead className="text-right">After</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.length ? (
                        movements.map((movement) => (
                          <TableRow key={movement.id}>
                            <TableCell className="whitespace-nowrap">{movement.created_at}</TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  "inline-flex rounded-md border px-2 py-1 text-xs font-medium",
                                  movementTone[movement.type] ?? "bg-muted text-muted-foreground",
                                )}
                              >
                                {movementLabels[movement.type] ?? movement.type}
                              </span>
                            </TableCell>
                            <TableCell>{movement.product_name}</TableCell>
                            <TableCell>
                              <div>{movement.supplier_name}</div>
                              {movement.destination_supplier_name && (
                                <div className="text-xs text-muted-foreground">
                                  To {movement.destination_supplier_name}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-semibold">{movement.quantity}</TableCell>
                            <TableCell className="text-right">{movement.stock_before}</TableCell>
                            <TableCell className="text-right">{movement.stock_after}</TableCell>
                            <TableCell>{movement.reference_no || "-"}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                            No stock movements yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
