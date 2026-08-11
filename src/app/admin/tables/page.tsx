import { redirect } from "next/navigation";
import { DomainError } from "@/server/services/checkout";
import { listAdminTables } from "@/server/services/tables";
import { AdminTablesView } from "./admin-tables-view";

export const dynamic = "force-dynamic";

export default async function AdminTablesPage() {
  let tables: Awaited<ReturnType<typeof listAdminTables>> | null = null;

  try {
    tables = await listAdminTables();
  } catch (e) {
    if (
      e instanceof DomainError &&
      (e.code === "UNAUTHORIZED" || e.code === "FORBIDDEN")
    ) {
      redirect("/admin/login");
    }
    throw e;
  }

  return <AdminTablesView initialTables={tables} />;
}
