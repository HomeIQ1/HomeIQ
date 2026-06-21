import { redirect } from "next/navigation";
import { getCurrentUser, listCmasForUser } from "@/lib/data";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const cmas = await listCmasForUser(user.id);

  return <DashboardClient email={user.email} initialCmas={cmas} />;
}
