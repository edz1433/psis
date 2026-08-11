"use client";

import { Head, Link, router } from "@inertiajs/react";
import { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Trash2, Minus, Plus, ScanLine, Delete } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { routes } from "@/routes";

type Category = {
  id: number;
  name: string;
};

type Product = {
  id: number;
  name: string;
  barcode?: string | null;
  price: number;
  stock: number;
  product_img?: string | null;
  category?: Category | null;
};

type SaleItem = {
  product_id: number;
  product?: { name: string };
  quantity: number;
  price: number;
};

type Sale = {
  id: number;
  receipt_number: string;
  items: SaleItem[];
  payment_method: "cash" | "gcash" | "card";
  customer_name?: string | null;
  total: number;
  payment_amount?: number;
};

interface Props {
  sale: Sale;
  products: Product[];
  storeName: string;
}

export default function PosEdit({ sale, products, storeName }: Props) {
  const [items, setItems] = useState<SaleItem[]>(sale.items);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "gcash" | "card">(sale.payment_method);
  const [customerName, setCustomerName] = useState(sale.customer_name || "");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [tender, setTender] = useState(sale.payment_amount ?? 0);
  const [search, setSearch] = useState("");

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const tenderInputRef = useRef<HTMLInputElement | null>(null);

  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return products;

    return products.filter((product) =>
      product.name.toLowerCase().includes(term) ||
      (product.barcode ?? "").toLowerCase().includes(term)
    );
  }, [products, search]);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const totalDue = Math.max(0, subtotal - discountAmount);
  const change = paymentMethod === "cash" ? Math.max(0, tender - totalDue) : 0;

  useEffect(() => {
    if (paymentMethod !== "cash") {
      setTender(totalDue);
    }
  }, [paymentMethod, totalDue]);

  const suggestedAmounts = useMemo(() => {
    if (totalDue <= 0) return [];

    const values = [
      totalDue,
      Math.ceil(totalDue / 10) * 10,
      Math.ceil(totalDue / 20) * 20,
      Math.ceil(totalDue / 50) * 50,
      Math.ceil(totalDue / 100) * 100,
      Math.ceil(totalDue / 500) * 500,
      Math.ceil(totalDue / 1000) * 1000,
    ];

    return [...new Set(values)].sort((a, b) => a - b);
  }, [totalDue]);

  const addProduct = (product: Product) => {
    const existing = items.findIndex((i) => i.product_id === product.id);

    if (existing !== -1) {
      const nextQty = items[existing].quantity + 1;
      if (nextQty > product.stock) {
        return toast.warning("Stock limit reached");
      }

      setItems((prev) =>
        prev.map((item, idx) =>
          idx === existing ? { ...item, quantity: nextQty } : item
        )
      );
    } else {
      if (product.stock < 1) {
        return toast.error("Out of stock");
      }

      setItems((prev) => [
        ...prev,
        {
          product_id: product.id,
          quantity: 1,
          price: product.price,
          product: { name: product.name },
        },
      ]);
    }

    toast.success("Item added", { description: product.name });
  };

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty < 1) return;

    const item = items[index];
    const product = products.find((p) => p.id === item.product_id);
    const maxStock = product?.stock ?? newQty;
    const safeQty = Math.min(newQty, maxStock);

    if (newQty > maxStock) {
      toast.warning("Stock limit reached");
    }

    setItems((prev) => prev.map((entry, i) => (i === index ? { ...entry, quantity: safeQty } : entry)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const setExactTender = () => {
    setTender(totalDue);
    requestAnimationFrame(() => tenderInputRef.current?.focus());
  };

  const appendTenderDigit = (digit: string) => {
    if (paymentMethod !== "cash") return;

    const current = tender > 0 ? String(Math.floor(tender)) : "";
    const next = current === "0" ? digit : `${current}${digit}`;
    setTender(Number(next));
    requestAnimationFrame(() => tenderInputRef.current?.focus());
  };

  const backspaceTender = () => {
    if (paymentMethod !== "cash") return;

    const current = tender > 0 ? String(Math.floor(tender)) : "";
    const next = current.slice(0, -1);
    setTender(next ? Number(next) : 0);
    requestAnimationFrame(() => tenderInputRef.current?.focus());
  };

  const clearTender = () => {
    if (paymentMethod !== "cash") return;
    setTender(0);
    requestAnimationFrame(() => tenderInputRef.current?.focus());
  };

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;

    const term = search.trim().toLowerCase();
    if (!term) return;

    const exact = products.find((p) =>
      p.name.toLowerCase() === term ||
      (p.barcode ?? "").toLowerCase() === term
    );

    if (exact) {
      addProduct(exact);
      setSearch("");
      return;
    }

    if (filteredProducts.length === 1) {
      addProduct(filteredProducts[0]);
      setSearch("");
    }
  };

  const saveChanges = () => {
    if (items.length === 0) {
      return toast.error("Sale must have at least one item");
    }

    if (paymentMethod === "cash" && tender < totalDue) {
      return toast.error("Insufficient tender");
    }

    const postData = {
      items: items.map((item) => ({ id: item.product_id, qty: item.quantity })),
      payment_method: paymentMethod,
      tender: paymentMethod === "cash" ? tender : null,
      customer_name: customerName || null,
      discount_percent: discountPercent,
    };

    const csrfToken =
      document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";

    fetch(routes.pos.update(sale.id), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-CSRF-TOKEN": csrfToken,
      },
      body: JSON.stringify(postData),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to update sale");
        }
        return data;
      })
      .then(() => {
        toast.success("Sale updated successfully");
        router.visit(routes.pos.history());
      })
      .catch((err) => {
        toast.error("Failed to update sale", { description: err.message });
      });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      const isTyping = activeTag === "input" || activeTag === "textarea";

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveChanges();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (paymentMethod === "cash" && !isTyping) {
        if (/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          appendTenderDigit(e.key);
          return;
        }

        if (e.key === "Backspace") {
          e.preventDefault();
          backspaceTender();
          return;
        }

        if (e.key === "Delete") {
          e.preventDefault();
          clearTender();
          return;
        }
      }

      if (e.key === "F8") {
        e.preventDefault();
        setExactTender();
        return;
      }

      if (e.key === "F9") {
        e.preventDefault();
        setPaymentMethod("cash");
        return;
      }

      if (e.key === "F10") {
        e.preventDefault();
        setPaymentMethod("gcash");
        return;
      }

      if (e.key === "F11") {
        e.preventDefault();
        setPaymentMethod("card");
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [paymentMethod, items, tender, totalDue, customerName, discountPercent]);

  return (
    <AdminLayout>
      <Head title={`Edit Sale #${sale.receipt_number}`} />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="outline" size="icon" asChild>
              <Link href={routes.pos.history()}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Edit Sale #{sale.receipt_number}</h1>
              <p className="text-slate-600">{storeName}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-7">
              <CardHeader>
                <CardTitle>Add / Modify Items</CardTitle>
                <div className="relative mt-3">
                  <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    ref={searchInputRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleSearchKey}
                    placeholder="Scan barcode or search product..."
                    className="pl-10"
                  />
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredProducts.map((product) => (
                    <Card
                      key={product.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => addProduct(product)}
                    >
                      <CardContent className="p-4">
                        <p className="font-medium line-clamp-2">{product.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{product.barcode || "No barcode"}</p>
                        <div className="mt-2 flex justify-between text-sm">
                          <span>₱{product.price.toLocaleString()}</span>
                          <Badge variant="secondary">{product.stock} left</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-5">
              <CardHeader>
                <CardTitle>Current Items ({items.length})</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                {items.length === 0 ? (
                  <p className="text-center py-8 text-slate-500">
                    No items yet. Add from left panel.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-auto pr-2">
                    {items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between border p-3 rounded-lg gap-3">
                        <div className="flex-1">
                          <p className="font-medium">{item.product?.name}</p>
                          <p className="text-sm text-slate-500">
                            ₱{item.price.toLocaleString()} × {item.quantity}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => updateQuantity(index, item.quantity - 1)}>
                            <Minus className="h-4 w-4" />
                          </Button>

                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateQuantity(index, parseInt(e.target.value || "1", 10))}
                            className="w-16 text-center"
                          />

                          <Button size="sm" variant="outline" onClick={() => updateQuantity(index, item.quantity + 1)}>
                            <Plus className="h-4 w-4" />
                          </Button>

                          <Button size="sm" variant="ghost" onClick={() => removeItem(index)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <Label>Customer Name (optional)</Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Walk-in"
                    />
                  </div>

                  <div>
                    <Label>Discount %</Label>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {[0, 5, 10, 20].map((value) => (
                        <Button
                          key={value}
                          type="button"
                          variant={discountPercent === value ? "default" : "outline"}
                          onClick={() => setDiscountPercent(value)}
                        >
                          {value}%
                        </Button>
                      ))}
                    </div>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(Math.min(100, parseFloat(e.target.value) || 0))}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>Payment Method</Label>
                    <RadioGroup
                      value={paymentMethod}
                      onValueChange={(value) => setPaymentMethod(value as "cash" | "gcash" | "card")}
                      className="flex gap-4 mt-2"
                    >
                      {["cash", "gcash", "card"].map((method) => (
                        <div
                          key={method}
                          className={cn(
                            "border rounded-lg p-3 cursor-pointer flex-1 text-center",
                            paymentMethod === method && "border-primary bg-primary/5"
                          )}
                        >
                          <RadioGroupItem value={method} id={method} className="sr-only" />
                          <Label htmlFor={method} className="cursor-pointer capitalize">
                            {method}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  {paymentMethod === "cash" ? (
                    <div className="space-y-3">
                      <Label>Tender Amount</Label>
                      <Input
                        ref={tenderInputRef}
                        type="number"
                        value={tender || ""}
                        onChange={(e) => setTender(parseFloat(e.target.value) || 0)}
                        className="text-2xl font-bold"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <Button type="button" variant="secondary" onClick={setExactTender}>
                          Exact Amount
                        </Button>
                        <Button type="button" variant="outline" onClick={clearTender}>
                          Clear
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {suggestedAmounts.map((amt) => (
                          <Button type="button" key={amt} variant="outline" onClick={() => setTender(amt)}>
                            ₱{amt.toLocaleString()}
                          </Button>
                        ))}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {["7", "8", "9", "4", "5", "6", "1", "2", "3"].map((digit) => (
                          <Button
                            key={digit}
                            type="button"
                            variant="outline"
                            className="h-11 text-lg font-bold"
                            onClick={() => appendTenderDigit(digit)}
                          >
                            {digit}
                          </Button>
                        ))}
                        <Button type="button" variant="outline" className="h-11" onClick={backspaceTender}>
                          <Delete className="h-5 w-5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 text-lg font-bold"
                          onClick={() => appendTenderDigit("0")}
                        >
                          0
                        </Button>
                        <Button type="button" variant="outline" className="h-11" onClick={clearTender}>
                          C
                        </Button>
                      </div>

                      <div
                        className={cn(
                          "p-3 rounded-lg text-sm font-medium text-center",
                          tender >= totalDue ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                        )}
                      >
                        {tender >= totalDue
                          ? `Change: ₱${change.toLocaleString()}`
                          : `Need ₱${(totalDue - tender).toLocaleString()} more`}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-slate-50 p-4">
                      <p className="text-sm text-slate-600">Non-cash uses exact payment.</p>
                      <p className="text-2xl font-bold text-primary mt-2">
                        ₱{totalDue.toLocaleString()}
                      </p>
                    </div>
                  )}

                  <div className="pt-4 border-t space-y-2 text-lg">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>₱{subtotal.toLocaleString()}</span>
                    </div>

                    {discountPercent > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Discount ({discountPercent}%)</span>
                        <span>- ₱{discountAmount.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex justify-between font-bold text-xl pt-2 border-t">
                      <span>Total Due</span>
                      <span>₱{totalDue.toLocaleString()}</span>
                    </div>
                  </div>

                  <Button onClick={saveChanges} className="w-full h-12 text-lg" disabled={items.length === 0}>
                    <Save className="mr-2 h-5 w-5" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
