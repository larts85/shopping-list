import React from "react";
import AddCategory from "../../../ui/admin/categories/addCategory";
import ListCategories from "../../../ui/admin/categories/listCategories";

export default function Categories() {
  return (
    <main className="w-full min-h-screen p-10">
      <AddCategory />
      <ListCategories />
    </main>
  );
}
