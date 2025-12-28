import React from 'react'

export enum Variant {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  TERTIARY = 'tertiary',
  OUTLINE = 'outline',
  GHOST = 'ghost',
  LINK = 'link',
}

export enum ButtonType {
  BUTTON = 'button',
  SUBMIT = 'submit',
  RESET = 'reset',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  type?: ButtonType
  disabled?: boolean
  isLoading?: boolean
  className?: string
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = Variant.PRIMARY,
  type = ButtonType.BUTTON,
  disabled = false,
  isLoading = false,
  className = '',
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center px-6 py-3 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variantClasses = {
    [Variant.PRIMARY]:
      'bg-black text-white hover:bg-gray-800 focus:ring-gray-500',
    [Variant.SECONDARY]:
      'bg-white text-black border border-black hover:bg-gray-50 focus:ring-gray-500',
    [Variant.TERTIARY]:
      'bg-gray-100 text-black hover:bg-gray-200 focus:ring-gray-500',
    [Variant.OUTLINE]:
      'border border-gray-300 text-gray-700 bg-transparent hover:bg-gray-50 focus:ring-gray-500',
    [Variant.GHOST]:
      'text-gray-700 bg-transparent hover:bg-gray-100 focus:ring-gray-500',
    [Variant.LINK]:
      'text-black underline hover:text-gray-700 p-0 focus:ring-gray-500',
  }

  const combinedClasses =
    `${baseClasses} ${variantClasses[variant]} ${className}`.trim()

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={combinedClasses}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  )
}

export default Button
