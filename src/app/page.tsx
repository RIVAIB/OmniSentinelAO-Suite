import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RootPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Supabase may redirect to root URL when emailRedirectTo isn't in the allowlist.
  // Forward auth params to /auth/callback so the session exchange can still happen.
  if (params.code || params.token_hash) {
    const query = new URLSearchParams();
    if (typeof params.code === "string") query.set("code", params.code);
    if (typeof params.token_hash === "string")
      query.set("token_hash", params.token_hash);
    if (typeof params.type === "string") query.set("type", params.type);
    redirect(`/auth/callback?${query.toString()}`);
  }

  redirect("/dashboard");
}
