import List from "../ui/list/list";
export default function Page() {
  return (
    <main>
      <h1 className="page-heading">Mi lista de compras</h1>
      <p className="page-description">
        Todo lo que necesitas, organizado por categoría.
      </p>
      <div className="mt-8 space-y-6">
        <List />
      </div>
    </main>
  );
}
