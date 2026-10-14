import Link from "next/link";
export default function Admin() {
  return (
    <main>
      <h1 className="page-heading">Todo en su lugar.</h1>
      <p className="page-description">
        Organiza el catálogo de tu hogar para armar tus próximas compras en
        menos tiempo.
      </p>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {[
          {
            href: "categories",
            title: "Categorías",
            description:
              "Agrupa tus productos: verduras, limpieza, despensa y más.",
          },
          {
            href: "products",
            title: "Productos",
            description:
              "Mantén a mano los productos que compras habitualmente.",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={`/admin/${item.href}`}
            className="panel group transition-colors hover:border-zinc-400"
          >
            <h2 className="flex justify-between text-xl font-semibold">
              {item.title}
              <span
                aria-hidden="true"
                className="text-zinc-400 group-hover:text-zinc-900"
              >
                ↗
              </span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-500">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}

Admin.displayName = 'Admin';
