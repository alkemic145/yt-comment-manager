import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/app-auth";
import DashboardClient from "./DashboardClient";

// Server-side auth guard: runs before any dashboard markup is sent to the
// browser. An unauthenticated visitor is redirected immediately instead
// of briefly seeing the dashboard shell while the client-side data fetch
// fails with a 401.
export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return <DashboardClient />;
}
