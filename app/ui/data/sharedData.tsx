'use client'
import { useState } from 'react'
import SharedDataModal from './sharedDataModal'
import { getCategories } from '../../actions/categories'

export default function SharedData() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const prueba = async () => {
    const categories = await getCategories()
  }

  return (
    <div className="flex flex-col gap-6 pl-3 justify-center items-center h-[30vh]">
      <button
        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 w-40"
        onClick={handleOpenModal}
      >
        Compartir Datos
      </button>

      {isModalOpen && (
        <SharedDataModal isOpen={isModalOpen} onClose={handleCloseModal} />
      )}
      <button onClick={prueba}>prueba</button>
    </div>
  )
}
