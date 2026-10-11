import SideMenu from "../../ui/admin/sideMenu";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-8 sm:flex-row">
      <SideMenu />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
