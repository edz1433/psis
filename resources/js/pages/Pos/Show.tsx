"use client";

import { Head, Link } from "@inertiajs/react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Edit, Printer } from "lucide-react";
import { format } from "date-fns";

type SaleItem = {
  product: { name: string };
  quantity: number;
  price: number;
};

type Sale = {
  id: number;
  receipt_number: string;
  created_at: string;
  customer_name: string | null;
  payment_method: string;
  total: number;
  payment_amount?: number;
  change: number;
  items: SaleItem[];
  notes?: string | null;
};

interface Props {
  sale: Sale;
  storeName: string;
}

export default function PosShow({ sale, storeName }: Props) {
  const subtotal = sale.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <AdminLayout>
      <Head title={`Sale #${sale.receipt_number}`} />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 print:bg-white">
        <div className="max-w-screen-2xl mx-auto px-4 py-6 md:px-6 lg:px-8 print:px-0 print:py-0">
          <div className="flex items-center justify-between mb-6 print:hidden">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" asChild>
                <Link href="/pos/history">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Sale Details</h1>
                <p className="text-slate-600">{storeName}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href={`/pos/${sale.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Sale
                </Link>
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print Receipt
              </Button>
            </div>
          </div>

          <div className="hidden print:block text-center mb-6">
            <h1 className="text-2xl font-bold">{storeName}</h1>
            <p className="text-sm">Receipt #{sale.receipt_number}</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-12 print:block">
            <Card className="lg:col-span-8 print:shadow-none print:border-0">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Receipt #{sale.receipt_number}</span>
                  <Badge variant="secondary" className="capitalize">
                    {sale.payment_method}
                  </Badge>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Date & Time</p>
                    <p className="font-medium">
                      {format(new Date(sale.created_at), "MMM dd, yyyy • HH:mm")}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Customer</p>
                    <p className="font-medium">{sale.customer_name || "Walk-in"}</p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sale.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.product.name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">₱{item.price.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium">
                          ₱{(item.price * item.quantity).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {sale.notes && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-slate-500">Notes</p>
                    <p className="text-sm">{sale.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-4 print:shadow-none print:border-0 print:mt-6">
              <CardHeader>
                <CardTitle>Transaction Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-lg">
                  <span>Subtotal</span>
                  <span>₱{subtotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-lg">
                  <span>Tender</span>
                  <span>₱{(sale.payment_amount ?? sale.total).toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-2xl font-bold pt-4 border-t">
                  <span>Total</span>
                  <span className="text-primary">₱{sale.total.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-green-600">
                  <span>Change</span>
                  <span>₱{sale.change.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body {
            background: white !important;
          }
        }
      `}</style>
    </AdminLayout>
  );
}