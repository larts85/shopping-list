"use client";
import { listFetch } from "@/app/lib/listClient";
import { useEffect, useState } from "react";
import { BiEditAlt } from "react-icons/bi";
import { RiDeleteBin6Line } from "react-icons/ri";
import EditCategoryModal from "./editCategoryModal";
import DeleteCategoryModal from "./deleteCategoryModal";
import ActionMenu from "@/shared/components/ui/ActionMenu";
import {
  Card,
  CardHeader,
  CardContent,
} from "../../../../shared/components/ui/Card";
import { Button, ButtonVariant } from "../../../../shared";

interface Category {
  id: string;
  name: string;
}

export default function ListCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [editModalCategory, setEditModalCategory] = useState<Category | null>(
    null,
  );
  const [deleteModalCategory, setDeleteModalCategory] =
    useState<Category | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setError("");
    try {
      const categoriesResponse = await listFetch(
        "/api/categories/get-categories",
        {
          method: "GET",
          headers: { "content-type": "application/json" },
        },
      );
      if (!categoriesResponse.ok) {
        throw new Error("Error fetching categories");
      }
      const listCategories = await categoriesResponse.json();
      setCategories(Array.isArray(listCategories) ? listCategories : []);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setError("No pudimos cargar las categorías. Intenta nuevamente.");
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
          <div className="flex shrink-0 items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-600"></div>
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
          <h2 className="text-xl font-semibold text-gray-900">
            Lista de Categorías
          </h2>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="error-notice" role="alert">
              <p>{error}</p>
              <button className="btn-secondary mt-3" onClick={fetchCategories}>
                Reintentar
              </button>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-lg">
                No hay categorías registradas
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Agrega tu primera categoría usando el formulario de arriba
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="w-3 h-3 shrink-0 bg-zinc-400 rounded-full"></div>
                    <span className="min-w-0 break-words text-gray-900 font-medium">
                      {category.name}
                    </span>
                  </div>

                  <div className="hidden shrink-0 items-center space-x-2 md:flex">
                    <Button
                      variant={ButtonVariant.GHOST}
                      onClick={() => handleOpenEditModal(category)}
                      className="p-2 min-h-11 w-11 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                      aria-label={`Editar ${category.name}`}
                      title="Editar categoría"
                    >
                      <BiEditAlt size={16} />
                    </Button>

                    <Button
                      variant={ButtonVariant.GHOST}
                      onClick={() => handleOpenDeleteModal(category)}
                      className="p-2 min-h-11 w-11 text-red-600 hover:text-red-800 hover:bg-red-50"
                      aria-label={`Eliminar ${category.name}`}
                      title="Eliminar categoría"
                    >
                      <RiDeleteBin6Line size={16} />
                    </Button>
                  </div>
                  <ActionMenu
                    label={`Acciones para la categoría ${category.name}`}
                    items={[
                      {
                        label: "Editar categoría",
                        icon: BiEditAlt,
                        onSelect: () => handleOpenEditModal(category),
                      },
                      {
                        label: "Eliminar categoría",
                        icon: RiDeleteBin6Line,
                        destructive: true,
                        onSelect: () => handleOpenDeleteModal(category),
                      },
                    ]}
                  />
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
