"use client";
import { sendEmail } from "@/app/actions/googleDrive";

import { useState } from "react";

interface RequestFileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RequestFileModal: React.FC<RequestFileModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("Solicitud de carpeta");
  const [message, setMessage] = useState(
    "Hola, por favor me puedes compartir el archivo de datos de Home Logistic."
  );

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await sendEmail(email, subject, message); // Enviar el correo primero
      onClose(); // Cerrar el modal después de que se haya enviado el correo
    } catch (error) {
      console.error("Error al enviar el correo:", error);
      // Puedes manejar el error aquí, como mostrar un mensaje de error al usuario
    }
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-10 max-w-lg w-full">
        <h2 className="text-3xl font-normal text-black mb-8">Solicitud de Datos</h2>
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
              className="w-full px-4 py-3 text-base border border-gray-300 focus:outline-none focus:border-black"
            />
          </div>
          <div>
            <label className="block text-base font-normal text-black mb-3">
              Asunto
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full px-4 py-3 text-base border border-gray-300 focus:outline-none focus:border-black"
            />
          </div>
          <div>
            <label className="block text-base font-normal text-black mb-3">
              Mensaje
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={4}
              className="w-full px-4 py-3 text-base border border-gray-300 focus:outline-none focus:border-black resize-none"
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
              Enviar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestFileModal;
