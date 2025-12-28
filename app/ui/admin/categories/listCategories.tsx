"use client";
import React, { useEffect, useState } from "react";
import { BiEditAlt } from "react-icons/bi";
import { RiDeleteBin6Line } from "react-icons/ri";
import EditCategoryModal from "./editCategoryModal";
import DeleteCategoryModal from "./deleteCategoryModal";
import { Card, CardHeader, CardTitle, CardContent } from "../../../../shared/components/ui/Card";
import { Button, ButtonVariant } from "../../../../shared";

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
      <Card className="w-full">
        <CardContent className="flex justify-center items-center py-8">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Cargando categorías...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Lista de Categorías
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-lg">No hay categorías registradas</p>
              <p className="text-gray-400 text-sm mt-2">
                Agrega tu primera categoría usando el formulario de arriba
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    <span className="text-gray-900 font-medium">{category.name}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant={ButtonVariant.GHOST}
                      onClick={() => handleOpenEditModal(category)}
                      className="p-2 h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      title="Editar categoría"
                    >
                      <BiEditAlt size={16} />
                    </Button>

                    <Button
                      variant={ButtonVariant.GHOST}
                      onClick={() => handleOpenDeleteModal(category)}
                      className="p-2 h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50"
                      title="Eliminar categoría"
                    >
                      <RiDeleteBin6Line size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
