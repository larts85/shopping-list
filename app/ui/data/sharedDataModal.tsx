"use client";
import Modal from "@/shared/components/ui/Modal";
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
            "Se informa que ya tiene acceso a los datos de Home Logistic",
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
    <Modal isOpen={isOpen} onClose={onClose} title="Compartir datos">
      <h2 className="text-xl font-semibold mb-4">Compartir datos</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="sharedDataModal-field-0"
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            id="sharedDataModal-field-0"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="field mt-2"
          />
        </div>

        <div className="flex justify-end space-x-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Close
          </button>
          <button type="submit" className="btn-primary">
            Compartir
          </button>
        </div>
      </form>
    </Modal>
  );
};
export default SharedDataModal;
