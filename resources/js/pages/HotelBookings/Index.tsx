"use client";

import AdminLayout from "@/layouts/AdminLayout";
import { Head, router, useForm, usePage } from "@inertiajs/react";
import { useMemo, useState } from "react";
import { route } from "ziggy-js";
import { toast } from "sonner";
import {
  AlertTriangle,
  BedDouble,
  Building2,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ImageItem = { id: number; url: string; path: string; original_name?: string; is_primary: boolean; sort_order: number; hotel_building_id?: number; hotel_room_id?: number; hotel_facility_id?: number };
type Building = { id: number; name: string; description?: string; location?: string; status: string; rooms_count?: number; images: ImageItem[] };
type Amenity = { id: number; name: string; description?: string; status: string };
type Pricing = {
  base_price: string;
  price_type: string;
  weekend_price?: string;
  holiday_price?: string;
  extra_adult_price: string;
  extra_child_price: string;
  child_age_rule?: string;
  security_deposit: string;
  cleaning_fee: string;
  other_fees?: { label: string; amount: number | string }[];
};
type Room = {
  id: number;
  hotel_building_id: number;
  name: string;
  room_type?: string;
  floor_number?: string;
  description?: string;
  max_adult_capacity: number;
  max_child_capacity: number;
  base_capacity: number;
  status: string;
  rules_notes?: string;
  building?: Building;
  images: ImageItem[];
  pricing?: Pricing;
  amenities: Amenity[];
};
type RoomPackage = {
  id: number;
  hotel_room_id?: number;
  hotel_facility_id?: number;
  name: string;
  description?: string;
  included_adults: number;
  included_children: number;
  duration_value: number;
  duration_unit: string;
  price: string;
  extra_adult_charge: string;
  extra_child_charge: string;
  inclusions?: string[];
  status: string;
  room?: Room;
  facility?: Facility;
};
type Facility = {
  id: number;
  name: string;
  facility_type: string;
  location?: string;
  description?: string;
  max_adult_capacity: number;
  max_child_capacity: number;
  base_capacity: number;
  status: string;
  base_price: string;
  price_type: string;
  weekend_price?: string;
  holiday_price?: string;
  extra_adult_price: string;
  extra_child_price: string;
  child_age_rule?: string;
  security_deposit: string;
  cleaning_fee: string;
  rules_notes?: string;
  images: ImageItem[];
};
type Charge = { id?: number; label: string; type: string; quantity: number; unit_amount: number | string; amount: number | string };
type Booking = {
  id: number;
  hotel_room_id?: number;
  hotel_facility_id?: number;
  hotel_room_package_id?: number;
  guest_name: string;
  contact_number?: string;
  email?: string;
  check_in_at: string;
  check_out_at: string;
  adults: number;
  children: number;
  discount_amount: string;
  additional_fees: string;
  deposit_amount: string;
  total_amount: string;
  payment_status: string;
  booking_status: string;
  notes?: string;
  room?: Room;
  facility?: Facility;
  package?: RoomPackage;
  charges: Charge[];
};
type PageProps = { buildings: Building[]; rooms: Room[]; facilities: Facility[]; packages: RoomPackage[]; amenities: Amenity[]; bookings: Booking[] };

const money = (value: string | number | undefined) => `PHP ${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
const csv = (value?: string[]) => (value ?? []).join(", ");
const splitCsv = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const dt = (value?: string) => value ? value.slice(0, 16) : "";

const badgeClass: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-300",
  inactive: "bg-slate-100 text-slate-800 border-slate-300",
  available: "bg-emerald-100 text-emerald-800 border-emerald-300",
  unavailable: "bg-slate-100 text-slate-800 border-slate-300",
  maintenance: "bg-amber-100 text-amber-800 border-amber-300",
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  confirmed: "bg-blue-100 text-blue-800 border-blue-300",
  "checked-in": "bg-emerald-100 text-emerald-800 border-emerald-300",
  "checked-out": "bg-slate-100 text-slate-800 border-slate-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-300",
  partial: "bg-blue-100 text-blue-800 border-blue-300",
  unpaid: "bg-amber-100 text-amber-800 border-amber-300",
  refunded: "bg-slate-100 text-slate-800 border-slate-300",
};

function StatusBadge({ value }: { value: string }) {
  return <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize", badgeClass[value] ?? badgeClass.inactive)}>{value.replaceAll("_", " ")}</span>;
}

function ImageGallery({ images, type }: { images: ImageItem[]; type: "building" | "room" | "facility" }) {
  if (!images?.length) return <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">No images uploaded.</div>;

  const base = type === "building" ? "hotel-bookings.building-images" : type === "room" ? "hotel-bookings.room-images" : "hotel-bookings.facility-images";
  const reorderRoute = type === "building" ? "hotel-bookings.buildings.images.reorder" : type === "room" ? "hotel-bookings.rooms.images.reorder" : "hotel-bookings.facilities.images.reorder";
  const parentId = type === "building" ? images[0]?.hotel_building_id : type === "room" ? images[0]?.hotel_room_id : images[0]?.hotel_facility_id;
  const reorder = (from: number, to: number) => {
    if (!parentId || to < 0 || to >= images.length) return;
    const ids = images.map((image) => image.id);
    [ids[from], ids[to]] = [ids[to], ids[from]];
    router.post(route(reorderRoute, parentId), { image_ids: ids }, { preserveScroll: true });
  };

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {images.map((image, index) => (
        <div key={image.id} className="group overflow-hidden rounded-md border bg-background">
          <div className="relative aspect-[4/3] bg-muted">
            <img src={image.url} alt={image.original_name ?? "Uploaded image"} className="h-full w-full object-cover" />
            {image.is_primary && <Badge className="absolute left-2 top-2"><Star className="mr-1 h-3 w-3" />Primary</Badge>}
          </div>
          <div className="flex gap-1 p-2">
            <Button type="button" variant="outline" size="sm" className="h-8 flex-1" onClick={() => router.post(route(`${base}.primary`, image.id), {}, { preserveScroll: true })}>
              <Star className="mr-1 h-3 w-3" />Set
            </Button>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" disabled={index === 0} onClick={() => reorder(index, index - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8" disabled={index === images.length - 1} onClick={() => reorder(index, index + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
            <Button type="button" variant="destructive" size="icon" className="h-8 w-8" onClick={() => router.delete(route(`${base}.destroy`, image.id), { preserveScroll: true })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HotelBookingIndex() {
  const { props } = usePage<PageProps>();
  const { buildings, rooms, facilities, packages: roomPackages, amenities, bookings } = props;
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<null | "building" | "room" | "facility" | "package" | "booking" | "amenity" | "delete">(null);
  const [selected, setSelected] = useState<any>(null);
  const [breakdown, setBreakdown] = useState<Charge[]>([]);

  const filteredBookings = useMemo(() => {
    const term = search.toLowerCase();
    return bookings.filter((booking) => [booking.guest_name, booking.room?.name, booking.facility?.name, booking.booking_status, booking.payment_status].some((field) => field?.toLowerCase().includes(term)));
  }, [bookings, search]);

  const buildingForm = useForm({ name: "", description: "", location: "", status: "active", images: [] as File[] });
  const amenityForm = useForm({ name: "", description: "", status: "active" });
  const roomForm = useForm({
    hotel_building_id: "",
    name: "",
    room_type: "",
    floor_number: "",
    description: "",
    max_adult_capacity: "2",
    max_child_capacity: "0",
    base_capacity: "2",
    status: "available",
    rules_notes: "",
    amenity_ids: [] as number[],
    images: [] as File[],
    pricing: {
      base_price: "",
      price_type: "per_night",
      weekend_price: "",
      holiday_price: "",
      extra_adult_price: "",
      extra_child_price: "",
      child_age_rule: "",
      security_deposit: "",
      cleaning_fee: "",
      other_fees: [] as { label: string; amount: string }[],
    },
  });
  const packageForm = useForm({
    hotel_room_id: "",
    hotel_facility_id: "",
    name: "",
    description: "",
    included_adults: "2",
    included_children: "0",
    duration_value: "1",
    duration_unit: "night",
    price: "",
    extra_adult_charge: "",
    extra_child_charge: "",
    inclusions_input: "",
    status: "active",
  });
  const facilityForm = useForm({
    name: "",
    facility_type: "pool",
    location: "",
    description: "",
    max_adult_capacity: "20",
    max_child_capacity: "20",
    base_capacity: "10",
    status: "available",
    base_price: "",
    price_type: "per_day",
    weekend_price: "",
    holiday_price: "",
    extra_adult_price: "",
    extra_child_price: "",
    child_age_rule: "",
    security_deposit: "",
    cleaning_fee: "",
    rules_notes: "",
    images: [] as File[],
  });
  const bookingForm = useForm({
    booking_target_type: "room",
    hotel_room_id: "",
    hotel_facility_id: "",
    hotel_room_package_id: "",
    guest_name: "",
    contact_number: "",
    email: "",
    check_in_at: "",
    check_out_at: "",
    adults: "1",
    children: "0",
    discount_amount: "",
    additional_fees: "",
    deposit_amount: "",
    payment_status: "unpaid",
    booking_status: "pending",
    notes: "",
  });

  const activePackages = useMemo(() => roomPackages.filter((item) => {
    if (item.status !== "active") return false;
    const isGlobal = !item.hotel_room_id && !item.hotel_facility_id;
    if (bookingForm.data.booking_target_type === "facility") {
      return isGlobal || String(item.hotel_facility_id ?? "") === bookingForm.data.hotel_facility_id;
    }
    return isGlobal || String(item.hotel_room_id ?? "") === bookingForm.data.hotel_room_id;
  }), [roomPackages, bookingForm.data.booking_target_type, bookingForm.data.hotel_room_id, bookingForm.data.hotel_facility_id]);
  const stats = { buildings: buildings.length, rooms: rooms.length, facilities: facilities.length, bookings: bookings.length, revenue: bookings.reduce((sum, booking) => sum + Number(booking.total_amount || 0), 0) };

  const openBuilding = (building?: Building) => {
    setSelected(building ?? null);
    buildingForm.setData(building ? { name: building.name, description: building.description ?? "", location: building.location ?? "", status: building.status, images: [] } : { name: "", description: "", location: "", status: "active", images: [] });
    setDialog("building");
  };

  const openRoom = (room?: Room) => {
    setSelected(room ?? null);
    roomForm.setData(room ? {
      hotel_building_id: String(room.hotel_building_id),
      name: room.name,
      room_type: room.room_type ?? "",
      floor_number: room.floor_number ?? "",
      description: room.description ?? "",
      max_adult_capacity: String(room.max_adult_capacity),
      max_child_capacity: String(room.max_child_capacity),
      base_capacity: String(room.base_capacity),
      status: room.status,
      rules_notes: room.rules_notes ?? "",
      amenity_ids: room.amenities?.map((item) => item.id) ?? [],
      images: [],
      pricing: {
        base_price: room.pricing?.base_price ?? "",
        price_type: room.pricing?.price_type ?? "per_night",
        weekend_price: room.pricing?.weekend_price ?? "",
        holiday_price: room.pricing?.holiday_price ?? "",
        extra_adult_price: room.pricing?.extra_adult_price ?? "",
        extra_child_price: room.pricing?.extra_child_price ?? "",
        child_age_rule: room.pricing?.child_age_rule ?? "",
        security_deposit: room.pricing?.security_deposit ?? "",
        cleaning_fee: room.pricing?.cleaning_fee ?? "",
        other_fees: (room.pricing?.other_fees ?? []).map((fee) => ({ label: fee.label, amount: String(fee.amount) })),
      },
    } : {
      hotel_building_id: buildings[0] ? String(buildings[0].id) : "",
      name: "",
      room_type: "",
      floor_number: "",
      description: "",
      max_adult_capacity: "2",
      max_child_capacity: "0",
      base_capacity: "2",
      status: "available",
      rules_notes: "",
      amenity_ids: [],
      images: [],
      pricing: { base_price: "", price_type: "per_night", weekend_price: "", holiday_price: "", extra_adult_price: "", extra_child_price: "", child_age_rule: "", security_deposit: "", cleaning_fee: "", other_fees: [] },
    });
    setDialog("room");
  };

  const openPackage = (pkg?: RoomPackage) => {
    setSelected(pkg ?? null);
    packageForm.setData(pkg ? {
      hotel_room_id: pkg.hotel_room_id ? String(pkg.hotel_room_id) : "",
      hotel_facility_id: pkg.hotel_facility_id ? String(pkg.hotel_facility_id) : "",
      name: pkg.name,
      description: pkg.description ?? "",
      included_adults: String(pkg.included_adults),
      included_children: String(pkg.included_children),
      duration_value: String(pkg.duration_value),
      duration_unit: pkg.duration_unit,
      price: pkg.price,
      extra_adult_charge: pkg.extra_adult_charge,
      extra_child_charge: pkg.extra_child_charge,
      inclusions_input: csv(pkg.inclusions),
      status: pkg.status,
    } : { hotel_room_id: "", hotel_facility_id: "", name: "", description: "", included_adults: "2", included_children: "0", duration_value: "1", duration_unit: "night", price: "", extra_adult_charge: "", extra_child_charge: "", inclusions_input: "", status: "active" });
    setDialog("package");
  };

  const openFacility = (facility?: Facility) => {
    setSelected(facility ?? null);
    facilityForm.setData(facility ? {
      name: facility.name,
      facility_type: facility.facility_type,
      location: facility.location ?? "",
      description: facility.description ?? "",
      max_adult_capacity: String(facility.max_adult_capacity),
      max_child_capacity: String(facility.max_child_capacity),
      base_capacity: String(facility.base_capacity),
      status: facility.status,
      base_price: facility.base_price ?? "",
      price_type: facility.price_type ?? "per_day",
      weekend_price: facility.weekend_price ?? "",
      holiday_price: facility.holiday_price ?? "",
      extra_adult_price: facility.extra_adult_price ?? "",
      extra_child_price: facility.extra_child_price ?? "",
      child_age_rule: facility.child_age_rule ?? "",
      security_deposit: facility.security_deposit ?? "",
      cleaning_fee: facility.cleaning_fee ?? "",
      rules_notes: facility.rules_notes ?? "",
      images: [],
    } : { name: "", facility_type: "pool", location: "", description: "", max_adult_capacity: "20", max_child_capacity: "20", base_capacity: "10", status: "available", base_price: "", price_type: "per_day", weekend_price: "", holiday_price: "", extra_adult_price: "", extra_child_price: "", child_age_rule: "", security_deposit: "", cleaning_fee: "", rules_notes: "", images: [] });
    setDialog("facility");
  };

  const openBooking = (booking?: Booking) => {
    setSelected(booking ?? null);
    setBreakdown(booking?.charges ?? []);
    bookingForm.setData(booking ? {
      booking_target_type: booking.hotel_facility_id ? "facility" : "room",
      hotel_room_id: booking.hotel_room_id ? String(booking.hotel_room_id) : "",
      hotel_facility_id: booking.hotel_facility_id ? String(booking.hotel_facility_id) : "",
      hotel_room_package_id: booking.hotel_room_package_id ? String(booking.hotel_room_package_id) : "",
      guest_name: booking.guest_name,
      contact_number: booking.contact_number ?? "",
      email: booking.email ?? "",
      check_in_at: dt(booking.check_in_at),
      check_out_at: dt(booking.check_out_at),
      adults: String(booking.adults),
      children: String(booking.children),
      discount_amount: booking.discount_amount ?? "",
      additional_fees: booking.additional_fees ?? "",
      deposit_amount: booking.deposit_amount ?? "",
      payment_status: booking.payment_status,
      booking_status: booking.booking_status,
      notes: booking.notes ?? "",
    } : { booking_target_type: "room", hotel_room_id: rooms[0] ? String(rooms[0].id) : "", hotel_facility_id: "", hotel_room_package_id: "", guest_name: "", contact_number: "", email: "", check_in_at: "", check_out_at: "", adults: "1", children: "0", discount_amount: "", additional_fees: "", deposit_amount: "", payment_status: "unpaid", booking_status: "pending", notes: "" });
    setDialog("booking");
  };

  const submit = (kind: "building" | "room" | "facility" | "package" | "booking" | "amenity") => (e: React.FormEvent) => {
    e.preventDefault();
    const common = {
      onSuccess: () => {
        toast.success(`${kind[0].toUpperCase()}${kind.slice(1)} saved`);
        setDialog(null);
        setSelected(null);
      },
      onError: (errors: Record<string, string>) => toast.error("Please check the form", { description: Object.values(errors)[0], duration: 6500 }),
      preserveScroll: true,
      forceFormData: kind === "building" || kind === "room" || kind === "facility",
    };

    if (kind === "building") {
      buildingForm.transform((data) => selected ? { ...data, _method: "patch" } : data);
      if (selected) {
        buildingForm.post(route("hotel-bookings.buildings.update", selected.id), common);
      } else {
        buildingForm.post(route("hotel-bookings.buildings.store"), common);
      }
    }
    if (kind === "room") {
      roomForm.transform((data) => selected ? { ...data, _method: "patch" } : data);
      if (selected) {
        roomForm.post(route("hotel-bookings.rooms.update", selected.id), common);
      } else {
        roomForm.post(route("hotel-bookings.rooms.store"), common);
      }
    }
    if (kind === "facility") {
      facilityForm.transform((data) => selected ? { ...data, _method: "patch" } : data);
      if (selected) {
        facilityForm.post(route("hotel-bookings.facilities.update", selected.id), common);
      } else {
        facilityForm.post(route("hotel-bookings.facilities.store"), common);
      }
    }
    if (kind === "package") {
      const payload = { ...packageForm.data, hotel_room_id: packageForm.data.hotel_room_id || null, hotel_facility_id: packageForm.data.hotel_facility_id || null, inclusions: splitCsv(packageForm.data.inclusions_input) };
      packageForm.transform(() => selected ? { ...payload, _method: "patch" } : payload);
      selected ? packageForm.post(route("hotel-bookings.packages.update", selected.id), common) : packageForm.post(route("hotel-bookings.packages.store"), common);
    }
    if (kind === "booking") {
      const payload = { ...bookingForm.data, hotel_room_id: bookingForm.data.booking_target_type === "room" ? bookingForm.data.hotel_room_id : null, hotel_facility_id: bookingForm.data.booking_target_type === "facility" ? bookingForm.data.hotel_facility_id : null, hotel_room_package_id: bookingForm.data.hotel_room_package_id || null };
      bookingForm.transform(() => selected ? { ...payload, _method: "patch" } : payload);
      selected ? bookingForm.post(route("hotel-bookings.bookings.update", selected.id), common) : bookingForm.post(route("hotel-bookings.bookings.store"), common);
    }
    if (kind === "amenity") {
      selected ? amenityForm.patch(route("hotel-bookings.amenities.update", selected.id), common) : amenityForm.post(route("hotel-bookings.amenities.store"), common);
    }
  };

  const previewPrice = async () => {
    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? "";

    const response = await fetch(route("hotel-bookings.calculate"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-CSRF-TOKEN": token,
      },
      body: JSON.stringify({
        ...bookingForm.data,
        hotel_room_id: bookingForm.data.booking_target_type === "room" ? bookingForm.data.hotel_room_id : null,
        hotel_facility_id: bookingForm.data.booking_target_type === "facility" ? bookingForm.data.hotel_facility_id : null,
        hotel_room_package_id: bookingForm.data.hotel_room_package_id || null,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      const errors = payload.errors ?? {};
      toast.error("Cannot calculate yet", { description: Object.values(errors).flat()[0] as string });
      return;
    }

    setBreakdown(payload.charges ?? []);
  };

  const destroy = () => {
    if (!selected) return;
    router.delete(route(`hotel-bookings.${selected.kind}.destroy`, selected.id), {
      preserveScroll: true,
      onSuccess: () => {
        toast.success("Deleted successfully");
        setDialog(null);
        setSelected(null);
      },
      onError: (errors) => toast.error("Delete failed", { description: Object.values(errors)[0] as string }),
    });
  };

  return (
    <AdminLayout>
      <Head title="Hotel Booking Management" />
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Hotel Booking Management</h1>
            <p className="mt-1 text-muted-foreground">Buildings, rooms, packages, rates, amenities, and booking rules.</p>
          </div>
          <Button onClick={() => openBooking()}><Plus className="mr-2 h-4 w-4" />New Booking</Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Buildings", value: stats.buildings, icon: Building2 },
            { label: "Rooms", value: stats.rooms, icon: BedDouble },
            { label: "Facilities", value: stats.facilities, icon: Building2 },
            { label: "Bookings", value: stats.bookings, icon: CalendarClock },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="rounded-lg bg-muted p-2 text-primary"><stat.icon className="h-5 w-5" /></div>
                <div><div className="text-2xl font-bold">{stat.value}</div><div className="text-xs text-muted-foreground">{stat.label}</div></div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="bookings" className="space-y-4">
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="buildings">Buildings</TabsTrigger>
            <TabsTrigger value="rooms">Rooms</TabsTrigger>
            <TabsTrigger value="facilities">Facilities</TabsTrigger>
            <TabsTrigger value="packages">Packages</TabsTrigger>
            <TabsTrigger value="amenities">Amenities</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search guest, room, facility, status..." className="pl-9 pr-9" />
                {search && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2" onClick={() => setSearch("")}><X className="h-4 w-4" /></Button>}
              </div>
              <Button onClick={() => openBooking()}><Plus className="mr-2 h-4 w-4" />Create Booking</Button>
            </div>
            <DataTable columns={["Guest", "Bookable", "Stay", "Guests", "Total", "Payment", "Status", "Actions"]}>
              {filteredBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell><div className="font-medium">{booking.guest_name}</div><div className="text-xs text-muted-foreground">{booking.contact_number || booking.email}</div></TableCell>
                  <TableCell>{booking.room?.name ?? booking.facility?.name}<div className="text-xs text-muted-foreground">{booking.package?.name ?? (booking.facility ? "Facility rate" : "Room rate")}</div></TableCell>
                  <TableCell><div>{dt(booking.check_in_at).replace("T", " ")}</div><div className="text-xs text-muted-foreground">{dt(booking.check_out_at).replace("T", " ")}</div></TableCell>
                  <TableCell>{booking.adults} adult{booking.adults !== 1 ? "s" : ""}, {booking.children} child{booking.children !== 1 ? "ren" : ""}</TableCell>
                  <TableCell className="font-medium">{money(booking.total_amount)}</TableCell>
                  <TableCell><StatusBadge value={booking.payment_status} /></TableCell>
                  <TableCell><StatusBadge value={booking.booking_status} /></TableCell>
                  <TableCell className="text-right"><RowActions onEdit={() => openBooking(booking)} onDelete={() => { setSelected({ ...booking, kind: "bookings" }); setDialog("delete"); }} /></TableCell>
                </TableRow>
              ))}
            </DataTable>
          </TabsContent>

          <TabsContent value="buildings" className="space-y-4">
            <div className="flex justify-end"><Button onClick={() => openBuilding()}><Plus className="mr-2 h-4 w-4" />Add Building</Button></div>
            <div className="grid gap-4 lg:grid-cols-2">
              {buildings.map((building) => (
                <Card key={building.id}>
                  <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                    <div><CardTitle>{building.name}</CardTitle><p className="text-sm text-muted-foreground">{building.location || "No location set"} · {building.rooms_count ?? 0} rooms</p></div>
                    <div className="flex gap-2"><StatusBadge value={building.status} /><RowActions onEdit={() => openBuilding(building)} onDelete={() => { setSelected({ ...building, kind: "buildings" }); setDialog("delete"); }} /></div>
                  </CardHeader>
                  <CardContent className="space-y-3"><p className="text-sm text-muted-foreground">{building.description || "No description."}</p><ImageGallery images={building.images} type="building" /></CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="rooms" className="space-y-4">
            <div className="flex justify-end"><Button onClick={() => openRoom()}><Plus className="mr-2 h-4 w-4" />Add Room</Button></div>
            <DataTable columns={["Room", "Building", "Capacity", "Rate", "Amenities", "Status", "Actions"]}>
              {rooms.map((room) => (
                <TableRow key={room.id}>
                  <TableCell><div className="font-medium">{room.name}</div><div className="text-xs text-muted-foreground">{room.room_type || "Room"} · Floor {room.floor_number || "N/A"}</div></TableCell>
                  <TableCell>{room.building?.name}</TableCell>
                  <TableCell>{room.base_capacity} base · {room.max_adult_capacity} adults · {room.max_child_capacity} children</TableCell>
                  <TableCell>{money(room.pricing?.base_price)}<div className="text-xs text-muted-foreground">{room.pricing?.price_type?.replace("_", " ")}</div></TableCell>
                  <TableCell className="max-w-56 truncate">{room.amenities?.map((item) => item.name).join(", ") || "None"}</TableCell>
                  <TableCell><StatusBadge value={room.status} /></TableCell>
                  <TableCell className="text-right"><RowActions onEdit={() => openRoom(room)} onDelete={() => { setSelected({ ...room, kind: "rooms" }); setDialog("delete"); }} /></TableCell>
                </TableRow>
              ))}
            </DataTable>
          </TabsContent>

          <TabsContent value="facilities" className="space-y-4">
            <div className="flex justify-end"><Button onClick={() => openFacility()}><Plus className="mr-2 h-4 w-4" />Add Facility</Button></div>
            <DataTable columns={["Facility", "Location", "Capacity", "Rate", "Status", "Actions"]}>
              {facilities.map((facility) => (
                <TableRow key={facility.id}>
                  <TableCell><div className="font-medium">{facility.name}</div><div className="text-xs text-muted-foreground capitalize">{facility.facility_type.replace("_", " ")}</div></TableCell>
                  <TableCell>{facility.location || "No location"}</TableCell>
                  <TableCell>{facility.base_capacity} base · {facility.max_adult_capacity} adults · {facility.max_child_capacity} children</TableCell>
                  <TableCell>{money(facility.base_price)}<div className="text-xs text-muted-foreground">{facility.price_type.replace("_", " ")}</div></TableCell>
                  <TableCell><StatusBadge value={facility.status} /></TableCell>
                  <TableCell className="text-right"><RowActions onEdit={() => openFacility(facility)} onDelete={() => { setSelected({ ...facility, kind: "facilities" }); setDialog("delete"); }} /></TableCell>
                </TableRow>
              ))}
            </DataTable>
          </TabsContent>

          <TabsContent value="packages" className="space-y-4">
            <div className="flex justify-end"><Button onClick={() => openPackage()}><Plus className="mr-2 h-4 w-4" />Add Package</Button></div>
            <DataTable columns={["Package", "Scope", "Included Guests", "Duration", "Price", "Status", "Actions"]}>
              {roomPackages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell><div className="font-medium">{pkg.name}</div><div className="text-xs text-muted-foreground">{pkg.description}</div></TableCell>
                  <TableCell>{pkg.room ? `${pkg.room.name} · ${pkg.room.building?.name ?? ""}` : pkg.facility ? `${pkg.facility.name} · Facility` : "All rooms/facilities"}</TableCell>
                  <TableCell>{pkg.included_adults} adults · {pkg.included_children} children</TableCell>
                  <TableCell>{pkg.duration_value} {pkg.duration_unit}{pkg.duration_value !== 1 ? "s" : ""}</TableCell>
                  <TableCell>{money(pkg.price)}</TableCell>
                  <TableCell><StatusBadge value={pkg.status} /></TableCell>
                  <TableCell className="text-right"><RowActions onEdit={() => openPackage(pkg)} onDelete={() => { setSelected({ ...pkg, kind: "packages" }); setDialog("delete"); }} /></TableCell>
                </TableRow>
              ))}
            </DataTable>
          </TabsContent>

          <TabsContent value="amenities" className="space-y-4">
            <div className="flex justify-end"><Button onClick={() => { setSelected(null); amenityForm.setData({ name: "", description: "", status: "active" }); setDialog("amenity"); }}><Plus className="mr-2 h-4 w-4" />Add Amenity</Button></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {amenities.map((amenity) => (
                <Card key={amenity.id}>
                  <CardContent className="flex items-start justify-between gap-3 p-4">
                    <div><div className="font-medium">{amenity.name}</div><p className="text-sm text-muted-foreground">{amenity.description || "No description."}</p></div>
                    <div className="flex gap-2"><StatusBadge value={amenity.status} /><RowActions onEdit={() => { setSelected(amenity); amenityForm.setData({ name: amenity.name, description: amenity.description ?? "", status: amenity.status }); setDialog("amenity"); }} onDelete={() => { setSelected({ ...amenity, kind: "amenities" }); setDialog("delete"); }} /></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={dialog === "building"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>{selected ? "Edit Building" : "Add Building"}</DialogTitle><DialogDescription>Manage building details and image gallery.</DialogDescription></DialogHeader>
          <form onSubmit={submit("building")} className="space-y-4">
            <Field label="Building name *"><Input value={buildingForm.data.name} onChange={(e) => buildingForm.setData("name", e.target.value)} /></Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Location/area"><Input value={buildingForm.data.location} onChange={(e) => buildingForm.setData("location", e.target.value)} /></Field>
              <Field label="Status"><Select value={buildingForm.data.status} onValueChange={(value) => buildingForm.setData("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></Field>
            </div>
            <Field label="Description"><Textarea rows={3} value={buildingForm.data.description} onChange={(e) => buildingForm.setData("description", e.target.value)} /></Field>
            <FileField onChange={(files) => buildingForm.setData("images", files)} />
            {selected?.images && <ImageGallery images={selected.images} type="building" />}
            <FormFooter processing={buildingForm.processing} />
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "room"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader><DialogTitle>{selected ? "Edit Room" : "Add Room"}</DialogTitle><DialogDescription>Set room capacity, pricing, amenities, rules, and images.</DialogDescription></DialogHeader>
          <form onSubmit={submit("room")} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Building *"><Select value={roomForm.data.hotel_building_id} onValueChange={(value) => roomForm.setData("hotel_building_id", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{buildings.map((building) => <SelectItem key={building.id} value={String(building.id)}>{building.name}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Room name/number *"><Input value={roomForm.data.name} onChange={(e) => roomForm.setData("name", e.target.value)} /></Field>
              <Field label="Room type/category"><Input value={roomForm.data.room_type} onChange={(e) => roomForm.setData("room_type", e.target.value)} /></Field>
              <Field label="Floor number"><Input value={roomForm.data.floor_number} onChange={(e) => roomForm.setData("floor_number", e.target.value)} /></Field>
              <Field label="Max adults *"><Input type="number" min="1" value={roomForm.data.max_adult_capacity} onChange={(e) => roomForm.setData("max_adult_capacity", e.target.value)} /></Field>
              <Field label="Max children *"><Input type="number" min="0" value={roomForm.data.max_child_capacity} onChange={(e) => roomForm.setData("max_child_capacity", e.target.value)} /></Field>
              <Field label="Base capacity *"><Input type="number" min="1" value={roomForm.data.base_capacity} onChange={(e) => roomForm.setData("base_capacity", e.target.value)} /></Field>
              <Field label="Status"><Select value={roomForm.data.status} onValueChange={(value) => roomForm.setData("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["available", "unavailable", "maintenance", "inactive"].map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Price type"><Select value={roomForm.data.pricing.price_type} onValueChange={(value) => roomForm.setData("pricing", { ...roomForm.data.pricing, price_type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="per_night">Per night</SelectItem><SelectItem value="per_hour">Per hour</SelectItem><SelectItem value="per_day">Per day</SelectItem></SelectContent></Select></Field>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                ["Base price", "base_price"],
                ["Weekend price", "weekend_price"],
                ["Holiday price", "holiday_price"],
                ["Extra adult", "extra_adult_price"],
                ["Extra child", "extra_child_price"],
                ["Security deposit", "security_deposit"],
                ["Cleaning fee", "cleaning_fee"],
              ].map(([label, key]) => <Field key={key} label={label}><Input type="number" min="0" step="0.01" value={(roomForm.data.pricing as any)[key]} onChange={(e) => roomForm.setData("pricing", { ...roomForm.data.pricing, [key]: e.target.value })} /></Field>)}
              <Field label="Child age rule"><Input value={roomForm.data.pricing.child_age_rule} onChange={(e) => roomForm.setData("pricing", { ...roomForm.data.pricing, child_age_rule: e.target.value })} placeholder="e.g. 0-7 free" /></Field>
            </div>
            <Field label="Amenities">
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {amenities.map((amenity) => (
                  <label key={amenity.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                    <input type="checkbox" checked={roomForm.data.amenity_ids.includes(amenity.id)} onChange={(e) => roomForm.setData("amenity_ids", e.target.checked ? [...roomForm.data.amenity_ids, amenity.id] : roomForm.data.amenity_ids.filter((id) => id !== amenity.id))} />
                    {amenity.name}
                  </label>
                ))}
              </div>
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Description"><Textarea rows={3} value={roomForm.data.description} onChange={(e) => roomForm.setData("description", e.target.value)} /></Field>
              <Field label="Rules/notes"><Textarea rows={3} value={roomForm.data.rules_notes} onChange={(e) => roomForm.setData("rules_notes", e.target.value)} /></Field>
            </div>
            <FileField onChange={(files) => roomForm.setData("images", files)} />
            {selected?.images && <ImageGallery images={selected.images} type="room" />}
            <FormFooter processing={roomForm.processing} />
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "facility"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader><DialogTitle>{selected ? "Edit Facility" : "Add Facility"}</DialogTitle><DialogDescription>Add pools, pavilions, cottages, function halls, and other bookable resort spaces.</DialogDescription></DialogHeader>
          <form onSubmit={submit("facility")} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Facility name *"><Input value={facilityForm.data.name} onChange={(e) => facilityForm.setData("name", e.target.value)} placeholder="Swimming Pool" /></Field>
              <Field label="Facility type *"><Input value={facilityForm.data.facility_type} onChange={(e) => facilityForm.setData("facility_type", e.target.value)} placeholder="pool, pavilion, function_hall" /></Field>
              <Field label="Location"><Input value={facilityForm.data.location} onChange={(e) => facilityForm.setData("location", e.target.value)} /></Field>
              <Field label="Max adults *"><Input type="number" min="1" value={facilityForm.data.max_adult_capacity} onChange={(e) => facilityForm.setData("max_adult_capacity", e.target.value)} /></Field>
              <Field label="Max children *"><Input type="number" min="0" value={facilityForm.data.max_child_capacity} onChange={(e) => facilityForm.setData("max_child_capacity", e.target.value)} /></Field>
              <Field label="Base capacity *"><Input type="number" min="1" value={facilityForm.data.base_capacity} onChange={(e) => facilityForm.setData("base_capacity", e.target.value)} /></Field>
              <Field label="Status"><Select value={facilityForm.data.status} onValueChange={(value) => facilityForm.setData("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["available", "unavailable", "maintenance", "inactive"].map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Price type"><Select value={facilityForm.data.price_type} onValueChange={(value) => facilityForm.setData("price_type", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="per_day">Per day</SelectItem><SelectItem value="per_hour">Per hour</SelectItem></SelectContent></Select></Field>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                ["Base price", "base_price"],
                ["Weekend price", "weekend_price"],
                ["Holiday price", "holiday_price"],
                ["Extra adult", "extra_adult_price"],
                ["Extra child", "extra_child_price"],
                ["Security deposit", "security_deposit"],
                ["Cleaning fee", "cleaning_fee"],
              ].map(([label, key]) => <Field key={key} label={label}><Input type="number" min="0" step="0.01" value={(facilityForm.data as any)[key]} onChange={(e) => facilityForm.setData(key as any, e.target.value)} /></Field>)}
              <Field label="Child age rule"><Input value={facilityForm.data.child_age_rule} onChange={(e) => facilityForm.setData("child_age_rule", e.target.value)} /></Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Description"><Textarea rows={3} value={facilityForm.data.description} onChange={(e) => facilityForm.setData("description", e.target.value)} /></Field>
              <Field label="Rules/notes"><Textarea rows={3} value={facilityForm.data.rules_notes} onChange={(e) => facilityForm.setData("rules_notes", e.target.value)} /></Field>
            </div>
            <FileField onChange={(files) => facilityForm.setData("images", files)} />
            {selected?.images && <ImageGallery images={selected.images} type="facility" />}
            <FormFooter processing={facilityForm.processing} />
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "package"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>{selected ? "Edit Package" : "Add Package"}</DialogTitle><DialogDescription>Create reusable stay offers like overnight, day use, family, couple, or group packages.</DialogDescription></DialogHeader>
          <form onSubmit={submit("package")} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Package name *"><Input value={packageForm.data.name} onChange={(e) => packageForm.setData("name", e.target.value)} /></Field>
              <Field label="Room scope"><Select value={packageForm.data.hotel_room_id || "all"} onValueChange={(value) => { packageForm.setData("hotel_room_id", value === "all" ? "" : value); if (value !== "all") packageForm.setData("hotel_facility_id", ""); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All/selectable rooms</SelectItem>{rooms.map((room) => <SelectItem key={room.id} value={String(room.id)}>{room.name}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Facility scope"><Select value={packageForm.data.hotel_facility_id || "all"} onValueChange={(value) => { packageForm.setData("hotel_facility_id", value === "all" ? "" : value); if (value !== "all") packageForm.setData("hotel_room_id", ""); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All/selectable facilities</SelectItem>{facilities.map((facility) => <SelectItem key={facility.id} value={String(facility.id)}>{facility.name}</SelectItem>)}</SelectContent></Select></Field>
              <Field label="Included adults"><Input type="number" min="1" value={packageForm.data.included_adults} onChange={(e) => packageForm.setData("included_adults", e.target.value)} /></Field>
              <Field label="Included children"><Input type="number" min="0" value={packageForm.data.included_children} onChange={(e) => packageForm.setData("included_children", e.target.value)} /></Field>
              <Field label="Duration value"><Input type="number" min="1" value={packageForm.data.duration_value} onChange={(e) => packageForm.setData("duration_value", e.target.value)} /></Field>
              <Field label="Duration unit"><Select value={packageForm.data.duration_unit} onValueChange={(value) => packageForm.setData("duration_unit", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="hour">Hour</SelectItem><SelectItem value="day">Day</SelectItem><SelectItem value="night">Night</SelectItem></SelectContent></Select></Field>
              <Field label="Price"><Input type="number" min="0" step="0.01" value={packageForm.data.price} onChange={(e) => packageForm.setData("price", e.target.value)} /></Field>
              <Field label="Status"><Select value={packageForm.data.status} onValueChange={(value) => packageForm.setData("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></Field>
              <Field label="Extra adult charge"><Input type="number" min="0" step="0.01" value={packageForm.data.extra_adult_charge} onChange={(e) => packageForm.setData("extra_adult_charge", e.target.value)} /></Field>
              <Field label="Extra child charge"><Input type="number" min="0" step="0.01" value={packageForm.data.extra_child_charge} onChange={(e) => packageForm.setData("extra_child_charge", e.target.value)} /></Field>
            </div>
            <Field label="Inclusions"><Input value={packageForm.data.inclusions_input} onChange={(e) => packageForm.setData("inclusions_input", e.target.value)} placeholder="Breakfast, pool access, towels" /></Field>
            <Field label="Description"><Textarea rows={3} value={packageForm.data.description} onChange={(e) => packageForm.setData("description", e.target.value)} /></Field>
            <FormFooter processing={packageForm.processing} />
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "booking"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader><DialogTitle>{selected ? "Edit Booking" : "Create Booking"}</DialogTitle><DialogDescription>Confirmed and checked-in bookings are checked for date overlaps before saving.</DialogDescription></DialogHeader>
          <form onSubmit={submit("booking")} className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Guest name *"><Input value={bookingForm.data.guest_name} onChange={(e) => bookingForm.setData("guest_name", e.target.value)} /></Field>
                <Field label="Contact number"><Input value={bookingForm.data.contact_number} onChange={(e) => bookingForm.setData("contact_number", e.target.value)} /></Field>
                <Field label="Email"><Input value={bookingForm.data.email} onChange={(e) => bookingForm.setData("email", e.target.value)} /></Field>
                <Field label="Bookable type"><Select value={bookingForm.data.booking_target_type} onValueChange={(value) => { bookingForm.setData("booking_target_type", value); bookingForm.setData("hotel_room_package_id", ""); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="room">Room</SelectItem><SelectItem value="facility">Facility</SelectItem></SelectContent></Select></Field>
                {bookingForm.data.booking_target_type === "room" ? (
                  <Field label="Room *"><Select value={bookingForm.data.hotel_room_id} onValueChange={(value) => { bookingForm.setData("hotel_room_id", value); bookingForm.setData("hotel_room_package_id", ""); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{rooms.map((room) => <SelectItem key={room.id} value={String(room.id)}>{room.name} · {room.building?.name}</SelectItem>)}</SelectContent></Select></Field>
                ) : (
                  <Field label="Facility *"><Select value={bookingForm.data.hotel_facility_id} onValueChange={(value) => { bookingForm.setData("hotel_facility_id", value); bookingForm.setData("hotel_room_package_id", ""); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{facilities.map((facility) => <SelectItem key={facility.id} value={String(facility.id)}>{facility.name} · {facility.facility_type}</SelectItem>)}</SelectContent></Select></Field>
                )}
                <Field label="Package"><Select value={bookingForm.data.hotel_room_package_id || "none"} onValueChange={(value) => bookingForm.setData("hotel_room_package_id", value === "none" ? "" : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">{bookingForm.data.booking_target_type === "facility" ? "Facility base rate" : "Room base rate"}</SelectItem>{activePackages.map((pkg) => <SelectItem key={pkg.id} value={String(pkg.id)}>{pkg.name}</SelectItem>)}</SelectContent></Select></Field>
                <Field label="Payment status"><Select value={bookingForm.data.payment_status} onValueChange={(value) => bookingForm.setData("payment_status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["unpaid", "partial", "paid", "refunded"].map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></Field>
                <Field label="Check-in *"><Input type="datetime-local" value={bookingForm.data.check_in_at} onChange={(e) => bookingForm.setData("check_in_at", e.target.value)} /></Field>
                <Field label="Check-out *"><Input type="datetime-local" value={bookingForm.data.check_out_at} onChange={(e) => bookingForm.setData("check_out_at", e.target.value)} /></Field>
                <Field label="Booking status"><Select value={bookingForm.data.booking_status} onValueChange={(value) => bookingForm.setData("booking_status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["pending", "confirmed", "checked-in", "checked-out", "cancelled", "no-show"].map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></Field>
                <Field label="Adults"><Input type="number" min="1" value={bookingForm.data.adults} onChange={(e) => bookingForm.setData("adults", e.target.value)} /></Field>
                <Field label="Children"><Input type="number" min="0" value={bookingForm.data.children} onChange={(e) => bookingForm.setData("children", e.target.value)} /></Field>
                <Field label="Discount"><Input type="number" min="0" step="0.01" value={bookingForm.data.discount_amount} onChange={(e) => bookingForm.setData("discount_amount", e.target.value)} /></Field>
                <Field label="Additional fees"><Input type="number" min="0" step="0.01" value={bookingForm.data.additional_fees} onChange={(e) => bookingForm.setData("additional_fees", e.target.value)} /></Field>
                <Field label="Deposit override"><Input type="number" min="0" step="0.01" value={bookingForm.data.deposit_amount} onChange={(e) => bookingForm.setData("deposit_amount", e.target.value)} /></Field>
              </div>
              <Field label="Notes"><Textarea rows={3} value={bookingForm.data.notes} onChange={(e) => bookingForm.setData("notes", e.target.value)} /></Field>
            </div>
            <PriceBreakdown charges={breakdown} onPreview={previewPrice} total={breakdown.reduce((sum, item) => sum + Number(item.amount || 0), 0)} />
            <div className="lg:col-span-2"><FormFooter processing={bookingForm.processing} /></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "amenity"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selected ? "Edit Amenity" : "Add Amenity"}</DialogTitle></DialogHeader>
          <form onSubmit={submit("amenity")} className="space-y-4">
            <Field label="Name *"><Input value={amenityForm.data.name} onChange={(e) => amenityForm.setData("name", e.target.value)} /></Field>
            <Field label="Description"><Input value={amenityForm.data.description} onChange={(e) => amenityForm.setData("description", e.target.value)} /></Field>
            <Field label="Status"><Select value={amenityForm.data.status} onValueChange={(value) => amenityForm.setData("status", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></Field>
            <FormFooter processing={amenityForm.processing} />
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "delete"} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" />Delete record</DialogTitle><DialogDescription>This action cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button variant="destructive" onClick={destroy}>Delete</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function DataTable({ columns, children }: { columns: string[]; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>{columns.map((column) => <TableHead key={column} className={column === "Actions" ? "text-right" : ""}>{column}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{children}</TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function FileField({ onChange }: { onChange: (files: File[]) => void }) {
  return (
    <Field label="Images">
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground hover:bg-muted">
        <ImagePlus className="h-4 w-4" />
        Upload multiple JPG, PNG, or WEBP images
        <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => onChange(Array.from(e.target.files ?? []))} />
      </label>
    </Field>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="inline-flex gap-2">
      <Button variant="outline" size="icon" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
      <Button variant="destructive" size="icon" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
    </div>
  );
}

function FormFooter({ processing }: { processing: boolean }) {
  return <DialogFooter><Button type="submit" disabled={processing}>{processing ? "Saving..." : "Save"}</Button></DialogFooter>;
}

function PriceBreakdown({ charges, total, onPreview }: { charges: Charge[]; total: number; onPreview: () => void }) {
  return (
    <Card className="h-fit">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Price Breakdown</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={onPreview}>Calculate</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {charges.length ? charges.map((charge, index) => (
          <div key={`${charge.label}-${index}`} className="flex items-start justify-between gap-3 text-sm">
            <div><div className="font-medium">{charge.label}</div><div className="text-xs text-muted-foreground">{charge.quantity} x {money(charge.unit_amount)}</div></div>
            <div className={Number(charge.amount) < 0 ? "text-emerald-700" : "font-medium"}>{money(charge.amount)}</div>
          </div>
        )) : <p className="text-sm text-muted-foreground">Fill in the booking details, then calculate.</p>}
        <div className="border-t pt-3">
          <div className="flex justify-between text-lg font-semibold"><span>Total</span><span>{money(total)}</span></div>
        </div>
      </CardContent>
    </Card>
  );
}
