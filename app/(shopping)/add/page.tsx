import Select from "../../ui/add/select";
export default function Page() {
  return (
    <main>
      <h1 className="page-heading">¿Qué hace falta?</h1>
      <p className="page-description">
        Elige una categoría y marca los productos para tu próxima compra.
      </p>
      <div className="mt-8 space-y-6">
        <Select />
      </div>
    </main>
  );
}
