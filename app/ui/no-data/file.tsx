"use client";
import { createFolderAndSheet } from "../../actions/googleDrive";
import React, { useState, useRef } from "react";
import RequestFileModal from "./requestFileModal";
import Link from "next/link";



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
    <div className="w-full max-w-lg mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-normal text-black mb-6 tracking-tight">
          Configuración Inicial
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed max-w-md mx-auto mb-4">
          Actualmente no tienes ningún archivo de datos configurado.
          Selecciona una de las siguientes opciones para comenzar.
        </p>
        <p className="text-base text-gray-600">
          Elige cómo deseas configurar tu sistema de listas de compras
        </p>
      </div>

      <div className="flex flex-col space-y-4 mb-8">
        <button
          onClick={createFile}
          disabled={isLoading}
          className="w-full px-8 py-4 text-base font-normal text-white bg-black hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Creando archivos..." : "Crear Archivo"}
        </button>

        <button
          onClick={handleOpenModal}
          className="w-full px-8 py-4 text-base font-normal text-black bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Solicitar Archivo
        </button>
      </div>

      <div className="flex justify-center">
        <Link
          href="/"
          className="text-base text-gray-600 hover:text-black underline transition-colors"
        >
          Volver al inicio
        </Link>
      </div>

      <Link href="/logistic" ref={linkRef} className="hidden" />

      {isModalOpen && (
        <RequestFileModal isOpen={isModalOpen} onClose={handleClose} />
      )}
    </div>
  );
}
