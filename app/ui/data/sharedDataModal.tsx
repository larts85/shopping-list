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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    try {
      const idFolder = await getFolderId("homeLogistic");

      if (!idFolder) throw new Error("Folder not found");
      if (idFolder) {
        const isShared = await shareFolder("homeLogistic", idFolder, email);

        if (!isShared) throw new Error("Sharing failed");
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
      setError("No pudimos completar la solicitud. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compartir datos">
      <h2 className="text-xl font-semibold mb-4">Compartir datos</h2>
      {error && (
        <p role="alert" className="error-notice mb-4">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="sharedDataModal-field-0"
            className="block text-sm font-medium text-gray-700"
          >
            Correo electrónico
          </label>
          <input
            id="sharedDataModal-field-0"
            type="email"
            autoComplete="email"
            placeholder="email@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="field mt-2"
          />
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? "Compartiendo…" : "Compartir"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
export default SharedDataModal;
