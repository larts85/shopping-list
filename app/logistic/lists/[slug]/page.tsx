import List from "../../../ui/list/list";
export default function Page() {
  return (
    <main>
      <h1 className="page-heading">Lista de compras</h1>
      <p className="page-description">Organiza tus productos y compras.</p>
      <div className="mt-8 space-y-6">
        <List />
      </div>
    </main>
  );
}
