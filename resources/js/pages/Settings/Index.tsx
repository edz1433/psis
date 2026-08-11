import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Head, useForm } from "@inertiajs/react";
import { Building2, ImageUp, Save } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { route } from "ziggy-js";
import { toast } from "sonner";

interface SettingsData {
  system_name: string;
  institution_name: string;
  institution_address?: string | null;
  logo_path?: string | null;
  logo_url?: string | null;
}

interface PageProps {
  settings: SettingsData;
}

type SettingsForm = {
  system_name: string;
  institution_name: string;
  institution_address: string;
  logo: File | null;
};

export default function SettingsIndex({ settings }: PageProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(settings.logo_url ?? null);
  const form = useForm<SettingsForm>({
    system_name: settings.system_name ?? "",
    institution_name: settings.institution_name ?? "",
    institution_address: settings.institution_address ?? "",
    logo: null,
  });

  const displayName = useMemo(() => form.data.system_name.trim() || "System Name", [form.data.system_name]);

  const handleLogoChange = (file: File | null) => {
    form.setData("logo", file);

    if (!file) {
      setPreviewUrl(settings.logo_url ?? null);
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    form.post(route("settings.update"), {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => {
        toast.success("System settings updated");
        form.setData("logo", null);
      },
      onError: (errors) => {
        toast.error("Could not update settings", {
          description: Object.values(errors).join("\n"),
          duration: 7000,
        });
      },
    });
  };

  return (
    <AdminLayout>
      <Head title="System Settings" />
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Set the system identity used across reports, billing statements, and generated documents.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>These details will appear in generated reports and billing PDFs.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="system_name">System Name *</Label>
                  <Input
                    id="system_name"
                    value={form.data.system_name}
                    onChange={(event) => form.setData("system_name", event.target.value)}
                    placeholder="e.g. Kabankalan Rental Management"
                  />
                  {form.errors.system_name && <p className="text-xs text-destructive">{form.errors.system_name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="institution_name">Institution Name *</Label>
                  <Input
                    id="institution_name"
                    value={form.data.institution_name}
                    onChange={(event) => form.setData("institution_name", event.target.value)}
                    placeholder="Central Philippines State University"
                  />
                  {form.errors.institution_name && <p className="text-xs text-destructive">{form.errors.institution_name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="institution_address">Institution Address</Label>
                  <Input
                    id="institution_address"
                    value={form.data.institution_address}
                    onChange={(event) => form.setData("institution_address", event.target.value)}
                    placeholder="Camingawan, Kabankalan City, Negros Occidental"
                  />
                  {form.errors.institution_address && <p className="text-xs text-destructive">{form.errors.institution_address}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">System Logo</Label>
                  <Input
                    id="logo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => handleLogoChange(event.target.files?.[0] ?? null)}
                  />
                  <p className="text-xs text-muted-foreground">PNG, JPG, or WEBP. Maximum size: 2MB.</p>
                  {form.errors.logo && <p className="text-xs text-destructive">{form.errors.logo}</p>}
                </div>

                <Button type="submit" disabled={form.processing}>
                  <Save className="h-4 w-4" />
                  {form.processing ? "Saving..." : "Save Settings"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Document Preview</CardTitle>
              <CardDescription>How the name and logo will appear in generated documents.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border bg-muted/30 p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-md border bg-background">
                    {previewUrl ? (
                      <img src={previewUrl} alt="System logo preview" className="max-h-14 max-w-14 object-contain" />
                    ) : (
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="break-words text-lg font-semibold">{displayName}</div>
                    <div className="break-words text-sm font-medium">{form.data.institution_name || "Institution Name"}</div>
                    <div className="break-words text-sm text-muted-foreground">{form.data.institution_address || "Institution address"}</div>
                  </div>
                </div>

                <div className="mt-5 border-t pt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <ImageUp className="h-4 w-4" />
                    Logo is embedded into PDFs for consistent printing.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
