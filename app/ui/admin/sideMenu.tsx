import NavLinks from "../navLinks";
export default function SideMenu() {
  return (
    <aside className="shrink-0 sm:w-44">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
        Catálogo
      </p>
      <NavLinks admin />
    </aside>
  );
}
