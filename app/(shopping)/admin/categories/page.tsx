import AddCategory from "../../../ui/admin/categories/addCategory";
import ListCategories from "../../../ui/admin/categories/listCategories";
export default function Page() {
  return (
    <main>
      <h1 className="page-heading">Categorías</h1>
      <p className="page-description">
        Un lugar para cada producto. Organiza tu catálogo a tu manera.
      </p>
      <div className="mt-8 space-y-6">
        <AddCategory />
        <ListCategories />
      </div>
    </main>
  );
}
