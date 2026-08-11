"use client";

import { ReactNode } from "react";
import { Link, Head, router, usePage } from "@inertiajs/react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";

import {
  LayoutDashboard,
  Settings,
  User,
  LogOut,
  Bell,
  ShoppingBag,
  ShoppingCart,
  UtensilsCrossed,
  Building,
  Wheat,
  Beef,
  Package,
  ChevronDown,
  Sun,
  Moon,
  History,
  Hotel,
} from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { routes } from "@/routes";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { props } = usePage<any>();
  const { theme, setTheme } = useTheme();

  const appBasePath = String(import.meta.env.VITE_APP_BASE_PATH ?? "").replace(/\/+$/, "");

  const toPath = (url: string): string => {
    try {
      return new URL(url, typeof window === "undefined" ? "http://localhost" : window.location.origin).pathname;
    } catch {
      return url.split("?")[0];
    }
  };

  const stripAppBase = (path: string): string => {
    if (appBasePath && path.startsWith(`${appBasePath}/`)) {
      return path.slice(appBasePath.length) || "/";
    }

    return path;
  };

  const currentPath = stripAppBase(toPath(usePage().url));

  const isActive = (path: string): boolean => {
    const normalizedCurrent = currentPath.replace(/\/$/, "");
    const normalizedPath = stripAppBase(toPath(path)).replace(/\/$/, "");
    return (
      normalizedCurrent === normalizedPath ||
      normalizedCurrent.startsWith(normalizedPath + "/")
    );
  };

  const isExactActive = (path: string): boolean => {
    return currentPath.replace(/\/$/, "") === stripAppBase(toPath(path)).replace(/\/$/, "");
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const isAdmin = String(props.auth?.user?.role ?? "") === "1" || props.user?.isAdmin === true;
  const userAccess = (props.auth?.user?.access ?? []).map(String);
  const systemLogo = props.system?.logo_url ?? "/images/cpsu-logo.png";
  const systemName = props.system?.name ?? "PSIS";

  const hasAccess = (id: string): boolean => {
    return isAdmin || userAccess.includes(id);
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        {/* ===================== SIDEBAR ===================== */}
        <Sidebar collapsible="icon" className="border-r border-border bg-sidebar text-sidebar-foreground">
          {/* Logo / Header */}
          <Head>
            <title>{props.title ?? `${systemName} Admin Panel`}</title>
            <link rel="icon" href={systemLogo} />
            <link rel="apple-touch-icon" href={systemLogo} />
          </Head>
          <SidebarHeader className="border-b border-border">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild>
                  <Link href={routes.dashboard()}>
                    <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg bg-white text-primary shadow-sm">
                      <img src={systemLogo} alt={systemName} className="h-full w-full object-contain" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{systemName}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {props.user?.supplierName ?? props.auth?.user?.supplier?.name ?? "—"}
                      </span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          {/* Sidebar Content */}
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {/* Dashboard - ID 1 */}
                  {hasAccess("1") && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        tooltip="Dashboard"
                        className={cn(
                          "hover:bg-accent/80 transition-colors",
                          isActive(routes.dashboard()) && "bg-accent text-accent-foreground font-medium"
                        )}
                      >
                        <Link href={routes.dashboard()}>
                          <LayoutDashboard className="h-5 w-5" />
                          <span>Dashboard</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  {/* Shop - ID 2 */}
                  {hasAccess("2") && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        tooltip="Shop"
                        className={cn(
                          "hover:bg-accent/80 transition-colors",
                          isActive("/shop") && "bg-accent text-accent-foreground font-medium"
                        )}
                      >
                        <Link href={routes.shop.index()}>
                          <ShoppingBag className="h-5 w-5" />
                          <span>Shop</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  {/* Sales / POS - ID 12 */}
                  {hasAccess("12") && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        tooltip="POS"
                        className={cn(
                          "hover:bg-accent/80 transition-colors",
                          isActive("/pos") && "bg-accent text-accent-foreground font-medium"
                        )}
                      >
                        <Link href={routes.pos.index()}>
                          <ShoppingCart className="h-5 w-5" />   {/* ← Different icon for POS */}
                          <span>POS</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  {/* Catering & Events - ID 3 */}
                  {false && hasAccess("3") && (
                    <SidebarMenuItem>
                      <Collapsible defaultOpen={isActive("/catering")}>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip="Catering & Events"
                            className={cn(
                              "justify-between [&[data-state=open]>svg]:rotate-180 hover:bg-accent/80 transition-colors",
                              isActive("/catering") && "bg-accent text-accent-foreground font-medium"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <UtensilsCrossed className="h-5 w-5" />
                              <span>Catering</span>
                            </div>
                            <ChevronDown className="h-4 w-4 transition-transform" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="ml-4 mt-1 flex flex-col space-y-1 pl-2 border-l border-border/60">
                            <Link
                              href="/catering/bookings"
                              className={cn(
                                "text-sm py-1.5 px-3 rounded-md hover:bg-accent/70 transition-colors",
                                isActive("/catering/bookings") && "bg-accent text-accent-foreground font-medium"
                              )}
                            >
                              Bookings & Events
                            </Link>
                            <Link
                              href="/catering/menus"
                              className={cn(
                                "text-sm py-1.5 px-3 rounded-md hover:bg-accent/70 transition-colors",
                                isActive("/catering/menus") && "bg-accent text-accent-foreground font-medium"
                              )}
                            >
                              Menus & Packages
                            </Link>
                            <Link
                              href="/catering/quotes"
                              className={cn(
                                "text-sm py-1.5 px-3 rounded-md hover:bg-accent/70 transition-colors",
                                isActive("/catering/quotes") && "bg-accent text-accent-foreground font-medium"
                              )}
                            >
                              Quotations
                            </Link>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>
                  )}

                  {/* Rentals - ID 4 */}
                  {hasAccess("4") && (
                    <SidebarMenuItem>
                      <Collapsible defaultOpen={isActive("/rentals")}>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip="Rentals"
                            className={cn(
                              "justify-between [&[data-state=open]>svg]:rotate-180 hover:bg-accent/80 transition-colors",
                              isActive("/rentals") && "bg-accent text-accent-foreground font-medium"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Building className="h-5 w-5" />
                              <span>Rentals</span>
                            </div>
                            <ChevronDown className="h-4 w-4 transition-transform" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="ml-4 mt-1 flex flex-col space-y-1 pl-2 border-l border-border/60">
                            <Link
                              href={routes.rentals.properties()}
                              className={cn(
                                "text-sm py-1.5 px-3 rounded-md hover:bg-accent/70 transition-colors",
                                isActive("/rentals/properties") && "bg-accent text-accent-foreground font-medium"
                              )}
                            >
                              Properties / Units
                            </Link>
                            <Link
                              href={routes.rentals.tenants()}
                              className={cn(
                                "text-sm py-1.5 px-3 rounded-md hover:bg-accent/70 transition-colors",
                                isActive("/rentals/tenants") && "bg-accent text-accent-foreground font-medium"
                              )}
                            >
                              Tenants & Contracts
                            </Link>
                            <Link
                              href={routes.rentals.payments()}
                              className={cn(
                                "text-sm py-1.5 px-3 rounded-md hover:bg-accent/70 transition-colors",
                                isActive("/rentals/payments") && "bg-accent text-accent-foreground font-medium"
                              )}
                            >
                              Rental Payments
                            </Link>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>
                  )}

                  {/* Products - ID 5 */}
                  {hasAccess("5") && (
                    <SidebarMenuItem>
                      <Collapsible defaultOpen={isActive("/products")}>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip="Products"
                            className={cn(
                              "justify-between [&[data-state=open]>svg]:rotate-180 hover:bg-accent/80 transition-colors",
                              isActive("/products") && "bg-accent text-accent-foreground font-medium"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Package className="h-5 w-5" />
                              <span>Products</span>
                            </div>
                            <ChevronDown className="h-4 w-4 transition-transform" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="ml-4 mt-1 flex flex-col space-y-1 pl-2 border-l border-border/60">
                            <Link
                              href={routes.products.index()}
                              className={cn(
                                "text-sm py-1.5 px-3 rounded-md hover:bg-accent/70 transition-colors",
                                isExactActive("/products") && "bg-accent text-accent-foreground font-medium"
                              )}
                            >
                              All Products
                            </Link>
                            { (props.auth?.user?.role == 1 || props.auth?.user?.role == 2) && (
                            <Link
                              href={routes.categories.index()}
                              className={cn(
                                "text-sm py-1.5 px-3 rounded-md hover:bg-accent/70 transition-colors",
                                isActive("/products/categories") && "bg-accent text-accent-foreground font-medium"
                              )}
                            >
                              Categories
                            </Link>
                             )}
                            <Link
                              href={routes.stockManagement.index()}
                              className={cn(
                                "text-sm py-1.5 px-3 rounded-md hover:bg-accent/70 transition-colors",
                                isActive("/products/stock") && "bg-accent text-accent-foreground font-medium"
                              )}
                            >
                              Stock Management
                            </Link>
                           { (props.auth?.user?.role == 1 || props.auth?.user?.role == 2) && (
                            <Link
                              href={routes.suppliers.index()}
                              className={cn(
                                "text-sm py-1.5 px-3 rounded-md hover:bg-accent/70 transition-colors",
                                isActive("/products/suppliers") && "bg-accent text-accent-foreground font-medium"
                              )}
                            >
                              Suppliers
                            </Link>
                            )}
                            {/* NEW: Manage Supplier Orders */}
                            {hasAccess("11") && (
                              <Link
                                href={routes.supplier.orders.index()}
                                className={cn(
                                  "text-sm py-1.5 px-3 rounded-md hover:bg-accent/70 transition-colors flex items-center gap-2",
                                  isActive("/supplier/orders") && "bg-accent text-accent-foreground font-medium"
                                )}
                              >
                                Manage Orders
                              </Link>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>
                  )}

                  {/* Hotel Booking Management - ID 13 */}
                  {hasAccess("13") && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        tooltip="Hotel Bookings"
                        className={cn(
                          "hover:bg-accent/80 transition-colors",
                          isActive("/hotel-bookings") && "bg-accent text-accent-foreground font-medium"
                        )}
                      >
                        <Link href={routes.hotelBookings.index()}>
                          <Hotel className="h-5 w-5" />
                          <span>Hotel Bookings</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  {/* Sugar Cane - ID 6 */}
                  {false && hasAccess("6") && (
                    <SidebarMenuItem>
                      <Collapsible defaultOpen={isActive("/sugarcane")}>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip="Sugar Cane"
                            className={cn(
                              "justify-between [&[data-state=open]>svg]:rotate-180 hover:bg-accent/80 transition-colors",
                              isActive("/sugarcane") && "bg-accent text-accent-foreground font-medium"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Wheat className="h-5 w-5" />
                              <span>Sugar Cane</span>
                            </div>
                            <ChevronDown className="h-4 w-4 transition-transform" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="ml-4 mt-1 flex flex-col space-y-1 pl-2 border-l border-border/60">
                            <Link
                              href="/sugarcane/fields"
                              className={cn(
                                "text-sm py-1.5 px-3 rounded-md hover:bg-accent/70 transition-colors",
                                isActive("/sugarcane/fields") && "bg-accent text-accent-foreground font-medium"
                              )}
                            >
                              Fields / Plantations
                            </Link>
                            <Link
                              href="/sugarcane/cycles"
                              className={cn(
                                "text-sm py-1.5 px-3 rounded-md hover:bg-accent/70 transition-colors",
                                isActive("/sugarcane/cycles") && "bg-accent text-accent-foreground font-medium"
                              )}
                            >
                              Crop Cycles & Harvest
                            </Link>
                            <Link
                              href="/sugarcane/inputs"
                              className={cn(
                                "text-sm py-1.5 px-3 rounded-md hover:bg-accent/70 transition-colors",
                                isActive("/sugarcane/inputs") && "bg-accent text-accent-foreground font-medium"
                              )}
                            >
                              Inputs (Fertilizer, etc.)
                            </Link>
                            <Link
                              href="/sugarcane/sales"
                              className={cn(
                                "text-sm py-1.5 px-3 rounded-md hover:bg-accent/70 transition-colors",
                                isActive("/sugarcane/sales") && "bg-accent text-accent-foreground font-medium"
                              )}
                            >
                              Cane Sales & Milling
                            </Link>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>
                  )}

                  {/* Livestock - ID 7 */}
                  {false && hasAccess("7") && (
                    <SidebarMenuItem>
                      <Collapsible defaultOpen={isActive("/livestock")}>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip="Livestock"
                            className={cn(
                              "justify-between [&[data-state=open]>svg]:rotate-180 hover:bg-accent/80 transition-colors",
                              isActive("/livestock") && "bg-accent text-accent-foreground font-medium"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Beef className="h-5 w-5" />
                              <span>Livestock</span>
                            </div>
                            <ChevronDown className="h-4 w-4 transition-transform" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="ml-4 mt-1 flex flex-col space-y-1 pl-2 border-l border-border/60">
                            <Link
                              href="/livestock/animals"
                              className={cn(
                                "text-sm py-1.5 px-3 rounded-md hover:bg-accent/70 transition-colors",
                                isActive("/livestock/animals") && "bg-accent text-accent-foreground font-medium"
                              )}
                            >
                              Animal Records
                            </Link>
                            <Link
                              href="/livestock/health"
                              className={cn(
                                "text-sm py-1.5 px-3 rounded-md hover:bg-accent/70 transition-colors",
                                isActive("/livestock/health") && "bg-accent text-accent-foreground font-medium"
                              )}
                            >
                              Health & Vaccinations
                            </Link>
                            <Link
                              href="/livestock/breeding"
                              className={cn(
                                "text-sm py-1.5 px-3 rounded-md hover:bg-accent/70 transition-colors",
                                isActive("/livestock/breeding") && "bg-accent text-accent-foreground font-medium"
                              )}
                            >
                              Breeding & Births
                            </Link>
                            <Link
                              href="/livestock/sales"
                              className={cn(
                                "text-sm py-1.5 px-3 rounded-md hover:bg-accent/70 transition-colors",
                                isActive("/livestock/sales") && "bg-accent text-accent-foreground font-medium"
                              )}
                            >
                              Sales & Slaughter
                            </Link>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>
                  )}

                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Bottom group – Users → Settings → Logs */}
            <SidebarGroup className="mt-auto">
              <SidebarGroupContent>
                <SidebarMenu>
                  {/* Users - ID 8 */}
                  {hasAccess("8") && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        tooltip="Users"
                        className={cn(
                          "hover:bg-accent/80 transition-colors",
                          isActive("/users") && "bg-accent text-accent-foreground font-medium"
                        )}
                      >
                        <Link href={routes.users.index()}>
                          <User className="h-5 w-5" />
                          <span>Users</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  {/* Settings - ID 9 */}
                  {hasAccess("9") && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        tooltip="Settings"
                        className={cn(
                          "hover:bg-accent/80 transition-colors",
                          isActive(routes.settings()) && "bg-accent text-accent-foreground font-medium"
                        )}
                      >
                        <Link href={routes.settings()}>
                          <Settings className="h-5 w-5" />
                          <span>Settings</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  {/* Logs - ID 10 */}
                  {hasAccess("10") && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        tooltip="Activity Logs"
                        className={cn(
                          "hover:bg-accent/80 transition-colors",
                          isActive("/logs") && "bg-accent text-accent-foreground font-medium"
                        )}
                      >
                        <Link href={routes.logs()}>
                          <History className="h-5 w-5" />
                          <span>Logs</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          {/* Footer - Profile Dropdown */}
          <SidebarFooter className="border-t border-border">
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className={cn(
                        "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground w-full"
                      )}
                    >
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {props.auth?.user?.name?.[0]?.toUpperCase() ?? "A"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                          {props.auth?.user?.fname ?? ""} {props.auth?.user?.lname ?? ""}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {(() => {
                            const role = props.auth?.user?.role;
                            if (role === '1') return 'Administrator';
                            if (role === '2') return 'Production';
                            if (role === '3') return 'Enterprise';
                            return role ?? 'guest';
                          })()}
                        </span>
                      </div>

                      <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent className="w-56 rounded-lg" align="start" side="right">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      className="text-destructive cursor-pointer"
                      onSelect={() => router.post(routes.logoutPost(), {}, { preserveState: false })}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>

          <SidebarRail />
        </Sidebar>

        {/* ===================== MAIN CONTENT ===================== */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Top Navbar */}
          <header className="sticky top-0 z-40 h-16 bg-background border-b border-border flex items-center justify-between px-6 shadow-sm">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold">{props.title ?? "Dashboard"}</h1>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="text-muted-foreground hover:text-foreground"
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>

              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Bell className="h-5 w-5" />
              </Button>

              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {props.auth?.user?.name?.[0]?.toUpperCase() ?? "A"}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto p-6 w-full bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
