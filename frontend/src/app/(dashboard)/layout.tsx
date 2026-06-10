import { cookies } from "next/headers";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default async function AppDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isCollapsed = cookieStore.get("sidebarCollapsed")?.value === "true";

  return (
    <DashboardLayout defaultCollapsed={isCollapsed}>
      {children}
    </DashboardLayout>
  );
}
