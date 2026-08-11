import { FormEvent, useEffect, useState } from "react";
import { Head, useForm, usePage } from "@inertiajs/react";
import { useTheme } from "next-themes";
import { Eye, EyeOff, Lock, ShieldCheck, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { routes } from "@/routes";

interface LoginProps {
  errors?: Record<string, string>;
}

interface LoginFormData {
  username: string;
  password: string;
}

interface SharedProps extends Record<string, unknown> {
  system?: {
    name?: string | null;
    institution_name?: string | null;
    institution_address?: string | null;
    logo_url?: string | null;
  };
}

export default function Login({ errors: serverErrors }: LoginProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { setTheme } = useTheme();
  const { system } = usePage<SharedProps>().props;

  const systemName = system?.name || "PSIS";
  const institutionName =
    system?.institution_name || "Central Philippines State University";
  const institutionAddress =
    system?.institution_address || "Camingawan, Kabankalan City, Negros Occidental";
  const logoUrl = system?.logo_url;

  const { data, setData, post, processing, reset } = useForm<LoginFormData>({
    username: "",
    password: "",
  });

  useEffect(() => {
    setTheme("light");

    return () => {
      reset("password");
    };
  }, [setTheme, reset]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    post(routes.loginPost());
  };

  return (
    <>
      <Head title={`${systemName} || Login`} />

      <main className="min-h-screen bg-[#f4f7f3] text-slate-950">
        <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
          <section className="relative hidden overflow-hidden bg-emerald-950 px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(250,204,21,0.22),transparent_28%),linear-gradient(135deg,rgba(16,185,129,0.25),transparent_42%)]" />
            <div className="absolute bottom-0 right-0 h-72 w-72 translate-x-16 translate-y-16 rounded-full border border-white/15" />
            <div className="absolute bottom-16 right-24 h-36 w-36 rounded-full border border-emerald-200/20" />

            <div className="relative z-10 flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white p-2 shadow-2xl">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={`${institutionName} logo`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <ShieldCheck className="h-8 w-8 text-emerald-700" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-100">
                  {institutionName}
                </p>
                <h1 className="mt-1 break-words text-3xl font-semibold">
                  {systemName}
                </h1>
              </div>
            </div>

            <div className="relative z-10 max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-emerald-200">
                Production, Sales & Inventory
              </p>
              <h2 className="mt-5 text-5xl font-semibold leading-tight">
                A clearer way to manage operations, sales, and stock.
              </h2>
              <p className="mt-6 max-w-xl text-base leading-7 text-emerald-50/85">
                Sign in to monitor inventory, process transactions, manage records,
                and keep daily production workflows organized.
              </p>
            </div>

            <div className="relative z-10 grid grid-cols-3 gap-3 text-sm">
              {["Inventory", "Sales", "Reports"].map((item) => (
                <div
                  key={item}
                  className="rounded-lg border border-white/15 bg-white/10 px-4 py-3 backdrop-blur"
                >
                  <div className="font-semibold">{item}</div>
                  <div className="mt-1 text-emerald-100">Ready when you are</div>
                </div>
              ))}
            </div>
          </section>

          <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8">
            <div className="w-full max-w-md">
              <div className="mb-8 flex items-center justify-center gap-3 text-center lg:hidden">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border bg-white p-2 shadow-sm">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={`${institutionName} logo`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <ShieldCheck className="h-7 w-7 text-emerald-700" />
                  )}
                </div>
                <div className="min-w-0 text-left">
                  <div className="break-words text-lg font-semibold">
                    {systemName}
                  </div>
                  <div className="break-words text-xs text-muted-foreground">
                    {institutionName}
                  </div>
                </div>
              </div>

              <Card className="overflow-hidden rounded-lg border-slate-200 bg-white/95 shadow-xl shadow-emerald-950/10">
                <CardHeader className="space-y-3 px-6 pt-7 sm:px-8">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-semibold">
                      Welcome back
                    </CardTitle>
                    <CardDescription className="mt-2">
                      Sign in with your username and password.
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="px-6 pb-7 sm:px-8">
                  <form onSubmit={submit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="username"
                          placeholder="Enter username"
                          value={data.username}
                          onChange={(event) =>
                            setData("username", event.target.value)
                          }
                          className={cn(
                            "h-11 pl-10",
                            serverErrors?.username &&
                              "border-destructive focus-visible:ring-destructive",
                          )}
                          autoFocus
                          disabled={processing}
                        />
                      </div>
                      {serverErrors?.username && (
                        <p className="text-sm text-destructive">
                          {serverErrors.username}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter password"
                          value={data.password}
                          onChange={(event) =>
                            setData("password", event.target.value)
                          }
                          className={cn(
                            "h-11 pl-10 pr-11",
                            serverErrors?.password &&
                              "border-destructive focus-visible:ring-destructive",
                          )}
                          disabled={processing}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2"
                          onClick={() => setShowPassword((visible) => !visible)}
                          disabled={processing}
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      {serverErrors?.password && (
                        <p className="text-sm text-destructive">
                          {serverErrors.password}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="h-11 w-full bg-emerald-700 text-white hover:bg-emerald-800"
                      disabled={processing}
                    >
                      {processing ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>

                  <div className="mt-6 border-t pt-5 text-center text-xs leading-5 text-muted-foreground">
                    <div className="font-medium text-slate-700">
                      {institutionName}
                    </div>
                    <div>{institutionAddress}</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
