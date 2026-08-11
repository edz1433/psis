"use client";

import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from "sonner";
import { route } from 'ziggy-js';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import SearchableCombobox from "./SearchableCombobox";

interface Supplier { id: number; name: string; }
interface Category { id: number; name: string; }

interface CreateProductProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
  categories: Category[];
  isAdmin: boolean;
  userSupplierId: number | null;
}

export default function CreateProduct({
  open,
  onOpenChange,
  suppliers,
  categories,
  isAdmin,
  userSupplierId,
}: CreateProductProps) {
  const form = useForm({
    name: "",
    barcode: "",
    product_img: null as File | null,
    stock: "",
    capital: "",
    markup: "30",
    supplier_id: userSupplierId ? userSupplierId.toString() : "",
    category_id: "",
  });

  const isFormValid = () => {
    const required = ["name", "stock", "capital", "markup", "category_id"];
    if (isAdmin) required.push("supplier_id");
    return required.every((key) => {
      const val = form.data[key as keyof typeof form.data];
      return val && String(val).trim() !== "";
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) {
      toast.warning("Please fill in all required fields");
      return;
    }

    form.post(route("products.store"), {
      onSuccess: () => {
        toast.success("Product created successfully");
        form.reset();
        form.clearErrors();
        onOpenChange(false);
      },
      onError: (errors: Record<string, string>) => {
        toast.error("Validation failed", {
          description: Object.values(errors).join("\n") || "Please check the form.",
        });
      },
      preserveScroll: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Create New Product</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input
                value={form.data.name}
                onChange={(e) => form.setData("name", e.target.value)}
                placeholder="e.g. Premium White Rice 5kg"
              />
              {form.errors.name && <p className="text-sm text-destructive">{form.errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label>Barcode (optional - auto generate)</Label>
              <Input
                value={form.data.barcode}
                onChange={(e) => form.setData("barcode", e.target.value)}
                placeholder="Leave empty for auto generation"
              />
              {form.errors.barcode && <p className="text-sm text-destructive">{form.errors.barcode}</p>}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Product Image (optional)</Label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                onChange={(e) => form.setData("product_img", e.target.files?.[0] ?? null)}
              />
              {form.errors.product_img && <p className="text-sm text-destructive">{form.errors.product_img}</p>}
            </div>

            <div className="space-y-2">
              <Label>Cost Price (Capital) ₱ *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.data.capital}
                onChange={(e) => form.setData("capital", e.target.value)}
                placeholder="0.00"
              />
              {form.errors.capital && <p className="text-sm text-destructive">{form.errors.capital}</p>}
            </div>

            <div className="space-y-2">
              <Label>Markup % *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.data.markup}
                onChange={(e) => form.setData("markup", e.target.value)}
                placeholder="30.00"
              />
              {form.errors.markup && <p className="text-sm text-destructive">{form.errors.markup}</p>}
            </div>

            <div className="space-y-2">
              <Label>Initial Stock Quantity *</Label>
              <Input
                type="number"
                value={form.data.stock}
                onChange={(e) => form.setData("stock", e.target.value)}
                placeholder="0"
              />
              {form.errors.stock && <p className="text-sm text-destructive">{form.errors.stock}</p>}
            </div>

            {isAdmin && (
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <SearchableCombobox
                  options={suppliers}
                  value={form.data.supplier_id}
                  onChange={(v) => form.setData("supplier_id", v)}
                  placeholder="Select supplier..."
                  getOptionLabel={(s) => s.name}
                />
                {form.errors.supplier_id && <p className="text-sm text-destructive">{form.errors.supplier_id}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label>Category *</Label>
              <SearchableCombobox
                options={categories}
                value={form.data.category_id}
                onChange={(v) => form.setData("category_id", v)}
                placeholder="Select category..."
                getOptionLabel={(c) => c.name}
              />
              {form.errors.category_id && <p className="text-sm text-destructive">{form.errors.category_id}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.processing || !isFormValid()}>
              {form.processing ? "Creating..." : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}