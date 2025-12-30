"use client";
import { createFolderAndSheet } from "../../actions/googleDrive";
import React, { useState, useRef } from "react";
import RequestFileModal from "./requestFileModal";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../../shared/components/ui/Card";
import { Button, ButtonVariant } from "../../../shared";

export default function File() {
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const linkRef = useRef<HTMLAnchorElement>(null);

  const createFile = async () => {
    setIsLoading(true);

    try {
      const create = await createFolderAndSheet(
        "homeLogistic",
        "homeLogisticSheet"
      );

      if (!create) {
        throw new Error("Error al configurar las hojas de cálculo");
      }

      if (typeof create === "string") {
        setIsLoading(false);
        alert("La carpeta ya existe");
      } else {
        // Lógica si se creó la carpeta y el archivo correctamente
        setIsLoading(false);
        linkRef.current?.click();
      }
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-gray-900">
          Configuración Inicial
        </CardTitle>
        <CardDescription className="text-gray-600">
          Actualmente no tienes ningún archivo de datos configurado.
          Selecciona una de las siguientes opciones para comenzar.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            Elige cómo deseas configurar tu sistema de listas de compras:
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col space-y-3">
        <Button
          onClick={createFile}
          disabled={isLoading}
          isLoading={isLoading}
          variant={ButtonVariant.PRIMARY}
          className="w-full"
        >
          {isLoading ? "Creando archivos..." : "Crear Archivo"}
        </Button>

        <Button
          onClick={handleOpenModal}
          variant={ButtonVariant.SECONDARY}
          className="w-full"
        >
          Solicitar Archivo
        </Button>

        <div className="flex justify-center pt-2">
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Volver al inicio
          </Link>
        </div>

        <Link href="/logistic" ref={linkRef} className="hidden" />
      </CardFooter>

      {isModalOpen && (
        <RequestFileModal isOpen={isModalOpen} onClose={handleClose} />
      )}
    </Card>
  );
}
