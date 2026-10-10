import Menu from "../ui/menu";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await auth())?.user?.email) redirect("/");
  return (
    <div
      className="grid grid-rows-2"
      style={{ gridTemplateRows: "auto 100vh" }}
    >
      <Menu />
      {children}
    </div>
  );
}
