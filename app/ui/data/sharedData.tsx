'use client'
import { useState } from 'react'
import SharedDataModal from './sharedDataModal'

export default function SharedData() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }


  return (
    <div className="flex flex-col gap-6 justify-center items-center min-h-[50vh] p-6">
      <button
        className="px-8 py-3 text-base font-normal text-white bg-black hover:opacity-80 transition-opacity"
        onClick={handleOpenModal}
      >
        Compartir Datos
      </button>

      {isModalOpen && (
        <SharedDataModal isOpen={isModalOpen} onClose={handleCloseModal} />
      )}
    </div>
  )
}
