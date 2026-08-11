"use client";

import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Printer, X } from "lucide-react";

type Sale = {
  receipt_number?: string;
  total_due: number;
  items: Array<{ id: number; name: string; price: number; quantity: number }>;
  payment_method: string;
  tender: number;
  customer_name?: string;
  discount_percent: number;
};

interface ReceiptTemplateProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
  storeName: string;
}

export default function ReceiptTemplate({
  open,
  onOpenChange,
  sale,
  storeName,
}: ReceiptTemplateProps) {
  if (!sale) return null;

  const subtotal = sale.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = subtotal * (sale.discount_percent / 100);
  const change = sale.payment_method === "cash" ? sale.tender - sale.total_due : 0;

  const currentDate = new Date().toLocaleString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const handlePrint = () => window.print();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl no-print">
        <div
          id="receipt"
          className="receipt bg-white p-8 text-sm font-mono leading-tight text-black max-w-[320px] mx-auto"
        >
          <div className="text-center mb-6">
            <div className="text-2xl font-bold tracking-widest mb-1">
              {storeName.toUpperCase()}
            </div>
            <div className="text-xs text-gray-600">OFFICIAL RECEIPT</div>
            <div className="text-[10px] text-gray-500 mt-1">Thank you for shopping!</div>
          </div>

          <div className="text-[10px] space-y-0.5 mb-4">
            <div className="flex justify-between">
              <span>Receipt #</span>
              <span className="font-medium">#{sale.receipt_number || "00000"}</span>
            </div>
            <div className="flex justify-between">
              <span>Date</span>
              <span>{currentDate}</span>
            </div>
            {sale.customer_name && sale.customer_name !== "Walk-in" && (
              <div className="flex justify-between">
                <span>Customer</span>
                <span>{sale.customer_name}</span>
              </div>
            )}
          </div>

          <Separator className="my-3" />

          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-1 font-medium">ITEM</th>
                <th className="pb-1 text-center font-medium">QTY</th>
                <th className="pb-1 text-right font-medium">PRICE</th>
                <th className="pb-1 text-right font-medium">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-1.5 pr-2 max-w-[140px] break-words">{item.name}</td>
                  <td className="py-1.5 text-center">{item.quantity}</td>
                  <td className="py-1.5 text-right">₱{item.price.toLocaleString()}</td>
                  <td className="py-1.5 text-right font-medium">
                    ₱{(item.price * item.quantity).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Separator className="my-4" />

          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₱{subtotal.toLocaleString()}</span>
            </div>
            {sale.discount_percent > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount ({sale.discount_percent}%)</span>
                <span>- ₱{discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold pt-2 border-t">
              <span>TOTAL DUE</span>
              <span>₱{sale.total_due.toLocaleString()}</span>
            </div>
            {sale.payment_method === "cash" && (
              <>
                <div className="flex justify-between">
                  <span>Cash Tendered</span>
                  <span>₱{sale.tender.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-green-600">
                  <span>CHANGE</span>
                  <span>₱{change.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>

          <Separator className="my-6" />

          <div className="text-center text-[10px] text-gray-500 mb-6">
            Payment: <span className="font-medium uppercase">{sale.payment_method}</span>
          </div>

          <div className="text-center text-[10px] text-gray-400">
            Powered by Your Store • {new Date().getFullYear()}
            <br />
            Have a great day!
          </div>
        </div>

        <DialogFooter className="no-print px-6 py-4 border-t bg-gray-50 flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            <X className="mr-2 h-4 w-4" /> Close
          </Button>
          <Button onClick={handlePrint} className="flex-1 bg-primary hover:bg-primary/90">
            <Printer className="mr-2 h-4 w-4" /> Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>

      <style>{`
        @media print {
          .no-print, .no-print * { display: none !important; }
          body * { visibility: hidden; }
          #receipt, #receipt * { visibility: visible; }
          #receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            margin: 0 auto;
            padding: 10mm 8mm;
            box-shadow: none;
          }
        }
      `}</style>
    </Dialog>
  );
}