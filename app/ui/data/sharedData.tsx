"use client";
import { useState } from "react";
import SharedDataModal from "./sharedDataModal";
export default function SharedData() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  return (
    <section className="panel max-w-2xl">
      <h2 className="text-xl font-semibold">Una lista para todo el hogar</h2>
      <p className="mt-3 text-sm leading-relaxed text-zinc-500">
        Comparte el acceso a tus datos para que todos puedan colaborar con las
        compras.
      </p>
      <button className="btn-primary mt-6" onClick={() => setIsModalOpen(true)}>
        Compartir datos
      </button>
      {isModalOpen && (
        <SharedDataModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </section>
  );
}
