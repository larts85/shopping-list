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
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full">
        <h2 className="text-xl font-semibold mb-4">Solicitud de Datos</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Close
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
