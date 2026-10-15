import AddProduct from "../../../ui/admin/products/addProduct";
export default function Page() {
  return (
    <main>
      <h1 className="page-heading">Productos</h1>
      <p className="page-description">
        Gestiona los productos habituales de cada categoría.
      </p>
      <div className="mt-8 space-y-6">
        <AddProduct />
      </div>
    </main>
  );
}

Page.displayName = 'Page';
