"use client";
import React, { useState } from "react";
import { sendEmail } from "../../actions/googleDrive";
import { shareFolder } from "../../actions/googleDrive";
import { getFolderId } from "../../actions/googleDrive";

interface RequestFileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SharedDataModal: React.FC<RequestFileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const idFolder = await getFolderId("homeLogistic");

      if (idFolder) {
        const isShared = await shareFolder("homeLogistic", idFolder, email);

        if (isShared) {
          await sendEmail(
            email,
            "Aviso de permiso",
            "Se informa que ya tiene acceso a los datos de Home Logistic"
          );
        }
      }
      onClose();
    } catch (error) {
      console.error("Error al enviar el correo:", error);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-10 max-w-lg w-full">
        <h2 className="text-3xl font-normal text-black mb-8">Compartir Datos</h2>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-base font-normal text-black mb-3">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@ejemplo.com"
              className="w-full px-4 py-3 text-base border border-gray-300 focus:outline-none focus:border-black"
            />
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 text-base font-normal text-black bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-8 py-3 text-base font-normal text-white bg-black hover:opacity-80 transition-opacity"
            >
              Compartir
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default SharedDataModal;
