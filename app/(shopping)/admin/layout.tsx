import SideMenu from "../../ui/admin/sideMenu";
import AdminGuard from "@/app/ui/admin/adminGuard";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="flex flex-col gap-8 sm:flex-row">
        <SideMenu />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </AdminGuard>
  );
}

Layout.displayName = 'Layout';
