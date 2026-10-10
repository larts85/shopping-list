"use client";
import { useEffect, useState } from "react";
import { BiEditAlt } from "react-icons/bi";
import { RiDeleteBin6Line } from "react-icons/ri";
import EditCategoryModal from "./editCategoryModal";
import DeleteCategoryModal from "./deleteCategoryModal";



interface Category {
  id: string;
  name: string;
}

export default function ListCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editModalCategory, setEditModalCategory] = useState<Category | null>(null);
  const [deleteModalCategory, setDeleteModalCategory] = useState<Category | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const categoriesResponse = await fetch("/api/categories/get-categories", {
        method: "GET",
        headers: { "content-type": "application/json" },
      });
      if (!categoriesResponse.ok) {
        throw new Error("Error fetching categories");
      }
      const listCategories = await categoriesResponse.json();
      setCategories(Array.isArray(listCategories) ? listCategories : []);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setIsLoading(false);
    }
  };

  const handleOpenEditModal = (category: Category) => {
    setEditModalCategory(category);
  };

  const handleCloseEditModal = () => {
    setEditModalCategory(null);
    fetchCategories(); // Refresh the list after editing
  };

  const handleOpenDeleteModal = (category: Category) => {
    setDeleteModalCategory(category);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalCategory(null);
    fetchCategories(); // Refresh the list after deleting
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="flex justify-center items-center py-16">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
            <span className="text-base text-gray-600">Cargando categorías...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-4xl font-normal text-black mb-8">Lista de Categorías</h3>
      {categories.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg text-gray-600 mb-2">No hay categorías registradas</p>
          <p className="text-base text-gray-600">
            Agrega tu primera categoría usando el formulario de arriba
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between py-5 border-b border-gray-200 hover:opacity-70 transition-opacity"
            >
              <span className="text-base font-normal text-black">{category.name}</span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenEditModal(category)}
                  className="p-2 text-gray-600 hover:text-black transition-colors"
                  title="Editar categoría"
                >
                  <BiEditAlt size={20} />
                </button>

                <button
                  onClick={() => handleOpenDeleteModal(category)}
                  className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                  title="Eliminar categoría"
                >
                  <RiDeleteBin6Line size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editModalCategory && (
        <EditCategoryModal
          isOpen={!!editModalCategory}
          onClose={handleCloseEditModal}
          idCategory={editModalCategory.id}
          nameCategory={editModalCategory.name}
        />
      )}

      {/* Delete Modal */}
      {deleteModalCategory && (
        <DeleteCategoryModal
          isOpen={!!deleteModalCategory}
          onClose={handleCloseDeleteModal}
          idCategory={deleteModalCategory.id}
          nameCategory={deleteModalCategory.name}
        />
      )}
    </div>
  );
}
