"use client";

import { Head, Link, router, usePage } from "@inertiajs/react";
import { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Package,
  Coffee,
  Shirt,
  Smartphone,
  Sparkles,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Check,
  ChevronsUpDown,
  History,
  ScanLine,
  Percent,
  Delete,
  Keyboard,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import ReceiptTemplate from "./ReceiptTemplate";

type Category = { id: number; name: string };

type Product = {
  id: number;
  name: string;
  barcode?: string | null;
  product_img?: string | null;
  price: number;
  stock: number;
  category: Category | null;
};

type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

interface Props {
  products: Product[];
  categories: Category[];
  storeName: string;
}

export default function PosIndex({
  products,
  categories: propCategories,
  storeName,
}: Props) {
  const { flash }: any = usePage().props;

  // Safe CSRF Token
  const csrfToken = useMemo(() => {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
  }, []);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "gcash" | "card">("cash");
  const [tender, setTender] = useState<number>(0);
  const [customerName, setCustomerName] = useState("");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const customerInputRef = useRef<HTMLInputElement | null>(null);
  const tenderInputRef = useRef<HTMLInputElement | null>(null);

  const ITEMS_PER_PAGE = 10;

  const [lastSale, setLastSale] = useState<{
    receipt_number?: string;
    total_due: number;
    items: CartItem[];
    payment_method: string;
    tender: number;
    customer_name?: string;
    discount_percent: number;
  } | null>(null);

  useEffect(() => {
    if (flash?.success) toast.success(flash.success);
    if (flash?.errors?.error) {
      toast.error("Transaction Failed", { description: flash.errors.error });
    }
  }, [flash]);

  useEffect(() => {
    if (lastSale !== null && !showReceipt) {
      router.reload();
      setLastSale(null);
    }
  }, [lastSale, showReceipt]);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (selectedCategory !== null) {
      result = result.filter((p) => p.category?.id === selectedCategory);
    }

    if (search.trim()) {
      const term = search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.barcode ?? "").toLowerCase().includes(term)
      );
    }

    return result;
  }, [products, search, selectedCategory]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory]);

  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
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

  const addToCart = (p: Product) => {
    if (p.stock < 1) {
      return toast.error("Out of stock", { description: p.name });
    }

    setCart((prev) => {
      const exist = prev.find((i) => i.id === p.id);

      if (exist) {
        return prev.map((i) =>
          i.id === p.id
            ? { ...i, quantity: Math.min(p.stock, i.quantity + 1) }
            : i
        );
      }

      return [...prev, { id: p.id, name: p.name, price: p.price, quantity: 1 }];
    });

    toast.success("Added", { description: p.name });
  };

  const updateQty = (id: number, qty: number) => {
    const product = products.find((p) => p.id === id);
    const maxStock = product?.stock ?? 0;

    if (maxStock <= 0) {
      return removeItem(id);
    }

    const safeQty = Math.min(Math.max(1, qty), maxStock);

    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: safeQty } : item))
    );
  };

  const changeQtyBy = (id: number, delta: number) => {
    const item = cart.find((i) => i.id === id);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty < 1) {
      return removeItem(id);
    }

    updateQty(id, newQty);
  };

  const removeItem = (id: number) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    toast.success("Cart cleared");
  };

  const getProductIcon = (categoryName?: string) => {
    const cat = (categoryName || "").toLowerCase();
    if (cat.includes("food") || cat.includes("snack") || cat.includes("meal")) return Package;
    if (cat.includes("drink") || cat.includes("beverage") || cat.includes("coffee")) return Coffee;
    if (cat.includes("cloth") || cat.includes("wear") || cat.includes("apparel")) return Shirt;
    if (cat.includes("elect") || cat.includes("gadget") || cat.includes("phone")) return Smartphone;
    if (cat.includes("beauty") || cat.includes("cosmetic")) return Sparkles;
    return ShoppingBag;
  };

  const selectedCategoryName = useMemo(() => {
    if (selectedCategory === null) return "All Categories";
    return propCategories.find((c) => c.id === selectedCategory)?.name ?? "All Categories";
  }, [selectedCategory, propCategories]);

  const applyQuickDiscount = (value: number) => {
    setDiscountPercent(value);
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

    const exact = products.find(
      (p) =>
        p.name.toLowerCase() === term ||
        (p.barcode ?? "").toLowerCase() === term
    );

    if (exact) {
      addToCart(exact);
      setSearch("");
      return;
    }

    if (filteredProducts.length === 1) {
      addToCart(filteredProducts[0]);
      setSearch("");
    }
  };

  // Updated finishTransaction with proper CSRF and error handling
  const finishTransaction = () => {
    if (cart.length === 0) {
      return toast.error("Cart is empty");
    }

    if (paymentMethod === "cash" && tender < totalDue) {
      return toast.error("Insufficient tender", {
        description: `Required: ₱${totalDue.toLocaleString()} – Entered: ₱${tender.toLocaleString()}`,
      });
    }

    const postData = {
      items: cart.map((i) => ({ id: i.id, qty: i.quantity })),
      payment_method: paymentMethod,
      tender: paymentMethod === "cash" ? tender : null,
      customer_name: customerName || null,
      discount_percent: discountPercent,
    };

    if (!csrfToken) {
      return toast.error("Security Error", {
        description: "CSRF token is missing. Please refresh the page.",
      });
    }

    const salePromise = fetch("/pos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(postData),
    }).then(async (res) => {
      const text = await res.text();

      if (!res.ok) {
        let err;
        try {
          err = JSON.parse(text);
        } catch {
          err = { message: "Transaction failed" };
        }
        throw new Error(err.message || "Transaction failed");
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid response from server");
      }

      if (!data.success) throw new Error(data.message || "Sale failed");
      return data;
    });

    toast.promise(salePromise, {
      loading: "Processing sale...",
      success: (data: any) => `Sale completed • ₱${(data.total || totalDue).toLocaleString()}`,
      error: (err: any) => err.message || "Failed to complete sale",
    });

    salePromise.then((data: any) => {
      const saleData = {
        receipt_number: data.receipt_number,
        total_due: data.total ?? totalDue,
        items: [...cart],
        payment_method: paymentMethod,
        tender: paymentMethod === "cash" ? tender : (data.total ?? totalDue),
        customer_name: customerName || "Walk-in",
        discount_percent: discountPercent,
      };

      setLastSale(saleData);
      setCart([]);
      setShowDialog(false);
      setTender(0);
      setDiscountPercent(0);
      setCustomerName("");
      setSearch("");
      setShowReceipt(true);
    }).catch((err) => {
      console.error("Sale error:", err);
    });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      const isTyping = activeTag === "input" || activeTag === "textarea";

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "backspace") {
        e.preventDefault();
        clearCart();
        return;
      }

      if (e.key === "F2") {
        e.preventDefault();
        if (cart.length > 0) setShowDialog(true);
        return;
      }

      if (e.key === "F4") {
        e.preventDefault();
        if (showDialog) {
          customerInputRef.current?.focus();
          customerInputRef.current?.select();
        }
        return;
      }

      if (e.key === "F8") {
        e.preventDefault();
        if (showDialog) setExactTender();
        return;
      }

      if (e.key === "F9") {
        e.preventDefault();
        if (showDialog) setPaymentMethod("cash");
        return;
      }

      if (e.key === "F10") {
        e.preventDefault();
        if (showDialog) setPaymentMethod("gcash");
        return;
      }

      if (e.key === "F11") {
        e.preventDefault();
        if (showDialog) setPaymentMethod("card");
        return;
      }

      if (showDialog && paymentMethod === "cash" && !isTyping) {
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

        if (e.key === ".") {
          e.preventDefault();
          return;
        }
      }

      if (showDialog && e.key === "Enter") {
        if (
          document.activeElement instanceof HTMLButtonElement ||
          document.activeElement?.getAttribute("role") === "button"
        ) {
          return;
        }

        if (cart.length > 0) {
          e.preventDefault();
          finishTransaction();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showDialog, cart.length, paymentMethod, totalDue, tender, finishTransaction]);

  useEffect(() => {
    if (showDialog) {
      setTimeout(() => {
        if (paymentMethod === "cash") {
          tenderInputRef.current?.focus();
          tenderInputRef.current?.select();
        } else {
          customerInputRef.current?.focus();
        }
      }, 50);
    }
  }, [showDialog, paymentMethod]);

  return (
    <AdminLayout>
      <Head title="POS - Cashier" />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="max-w-screen-2xl mx-auto px-4 py-6 md:px-6 lg:px-8">
          {/* Header & Filters */}
          <div className="mb-8 space-y-6 md:space-y-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
              <div className="flex flex-wrap items-center gap-4 md:gap-6">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                    Point of Sale
                  </h1>
                  <p className="text-lg text-slate-600 mt-1">{storeName}</p>
                </div>

                <Button variant="outline" asChild>
                  <Link href="/pos/history">
                    <History className="mr-2 h-4 w-4" />
                    Sales History
                  </Link>
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto md:min-w-[480px] lg:min-w-[560px]">
                <div className="w-full sm:w-56 md:w-64 shrink-0">
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between rounded-xl h-11 border-slate-300 focus:border-primary focus:ring-primary/20"
                      >
                        {selectedCategoryName}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search category..." />
                        <CommandList>
                          <CommandEmpty>No category found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="all"
                              onSelect={() => {
                                setSelectedCategory(null);
                                setOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedCategory === null ? "opacity-100" : "opacity-0"
                                )}
                              />
                              All Categories
                            </CommandItem>
                            {propCategories.map((cat) => (
                              <CommandItem
                                key={cat.id}
                                value={cat.name.toLowerCase()}
                                onSelect={() => {
                                  setSelectedCategory(cat.id);
                                  setOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedCategory === cat.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {cat.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="relative flex-1">
                  <ScanLine className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Scan barcode or search product..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={handleSearchKey}
                    className="pl-10 h-11 rounded-xl border-slate-300 focus:border-primary focus:ring-primary/20 w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8">
            {/* Products Grid */}
            <div className="lg:col-span-8 xl:col-span-9">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
                  <Search className="h-16 w-16 mb-4 opacity-40" />
                  <h3 className="text-xl font-medium">No products found</h3>
                  <p className="text-sm mt-2">Try changing search or category</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6">
                    {paginatedProducts.map((p) => {
                      const isLowStock = p.stock > 0 && p.stock <= 5;
                      const isOutOfStock = p.stock <= 0;
                      const Icon = getProductIcon(p.category?.name);

                      return (
                        <Card
                          key={p.id}
                          className={cn(
                            "overflow-hidden border border-slate-200 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/30 cursor-pointer group",
                            isOutOfStock && "opacity-60 pointer-events-none"
                          )}
                          onClick={() => !isOutOfStock && addToCart(p)}
                        >
                          <div className="aspect-square bg-slate-50 relative overflow-hidden flex items-center justify-center">
                            {p.product_img ? (
                              <img
                                src={p.product_img}
                                alt={p.name}
                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <Icon
                                className="h-16 w-16 text-slate-300 group-hover:text-slate-400 transition-colors"
                                strokeWidth={1.2}
                              />
                            )}

                            {isLowStock && (
                              <Badge variant="destructive" className="absolute top-2 right-2 text-xs">
                                Low
                              </Badge>
                            )}
                            {isOutOfStock && (
                              <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
                                Out
                              </Badge>
                            )}
                          </div>

                          <CardContent className="p-3.5">
                            <h3 className="font-medium text-sm line-clamp-2 min-h-[2.5rem] mb-2 group-hover:text-primary transition-colors">
                              {p.name}
                            </h3>

                            <div className="text-[11px] text-slate-500 mb-2 h-4 truncate">
                              {p.barcode || "No barcode"}
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="text-lg font-bold text-primary">
                                ₱{p.price.toLocaleString()}
                              </div>
                              <Badge variant={isLowStock ? "destructive" : "secondary"} className="text-xs">
                                {p.stock} left
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-8">
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      <span className="text-sm font-medium">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Cart Sidebar */}
            <div className="lg:col-span-4 xl:col-span-3">
              <Card className="sticky top-6 border-primary/20 shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="from-primary/5 to-primary/10 py-4 px-6">
                  <CardTitle className="flex items-center justify-between text-xl">
                    <div className="flex items-center gap-2.5">
                      <ShoppingCart className="h-5 w-5 text-primary" />
                      Current Sale
                    </div>
                    <Badge variant="secondary" className="text-sm">
                      {cart.reduce((sum, item) => sum + item.quantity, 0)} pcs
                    </Badge>
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-5 pt-4">
                  {cart.length === 0 ? (
                    <div className="py-16 flex flex-col items-center text-slate-400">
                      <ShoppingCart className="h-12 w-12 mb-4 opacity-40" />
                      <p className="text-lg font-medium">Cart is empty</p>
                      <p className="text-sm mt-1">Start adding products</p>
                    </div>
                  ) : (
                    <>
                      <ScrollArea className="max-h-[50vh] pr-2 -mr-2">
                        <div className="space-y-4">
                          {cart.map((item) => (
                            <div key={item.id} className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0">
                              <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <ShoppingBag className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="font-medium line-clamp-2 text-sm">{item.name}</p>
                                <p className="text-xs text-primary mt-0.5">
                                  ₱{item.price.toLocaleString()} each
                                </p>

                                <div className="mt-2 flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-full"
                                    onClick={() => changeQtyBy(item.id, -1)}
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </Button>

                                  <Input
                                    type="number"
                                    min={1}
                                    value={item.quantity}
                                    onChange={(e) => updateQty(item.id, parseInt(e.target.value || "1", 10))}
                                    className="h-8 w-16 text-center text-sm"
                                  />

                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-full"
                                    onClick={() => changeQtyBy(item.id, 1)}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive/80"
                                    onClick={() => removeItem(item.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>

                              <div className="text-right text-sm font-semibold">
                                ₱{(item.price * item.quantity).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      <div className="flex items-center gap-2 mt-4">
                        <Button variant="outline" className="flex-1" onClick={clearCart}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Clear
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => searchInputRef.current?.focus()}
                        >
                          <Keyboard className="mr-2 h-4 w-4" />
                          Scan/Search
                        </Button>
                      </div>

                      <Separator className="my-5" />

                      <div className="space-y-3 text-base">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Subtotal</span>
                          <span>₱{subtotal.toLocaleString()}</span>
                        </div>

                        {discountPercent > 0 && (
                          <div className="flex justify-between text-red-600 font-medium">
                            <span>Discount ({discountPercent}%)</span>
                            <span>– ₱{discountAmount.toLocaleString()}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center text-xl font-bold pt-3 border-t">
                          <span>Total Due</span>
                          <span className="text-primary">₱{totalDue.toLocaleString()}</span>
                        </div>
                      </div>

                      <Button
                        className="w-full mt-6 h-12 text-base font-semibold rounded-xl"
                        onClick={() => setShowDialog(true)}
                        disabled={cart.length === 0}
                      >
                        Complete Sale
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Complete Sale</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-6">
                {/* Customer, Discount, Payment Method, Summary - unchanged */}
                <div>
                  <Label className="text-base">Customer (optional)</Label>
                  <Input
                    ref={customerInputRef}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Walk-in or customer name"
                    className="mt-1.5 h-11"
                  />
                </div>

                <div>
                  <Label className="text-base">Discount</Label>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {[0, 5, 10, 20].map((value) => (
                      <Button
                        key={value}
                        type="button"
                        variant={discountPercent === value ? "default" : "outline"}
                        onClick={() => applyQuickDiscount(value)}
                      >
                        <Percent className="mr-2 h-4 w-4" />
                        {value}%
                      </Button>
                    ))}
                  </div>

                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={discountPercent}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setDiscountPercent(isNaN(val) ? 0 : Math.min(100, Math.max(0, val)));
                    }}
                    className="mt-3 h-11 text-lg font-medium"
                  />
                </div>

                <div>
                  <Label className="text-base">Payment Method</Label>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(v) => setPaymentMethod(v as "cash" | "gcash" | "card")}
                    className="grid grid-cols-3 gap-4 mt-3"
                  >
                    {["cash", "gcash", "card"].map((m) => (
                      <div
                        key={m}
                        className={cn(
                          "border-2 rounded-xl p-4 text-center cursor-pointer transition-all hover:border-primary/50",
                          paymentMethod === m
                            ? "border-primary bg-primary/5 font-semibold shadow-sm"
                            : "border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <RadioGroupItem value={m} id={m} className="sr-only" />
                        <Label htmlFor={m} className="cursor-pointer uppercase text-sm font-medium">
                          {m}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="rounded-2xl border bg-slate-50 p-5 space-y-3">
                  <h3 className="font-semibold text-lg">Sale Summary</h3>
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>₱{subtotal.toLocaleString()}</span>
                  </div>

                  {discountPercent > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Discount ({discountPercent}%)</span>
                      <span>- ₱{discountAmount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-3 border-t text-xl font-bold">
                    <span>Total Due</span>
                    <span className="text-primary">₱{totalDue.toLocaleString()}</span>
                  </div>

                  {paymentMethod === "cash" && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>Tender</span>
                        <span>₱{tender.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold text-green-600">
                        <span>Change</span>
                        <span>₱{change.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Tender / Non-cash Section - unchanged */}
              <div className="space-y-4">
                {paymentMethod === "cash" ? (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base">Tender Amount</Label>
                      <Input
                        ref={tenderInputRef}
                        type="number"
                        value={tender || ""}
                        onChange={(e) => setTender(parseFloat(e.target.value) || 0)}
                        className="mt-1.5 h-14 text-3xl font-bold text-center border border-gray-300 rounded-lg focus:border-primary focus:ring-primary/20"
                        min={0}
                        step="1"
                      />
                    </div>

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
                        <Button
                          type="button"
                          key={amt}
                          variant="outline"
                          onClick={() => setTender(amt)}
                          className="text-xs"
                        >
                          ₱{amt.toLocaleString()}
                        </Button>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-2">
                      {["7", "8", "9", "4", "5", "6", "1", "2", "3"].map((digit) => (
                        <Button
                          key={digit}
                          type="button"
                          variant="outline"
                          className="h-16 text-2xl font-bold"
                          onClick={() => appendTenderDigit(digit)}
                        >
                          {digit}
                        </Button>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        className="h-16"
                        onClick={backspaceTender}
                      >
                        <Delete className="h-6 w-6" />
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="h-16 text-2xl font-bold"
                        onClick={() => appendTenderDigit("0")}
                      >
                        0
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="h-16 text-lg font-bold"
                        onClick={clearTender}
                      >
                        C
                      </Button>
                    </div>

                    <div
                      className={cn(
                        "mt-2 text-sm font-medium p-3 rounded-md text-center",
                        tender >= totalDue
                          ? "text-green-700 bg-green-50"
                          : "text-red-700 bg-red-50"
                      )}
                    >
                      {tender >= totalDue
                        ? `Change: ₱${change.toLocaleString()}`
                        : `Need ₱${(totalDue - tender).toLocaleString()} more`}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border bg-slate-50 p-6 text-center space-y-3">
                    <p className="text-sm text-slate-600">
                      Non-cash payments use the exact sale total.
                    </p>
                    <p className="text-3xl font-bold text-primary">
                      ₱{totalDue.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3 sm:gap-0">
            <Button variant="outline" size="lg" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90"
              onClick={finishTransaction}
              disabled={paymentMethod === "cash" && tender < totalDue}
            >
              Finish Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ReceiptTemplate
        open={showReceipt}
        onOpenChange={setShowReceipt}
        sale={lastSale}
        storeName={storeName}
      />
    </AdminLayout>
  );
}
