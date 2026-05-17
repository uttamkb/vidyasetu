import { redirect } from "next/navigation";

/**
 * Legacy admin-console page — redirect to new unified /admin
 *
 * The old admin-console has been merged into the main /admin dashboard.
 * This redirect preserves any bookmarked URLs.
 */
export default async function AdminConsole() {
  redirect("/admin");
}
