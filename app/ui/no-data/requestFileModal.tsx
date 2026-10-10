"use client";
import Modal from "@/shared/components/ui/Modal";
("use cliente");
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
    "Hola, por favor me puedes compartir el archivo de datos de Home Logistic.",
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
    <Modal isOpen={isOpen} onClose={onClose} title="Solicitar datos">
      <h2 className="text-xl font-semibold mb-4">Solicitar datos</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="requestFileModal-field-0"
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            id="requestFileModal-field-0"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="field mt-2"
          />
        </div>
        <div>
          <label
            htmlFor="requestFileModal-field-1"
            className="block text-sm font-medium text-gray-700"
          >
            Asunto
          </label>
          <input
            id="requestFileModal-field-1"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            className="field mt-2"
          />
        </div>
        <div>
          <label
            htmlFor="requestFileModal-field-2"
            className="block text-sm font-medium text-gray-700"
          >
            Message
          </label>
          <textarea
            id="requestFileModal-field-2"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            className="field mt-2"
          />
        </div>
        <div className="flex justify-end space-x-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Close
          </button>
          <button type="submit" className="btn-primary">
            Send
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default RequestFileModal;
