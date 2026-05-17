import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { HealthClient } from "./health-client";

export default async function AdminSystemPage() {
  const session = await auth();
  const role = session?.user?.role;

  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return <HealthClient />;
}
