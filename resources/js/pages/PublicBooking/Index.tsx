"use client";

import { Head, useForm, usePage } from "@inertiajs/react";
import { useMemo, useState } from "react";
import { route } from "ziggy-js";
import { toast } from "sonner";
import {
  AlertCircle,
  BedDouble,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Hotel,
  Images,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Waves,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ImageItem = { id: number; url: string; is_primary: boolean };
type PackageItem = { id: number; hotel_room_id?: number; hotel_facility_id?: number; name: string; price: string; duration_value: number; duration_unit: string; included_adults: number; included_children: number };
type Room = { id: number; name: string; room_type?: string; description?: string; max_adult_capacity: number; max_child_capacity: number; base_capacity: number; building?: { name: string; location?: string; images?: ImageItem[] }; images: ImageItem[]; pricing?: { base_price: string; price_type: string }; packages?: PackageItem[] };
type Facility = { id: number; name: string; facility_type: string; location?: string; description?: string; max_adult_capacity: number; max_child_capacity: number; base_capacity: number; base_price: string; price_type: string; images: ImageItem[]; packages?: PackageItem[] };
type Charge = { label: string; quantity: number; unit_amount: number | string; amount: number | string };
type PageProps = { logoUrl: string; rooms: Room[]; facilities: Facility[]; packages: PackageItem[] };
type Bookable = (Room | Facility) & { kind?: "room" | "facility" };
type AvailabilityState = {
  status: "idle" | "checking" | "available" | "unavailable" | "error";
  message: string;
  conflicts: { check_in_at: string; check_out_at: string; booking_status: string }[];
};

const money = (value: string | number | undefined) => `PHP ${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
const primaryImage = (images: ImageItem[]) => images.find((image) => image.is_primary)?.url ?? images[0]?.url;
const bookableImage = (item: any, isFacility: boolean) => isFacility ? primaryImage(item.images ?? []) : (primaryImage(item.images ?? []) ?? primaryImage(item.building?.images ?? []));
const bookableImages = (item: any, isFacility: boolean): ImageItem[] => {
  const ownImages = item.images ?? [];
  const fallbackImages = !isFacility ? (item.building?.images ?? []) : [];
  const merged = [...ownImages, ...fallbackImages];

  return merged.filter((image, index, self) => image?.url && self.findIndex((candidate) => candidate.url === image.url) === index);
};
const typeLabel = (value?: string) => (value ?? "space").replaceAll("_", " ");
const total = (charges: Charge[]) => charges.reduce((sum, item) => sum + Number(item.amount || 0), 0);
const numberInputClass = "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

export default function PublicBookingIndex() {
  const { logoUrl, rooms, facilities, packages: allPackages } = usePage<PageProps>().props;
  const [tab, setTab] = useState<"room" | "facility">("room");
  const [search, setSearch] = useState("");
  const [breakdown, setBreakdown] = useState<Charge[]>([]);
  const [availability, setAvailability] = useState<AvailabilityState>({ status: "idle", message: "", conflicts: [] });
  const [gallery, setGallery] = useState<{ title: string; subtitle: string; images: ImageItem[]; active: number } | null>(null);

  const form = useForm({
    booking_target_type: "room",
    hotel_room_id: rooms[0] ? String(rooms[0].id) : "",
    hotel_facility_id: facilities[0] ? String(facilities[0].id) : "",
    hotel_room_package_id: "",
    guest_name: "",
    contact_number: "",
    email: "",
    check_in_at: "",
    check_out_at: "",
    adults: "1",
    children: "0",
    notes: "",
  });

  const selectedTarget = form.data.booking_target_type === "facility"
    ? facilities.find((item) => String(item.id) === form.data.hotel_facility_id)
    : rooms.find((item) => String(item.id) === form.data.hotel_room_id);

  const selectedKind = form.data.booking_target_type as "room" | "facility";
  const selectedPrice = selectedKind === "facility"
    ? (selectedTarget as Facility | undefined)?.base_price
    : (selectedTarget as Room | undefined)?.pricing?.base_price;
  const selectedPriceType = selectedKind === "facility"
    ? (selectedTarget as Facility | undefined)?.price_type
    : (selectedTarget as Room | undefined)?.pricing?.price_type;

  const bookables = useMemo<Bookable[]>(() => {
    const term = search.toLowerCase().trim();
    const source = tab === "facility" ? facilities : rooms;

    return source.filter((item: any) => {
      if (!term) return true;
      return [item.name, item.facility_type, item.room_type, item.location, item.building?.name]
        .some((field) => field?.toLowerCase().includes(term));
    }).map((item) => ({ ...item, kind: tab }));
  }, [facilities, rooms, search, tab]);

  const activePackages = useMemo(() => {
    if (form.data.booking_target_type === "facility") {
      return allPackages.filter((item) => (!item.hotel_room_id && !item.hotel_facility_id) || String(item.hotel_facility_id ?? "") === form.data.hotel_facility_id);
    }

    return allPackages.filter((item) => (!item.hotel_room_id && !item.hotel_facility_id) || String(item.hotel_room_id ?? "") === form.data.hotel_room_id);
  }, [allPackages, form.data.booking_target_type, form.data.hotel_room_id, form.data.hotel_facility_id]);

  const resetEstimate = () => {
    setBreakdown([]);
    setAvailability({ status: "idle", message: "", conflicts: [] });
  };

  const selectBookable = (kind: "room" | "facility", id: number) => {
    setTab(kind);
    resetEstimate();
    form.setData("booking_target_type", kind);
    form.setData("hotel_room_package_id", "");
    if (kind === "room") {
      form.setData("hotel_room_id", String(id));
    } else {
      form.setData("hotel_facility_id", String(id));
    }
    document.getElementById("booking-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openGallery = (item: any, isFacility: boolean) => {
    const images = bookableImages(item, isFacility);
    if (!images.length) return;

    setGallery({
      title: item.name,
      subtitle: isFacility ? item.location || typeLabel(item.facility_type) : item.building?.name || typeLabel(item.room_type),
      images,
      active: 0,
    });
  };

  const moveGallery = (direction: -1 | 1) => {
    setGallery((current) => {
      if (!current) return current;
      const next = (current.active + direction + current.images.length) % current.images.length;

      return { ...current, active: next };
    });
  };

  const checkAvailability = async () => {
    if (!form.data.check_in_at || !form.data.check_out_at) {
      setAvailability({ status: "error", message: "Choose check-in and check-out date/time first.", conflicts: [] });
      return false;
    }

    setAvailability({ status: "checking", message: "Checking selected date and time...", conflicts: [] });
    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? "";
    const response = await fetch(route("public-booking.availability"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRF-TOKEN": token },
      body: JSON.stringify({
        booking_target_type: form.data.booking_target_type,
        hotel_room_id: form.data.booking_target_type === "room" ? form.data.hotel_room_id : null,
        hotel_facility_id: form.data.booking_target_type === "facility" ? form.data.hotel_facility_id : null,
        check_in_at: form.data.check_in_at,
        check_out_at: form.data.check_out_at,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      const message = Object.values(payload.errors ?? {}).flat()[0] as string | undefined;
      setAvailability({ status: "error", message: message ?? "Unable to check availability.", conflicts: [] });
      return false;
    }

    setAvailability({
      status: payload.available ? "available" : "unavailable",
      message: payload.message,
      conflicts: payload.conflicts ?? [],
    });

    return Boolean(payload.available);
  };

  const calculate = async () => {
    const isAvailable = await checkAvailability();
    if (!isAvailable) return;

    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? "";
    const response = await fetch(route("public-booking.calculate"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-CSRF-TOKEN": token },
      body: JSON.stringify({
        ...form.data,
        hotel_room_id: form.data.booking_target_type === "room" ? form.data.hotel_room_id : null,
        hotel_facility_id: form.data.booking_target_type === "facility" ? form.data.hotel_facility_id : null,
        hotel_room_package_id: form.data.hotel_room_package_id || null,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      toast.error("Complete booking details first", { description: Object.values(payload.errors ?? {}).flat()[0] as string });
      return;
    }
    setBreakdown(payload.charges ?? []);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    form.transform((data) => ({
      ...data,
      hotel_room_id: data.booking_target_type === "room" ? data.hotel_room_id : null,
      hotel_facility_id: data.booking_target_type === "facility" ? data.hotel_facility_id : null,
      hotel_room_package_id: data.hotel_room_package_id || null,
    }));
    form.post(route("public-booking.store"), {
      preserveScroll: true,
      onSuccess: () => {
        toast.success("Booking request submitted", { description: "Please wait for admin confirmation." });
        setBreakdown([]);
        form.reset("guest_name", "contact_number", "email", "notes");
      },
      onError: (errors) => toast.error("Booking request failed", { description: Object.values(errors)[0] as string }),
    });
  };

  return (
    <>
      <Head title="CPSU Rooms & Facilities Booking" />
      <main className="min-h-screen bg-[#f6f8f1] text-slate-950">
        <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <img src={logoUrl} alt="Central Philippines State University logo" className="h-14 w-14 shrink-0 rounded-full bg-white object-contain shadow-sm ring-2 ring-[#ffeb00]" />
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">Central Philippines State University</p>
                <h1 className="truncate text-lg font-semibold text-emerald-950 md:text-xl">Rooms & Facilities Booking</h1>
              </div>
            </div>
          </div>
        </header>

        <section className="border-b bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-10">
            <div className="space-y-7">
              <div className="flex flex-col gap-5 md:flex-row md:items-center">
                <img src={logoUrl} alt="CPSU seal" className="h-28 w-28 rounded-full object-contain shadow-xl ring-4 ring-[#ffeb00] md:h-36 md:w-36" />
                <div className="max-w-3xl">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge className="bg-emerald-800 text-white">Official Booking Request</Badge>
                    <Badge variant="outline" className="border-[#ffeb00] bg-[#ffeb00]/20 text-emerald-950">Rooms</Badge>
                    <Badge variant="outline" className="border-[#ffeb00] bg-[#ffeb00]/20 text-emerald-950">Pool</Badge>
                    <Badge variant="outline" className="border-[#ffeb00] bg-[#ffeb00]/20 text-emerald-950">Facilities</Badge>
                  </div>
                  <h2 className="text-4xl font-bold tracking-tight text-emerald-950 md:text-6xl">Book your CPSU stay or venue in minutes.</h2>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700 md:text-lg">Browse available rooms and campus facilities, compare rates, choose a package, and submit a request for admin confirmation.</p>
                </div>
              </div>

              <div className="grid gap-3 rounded-lg border bg-[#f9fbf4] p-3 shadow-sm md:grid-cols-[1.1fr_1fr_1.2fr_auto]">
                <SearchPanelField label="Looking for">
                  <Tabs value={tab} onValueChange={(value) => { setTab(value as "room" | "facility"); setSearch(""); }}>
                    <TabsList className="grid h-11 w-full grid-cols-2 rounded-md bg-slate-100">
                      <TabsTrigger value="room"><BedDouble className="mr-2 h-4 w-4" />Rooms</TabsTrigger>
                      <TabsTrigger value="facility"><Building2 className="mr-2 h-4 w-4" />Facilities</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </SearchPanelField>
                <SearchPanelField label="Search">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pool, suite, cottage..." className="h-11 pl-9" />
                  </div>
                </SearchPanelField>
                <SearchPanelField label="Guests">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex h-11 items-center gap-2 rounded-md border bg-white px-3 shadow-sm">
                      <Label htmlFor="booking-adults" className="shrink-0 text-xs font-medium text-slate-600">Adults</Label>
                      <Input id="booking-adults" type="number" min="1" value={form.data.adults} onChange={(event) => { form.setData("adults", event.target.value); setBreakdown([]); }} className={cn("h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0", numberInputClass)} />
                    </div>
                    <div className="flex h-11 items-center gap-2 rounded-md border bg-white px-3 shadow-sm">
                      <Label htmlFor="booking-children" className="shrink-0 text-xs font-medium text-slate-600">Children</Label>
                      <Input id="booking-children" type="number" min="0" value={form.data.children} onChange={(event) => { form.setData("children", event.target.value); setBreakdown([]); }} className={cn("h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0", numberInputClass)} />
                    </div>
                  </div>
                </SearchPanelField>
                <div className="flex items-end">
                  <Button className="h-11 w-full bg-emerald-800 px-6 text-white hover:bg-emerald-900" onClick={() => document.getElementById("spaces")?.scrollIntoView({ behavior: "smooth" })}>View Spaces</Button>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-emerald-950 p-5 text-white shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#ffeb00] text-emerald-950">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Request first, confirm after review</p>
                  <p className="text-sm text-emerald-50/80">Bookings are saved as pending until approved by the admin office.</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <Metric label="Rooms" value={rooms.length} />
                <Metric label="Facilities" value={facilities.length} />
                <Metric label="Packages" value={allPackages.length} />
              </div>
            </div>
          </div>
        </section>

        <section id="spaces" className="mx-auto grid max-w-7xl gap-6 px-5 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_430px]">
          <div className="space-y-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-800">Available {tab === "room" ? "rooms" : "facilities"}</p>
                <h2 className="mt-1 text-3xl font-semibold tracking-tight">Choose your space</h2>
              </div>
              <p className="text-sm text-muted-foreground">{bookables.length} result{bookables.length === 1 ? "" : "s"} found</p>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              {bookables.map((item: any) => {
                const isFacility = tab === "facility";
                const image = bookableImage(item, isFacility);
                const images = bookableImages(item, isFacility);
                const price = isFacility ? item.base_price : item.pricing?.base_price;
                const priceType = isFacility ? item.price_type : item.pricing?.price_type;
                const isSelected = selectedKind === tab && selectedTarget?.id === item.id;

                return (
                  <Card key={`${tab}-${item.id}`} className={cn("overflow-hidden rounded-lg border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg", isSelected && "border-emerald-800 bg-emerald-50/50 shadow-xl shadow-emerald-950/10 ring-2 ring-emerald-800")}>
                    <div className="relative aspect-[16/10] bg-emerald-950/10">
                      {image ? <img src={image} alt={item.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-emerald-900"><Hotel className="h-12 w-12" /></div>}
                      <div className="absolute left-3 top-3 flex gap-2">
                        <Badge className={cn("shadow", isSelected ? "bg-emerald-800 text-white" : "bg-white text-emerald-950")}>{isSelected ? "Selected" : "Available"}</Badge>
                        <Badge className="bg-[#ffeb00] text-emerald-950 shadow">From {money(price)}</Badge>
                      </div>
                      {images.length > 0 && (
                        <Button type="button" variant="secondary" size="sm" className="absolute bottom-3 right-3 bg-white/95 text-emerald-950 shadow hover:bg-white" onClick={() => openGallery(item, isFacility)}>
                          <Images className="mr-2 h-4 w-4" />View photos
                        </Button>
                      )}
                    </div>
                    <CardContent className="space-y-4 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-xl font-semibold">{item.name}</h3>
                          <p className="mt-1 flex items-center gap-1 text-sm capitalize text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{isFacility ? item.location || typeLabel(item.facility_type) : item.building?.name || typeLabel(item.room_type)}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0 capitalize">{isFacility ? typeLabel(item.facility_type) : typeLabel(item.room_type)}</Badge>
                      </div>
                      <p className="min-h-10 text-sm leading-5 text-slate-600">{item.description || "Available for booking request."}</p>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <Info icon={Users} label="Adults" value={item.max_adult_capacity} />
                        <Info icon={Sparkles} label="Children" value={item.max_child_capacity} />
                        <Info icon={Clock} label="Billing" value={typeLabel(priceType)} />
                      </div>
                      <div className="grid gap-2">
                        <Button className={cn("h-11 w-full text-white", isSelected ? "bg-emerald-950 hover:bg-emerald-950" : "bg-emerald-800 hover:bg-emerald-900")} onClick={() => selectBookable(tab, item.id)}>
                          {isSelected ? <><CheckCircle2 className="mr-2 h-4 w-4" />Selected for booking</> : `Select ${isFacility ? "facility" : "room"}`}
                        </Button>
                        <Button variant="outline" className="h-10 w-full border-emerald-200 bg-white" onClick={() => openGallery(item, isFacility)} disabled={!images.length}>
                          <Images className="mr-2 h-4 w-4" />View more images
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <aside id="booking-form" className="lg:sticky lg:top-24 lg:h-fit">
            <form onSubmit={submit} className="overflow-hidden rounded-lg border bg-white shadow-2xl shadow-emerald-950/10">
              <div className="bg-emerald-950 p-5 text-white">
                <div className="flex items-center gap-3">
                  <img src={logoUrl} alt="CPSU logo" className="h-14 w-14 rounded-full bg-white object-contain ring-2 ring-[#ffeb00]" />
                  <div>
                    <p className="text-sm text-emerald-50/80">Complete your request</p>
                    <h2 className="text-2xl font-semibold">Reserve your space</h2>
                  </div>
                </div>
                {selectedTarget && (
                  <div className="mt-5 rounded-md bg-white/10 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{selectedTarget.name}</p>
                        <p className="text-sm capitalize text-emerald-50/80">{selectedKind} - {money(selectedPrice)} / {typeLabel(selectedPriceType)}</p>
                      </div>
                      {selectedKind === "facility" ? <Waves className="h-5 w-5 text-[#ffeb00]" /> : <BedDouble className="h-5 w-5 text-[#ffeb00]" />}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-5 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Bookable type">
                    <Select value={form.data.booking_target_type} onValueChange={(value) => { const kind = value as "room" | "facility"; setTab(kind); resetEstimate(); form.setData("booking_target_type", kind); form.setData("hotel_room_package_id", ""); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="room">Room</SelectItem><SelectItem value="facility">Facility</SelectItem></SelectContent>
                    </Select>
                  </Field>

                  {selectedKind === "room" ? (
                    <Field label="Room">
                      <Select value={form.data.hotel_room_id} onValueChange={(value) => { form.setData("hotel_room_id", value); form.setData("hotel_room_package_id", ""); resetEstimate(); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{rooms.map((room) => <SelectItem key={room.id} value={String(room.id)}>{room.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                  ) : (
                    <Field label="Facility">
                      <Select value={form.data.hotel_facility_id} onValueChange={(value) => { form.setData("hotel_facility_id", value); form.setData("hotel_room_package_id", ""); resetEstimate(); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{facilities.map((facility) => <SelectItem key={facility.id} value={String(facility.id)}>{facility.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                  )}
                </div>

                <Field label="Package">
                  <Select value={form.data.hotel_room_package_id || "none"} onValueChange={(value) => { form.setData("hotel_room_package_id", value === "none" ? "" : value); setBreakdown([]); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Base rate</SelectItem>
                      {activePackages.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name} - {money(item.price)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Check-in"><Input type="datetime-local" value={form.data.check_in_at} onChange={(event) => { form.setData("check_in_at", event.target.value); resetEstimate(); }} /></Field>
                  <Field label="Check-out"><Input type="datetime-local" value={form.data.check_out_at} onChange={(event) => { form.setData("check_out_at", event.target.value); resetEstimate(); }} /></Field>
                </div>

                <div className={cn(
                  "rounded-lg border p-4",
                  availability.status === "available" && "border-emerald-200 bg-emerald-50",
                  availability.status === "unavailable" && "border-red-200 bg-red-50",
                  availability.status === "error" && "border-amber-200 bg-amber-50",
                  ["idle", "checking"].includes(availability.status) && "border-slate-200 bg-slate-50",
                )}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex gap-3">
                      {availability.status === "available" ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" /> : availability.status === "unavailable" ? <XCircle className="mt-0.5 h-5 w-5 text-red-700" /> : <AlertCircle className="mt-0.5 h-5 w-5 text-slate-600" />}
                      <div>
                        <p className="font-semibold text-slate-950">Availability</p>
                        <p className="text-sm text-slate-700">{availability.message || "Select a space and date range, then check if it is open."}</p>
                      </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={checkAvailability} disabled={availability.status === "checking"}>
                      {availability.status === "checking" ? "Checking..." : "Check availability"}
                    </Button>
                  </div>
                  {availability.conflicts.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-red-200 pt-3 text-sm text-red-900">
                      {availability.conflicts.map((item, index) => (
                        <div key={`${item.check_in_at}-${index}`} className="flex justify-between gap-3">
                          <span>{item.check_in_at}</span>
                          <span>{item.check_out_at}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Adults"><Input type="number" min="1" value={form.data.adults} onChange={(event) => { form.setData("adults", event.target.value); setBreakdown([]); }} className={numberInputClass} /></Field>
                  <Field label="Children"><Input type="number" min="0" value={form.data.children} onChange={(event) => { form.setData("children", event.target.value); setBreakdown([]); }} className={numberInputClass} /></Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Guest name"><Input value={form.data.guest_name} onChange={(event) => form.setData("guest_name", event.target.value)} /></Field>
                  <Field label="Contact number"><Input value={form.data.contact_number} onChange={(event) => form.setData("contact_number", event.target.value)} /></Field>
                </div>

                <Field label="Email"><Input type="email" value={form.data.email} onChange={(event) => form.setData("email", event.target.value)} /></Field>
                <Field label="Notes"><Textarea rows={3} value={form.data.notes} onChange={(event) => form.setData("notes", event.target.value)} /></Field>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="font-semibold text-emerald-950">Price summary</div>
                    <Button type="button" variant="outline" size="sm" onClick={calculate}>Calculate</Button>
                  </div>
                  {breakdown.length ? (
                    <div className="space-y-2">
                      {breakdown.map((item, index) => (
                        <div key={`${item.label}-${index}`} className="flex justify-between gap-3 text-sm">
                          <span>{item.label}</span>
                          <span className="font-medium">{money(item.amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-emerald-200 pt-3 text-lg font-semibold">
                        <span>Total</span>
                        <span>{money(total(breakdown))}</span>
                      </div>
                    </div>
                  ) : <p className="text-sm text-emerald-900/70">Set dates and guests, then calculate your estimate.</p>}
                </div>

                <Button type="submit" className="h-12 w-full bg-emerald-800 text-white hover:bg-emerald-900" disabled={form.processing || availability.status === "checking" || availability.status === "unavailable"}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />{form.processing ? "Submitting..." : "Submit Booking Request"}
                </Button>

                <div className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-700" />
                  <span>Submitting this form creates a pending request. Confirmation and payment instructions are handled by the admin office.</span>
                </div>
              </div>
            </form>
          </aside>
        </section>

        <section className="border-y bg-white">
          <div className="mx-auto grid max-w-7xl gap-4 px-5 py-6 md:grid-cols-3 md:px-8">
            <TrustItem icon={Star} title="Curated spaces" text="Rooms and facilities are managed directly by the university admin team." />
            <TrustItem icon={CalendarClock} title="Clear schedule" text="Requests include check-in and check-out time for cleaner review." />
            <TrustItem icon={ShieldCheck} title="Admin confirmed" text="Every request remains pending until reviewed and confirmed." />
          </div>
        </section>

        <footer className="bg-emerald-950 px-5 py-7 text-center text-sm text-emerald-50">
          Central Philippines State University - Negros Occidental
        </footer>
      </main>

      <Dialog open={Boolean(gallery)} onOpenChange={(open) => !open && setGallery(null)}>
        <DialogContent className="w-[96vw] max-w-5xl overflow-hidden border-0 bg-white p-0 shadow-2xl">
          {gallery && (
            <div className="flex flex-col">
              <div className="relative flex h-[52vh] min-h-[300px] items-center justify-center bg-black">
                <img src={gallery.images[gallery.active]?.url} alt={gallery.title} className="h-full w-full object-contain" />
                <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-5">
                  <div className="flex items-start justify-between gap-4 pr-9">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ffeb00]">Photo gallery</p>
                      <h3 className="mt-1 truncate text-2xl font-semibold text-white">{gallery.title}</h3>
                      <p className="mt-1 text-sm text-white/75">{gallery.subtitle}</p>
                    </div>
                    <Badge className="bg-white text-emerald-950">{gallery.active + 1} / {gallery.images.length}</Badge>
                  </div>
                </div>
                {gallery.images.length > 1 && (
                  <>
                    <Button type="button" size="icon" variant="secondary" className="absolute left-4 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full bg-white/90 text-emerald-950 shadow-lg hover:bg-white" onClick={() => moveGallery(-1)}>
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button type="button" size="icon" variant="secondary" className="absolute right-4 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full bg-white/90 text-emerald-950 shadow-lg hover:bg-white" onClick={() => moveGallery(1)}>
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                )}
              </div>

              <div className="border-b bg-[#f9fbf4] p-5">
                <DialogHeader className="space-y-2 text-left">
                  <DialogTitle className="text-2xl text-emerald-950">{gallery.title}</DialogTitle>
                  <DialogDescription className="text-base">{gallery.subtitle} - {gallery.images.length} photo{gallery.images.length === 1 ? "" : "s"} available</DialogDescription>
                </DialogHeader>
              </div>

              <div className="p-5">
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {gallery.images.map((image, index) => (
                    <button
                      key={`${image.url}-${index}`}
                      type="button"
                      className={cn("group w-36 shrink-0 overflow-hidden rounded-lg border bg-slate-100 text-left transition hover:-translate-y-0.5 hover:shadow-md", gallery.active === index && "border-emerald-800 ring-2 ring-emerald-800")}
                      onClick={() => setGallery((current) => current ? { ...current, active: index } : current)}
                    >
                      <div className="aspect-[4/3] overflow-hidden">
                        <img src={image.url} alt={`${gallery.title} photo ${index + 1}`} className="h-full w-full object-cover transition group-hover:scale-105" />
                      </div>
                      <div className="flex items-center justify-between px-3 py-2 text-xs font-medium">
                        <span>Photo {index + 1}</span>
                        {gallery.active === index && <CheckCircle2 className="h-4 w-4 text-emerald-700" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 border-t p-5 sm:grid-cols-[1fr_auto]">
                <Button className="h-11 bg-emerald-800 text-white hover:bg-emerald-900" onClick={() => setGallery(null)}>Continue booking</Button>
                <div className="grid grid-cols-2 gap-2 sm:w-56">
                  {gallery.images.length > 1 && (
                    <>
                      <Button type="button" variant="outline" className="h-10" onClick={() => moveGallery(-1)}>
                        <ChevronLeft className="mr-2 h-4 w-4" />Previous
                      </Button>
                      <Button type="button" variant="outline" className="h-10" onClick={() => moveGallery(1)}>
                        Next<ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SearchPanelField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-900">{label}</Label>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function Info({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-slate-50 p-2">
      <div className="flex items-center gap-1 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</div>
      <div className="mt-1 truncate font-medium">{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-white/10 px-3 py-3">
      <div className="text-2xl font-semibold text-[#ffeb00]">{value}</div>
      <div className="text-xs text-emerald-50/75">{label}</div>
    </div>
  );
}

function TrustItem({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-lg border bg-[#f9fbf4] p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-800 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
