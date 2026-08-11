"use client";

import { Head, Link } from "@inertiajs/react";
import { useMemo, useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Eye, Edit, Search } from "lucide-react";
import { format } from "date-fns";
import { routes } from "@/routes";

type Sale = {
  id: number;
  receipt_number: string;
  created_at: string;
  customer_name: string | null;
  payment_method: string;
  total: number;
  payment_amount?: number;
  change: number;
  notes?: string | null;
  items: Array<{
    product: { name: string };
    quantity: number;
    price: number;
  }>;
};

interface Props {
  sales: Sale[];
  storeName: string;
}

export default function PosHistory({ sales, storeName }: Props) {
  const [search, setSearch] = useState("");

  const filteredSales = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return sales;

    return sales.filter((sale) => {
      const customer = (sale.customer_name || "walk-in").toLowerCase();
      const receipt = sale.receipt_number.toLowerCase();
      const payment = sale.payment_method.toLowerCase();
      const itemNames = sale.items.map((item) => item.product.name.toLowerCase()).join(" ");

      return (
        customer.includes(term) ||
        receipt.includes(term) ||
        payment.includes(term) ||
        itemNames.includes(term)
      );
    });
  }, [sales, search]);

  return (
    <AdminLayout>
      <Head title="Sales History" />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="max-w-screen-2xl mx-auto px-4 py-6 md:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" asChild>
                <Link href={routes.pos.index()}>
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Sales History</h1>
                <p className="text-slate-600">{storeName}</p>
              </div>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search receipt, customer, item..."
                className="pl-9"
              />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Transactions ({filteredSales.length})</CardTitle>
            </CardHeader>

            <CardContent>
              {filteredSales.length === 0 ? (
                <p className="text-center py-12 text-slate-500">No matching sales found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Tender</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {filteredSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          {format(new Date(sale.created_at), "MMM dd, yyyy • HH:mm")}
                        </TableCell>
                        <TableCell className="font-medium">{sale.receipt_number}</TableCell>
                        <TableCell>{sale.customer_name || "Walk-in"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {sale.payment_method}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ₱{sale.total.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          ₱{(sale.payment_amount ?? sale.total).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          ₱{sale.change.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={routes.pos.show(sale.id)}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <Link href={routes.pos.edit(sale.id)}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
