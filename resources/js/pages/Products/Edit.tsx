"use client";

import { useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
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

interface Product {
  id: number;
  name: string;
  barcode: string;
  product_img?: string | null;
  my_capital?: number;
  my_stock?: number;
  capital?: number;
  stocks?: any[] | null;
  category?: { id: number; name: string };
  display_supplier?: { id: number; name: string } | null;
}

interface EditProductProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  suppliers: any[];
  categories: any[];
  isAdmin: boolean;
  userSupplierId: number | null;
}

export default function EditProduct({
  open,
  onOpenChange,
  product,
  suppliers,
  categories,
  isAdmin,
  userSupplierId,
}: EditProductProps) {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);

  const form = useForm({
    _method: "patch",
    name: "",
    barcode: "",
    product_img: null as File | null,
    stock: "",
    capital: "",
    markup: "30",
    supplier_id: "",
    category_id: "",
  });

  useEffect(() => {
    if (open && product) {
      const stockRef = isAdmin
        ? product.stocks?.[0] || { capital: 0, markup: 30, stock: 0 }
        : { capital: product.my_capital ?? 0, markup: 30, stock: product.my_stock ?? 0 };

      form.setData({
        _method: "patch",
        name: product.name || "",
        barcode: product.barcode || "",
        product_img: null,
        stock: (product.my_stock ?? stockRef.stock)?.toString() || "0",
        capital: stockRef.capital?.toString() || "0",
        markup: stockRef.markup?.toString() || "30",
        category_id: product.category?.id?.toString() || "",
        supplier_id: isAdmin
          ? (product.display_supplier?.id?.toString() || product.stocks?.[0]?.supplier_id?.toString() || "")
          : (userSupplierId?.toString() || ""),
      });

      setCurrentImage(product.product_img || null);
      setNewImagePreview(null);
      form.clearErrors();
    }
  }, [open, product, isAdmin, userSupplierId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setData("product_img", file);
      const reader = new FileReader();
      reader.onload = (ev) => setNewImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

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
    if (!product?.id || !isFormValid()) {
      toast.warning("Please fill in all required fields");
      return;
    }

    form.post(route("products.update", product.id), {
      forceFormData: true,
      onSuccess: () => {
        toast.success("Product updated successfully");
        onOpenChange(false);
        setNewImagePreview(null);
      },
      onError: (errors: Record<string, string>) => {
        toast.error("Validation failed", {
          description: Object.values(errors).join("\n") || "Please check the form.",
        });
      },
      preserveScroll: true,
    });
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Product Name */}
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input
                value={form.data.name}
                onChange={(e) => form.setData("name", e.target.value)}
              />
              {form.errors.name && <p className="text-sm text-destructive">{form.errors.name}</p>}
            </div>

            {/* Barcode */}
            <div className="space-y-2">
              <Label>Barcode</Label>
              <Input value={form.data.barcode} readOnly />
              <p className="text-xs text-muted-foreground">Barcode cannot be changed</p>
            </div>

            {/* Image Section */}
            <div className="sm:col-span-2 space-y-3">
              <Label>Product Image</Label>
              <div className="flex gap-4 flex-wrap">
                {currentImage && !newImagePreview && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Current Image</p>
                    <img src={currentImage} alt="Current" className="w-32 h-32 object-cover rounded-md border" />
                  </div>
                )}
                {newImagePreview && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">New Image Preview</p>
                    <img src={newImagePreview} alt="New" className="w-32 h-32 object-cover rounded-md border" />
                  </div>
                )}
              </div>

              <Input
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                onChange={handleImageChange}
              />
              {form.errors.product_img && <p className="text-sm text-destructive">{form.errors.product_img}</p>}
              <p className="text-xs text-muted-foreground">
                Optional — Leave empty to keep current image.
              </p>
            </div>

            {/* Cost Price */}
            <div className="space-y-2">
              <Label>Cost Price (Capital) ₱ *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.data.capital}
                onChange={(e) => form.setData("capital", e.target.value)}
              />
              {form.errors.capital && <p className="text-sm text-destructive">{form.errors.capital}</p>}
            </div>

            {/* Markup */}
            <div className="space-y-2">
              <Label>Markup % *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.data.markup}
                onChange={(e) => form.setData("markup", e.target.value)}
              />
              {form.errors.markup && <p className="text-sm text-destructive">{form.errors.markup}</p>}
            </div>

            {/* Stock */}
            <div className="space-y-2">
              <Label>Stock Quantity *</Label>
              <Input
                type="number"
                value={form.data.stock}
                onChange={(e) => form.setData("stock", e.target.value)}
              />
              {form.errors.stock && <p className="text-sm text-destructive">{form.errors.stock}</p>}
            </div>

            {/* Supplier (Admin only) */}
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

            {/* Category */}
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
              {form.processing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
