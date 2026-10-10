import React from "react";
import AddCategory from "../../../ui/admin/categories/addCategory";
import ListCategories from "../../../ui/admin/categories/listCategories";

export default function Categories() {
  return (
    <main className="w-full min-h-screen p-12 bg-white">
      <AddCategory />
      <ListCategories />
    </main>
  );
}
