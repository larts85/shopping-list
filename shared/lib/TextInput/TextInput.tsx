import { forwardRef } from 'react'

export type TextInputSize = 'sm' | 'md' | 'lg'
export type TextInputVariant = 'default' | 'minimal'

export interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  helperText?: string
  error?: string
  size?: TextInputSize
  variant?: TextInputVariant
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      type = 'text',
      placeholder,
      value,
      defaultValue,
      onChange,
      onBlur,
      onFocus,
      disabled = false,
      required = false,
      error,
      label,
      helperText,
      className = '',
      size = 'md',
      variant = 'default',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`

    const baseClasses =
      'w-full border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed bg-white '

    const sizeClasses: Record<TextInputSize, string> = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-3 text-base',
      lg: 'px-5 py-4 text-lg',
    }

    const variantClasses: Record<TextInputVariant, string> = {
      default: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/20',
      minimal:
        'border-0 border-b-2 border-gray-300 rounded-none focus:border-black focus:ring-0 px-0',
    }

    const errorClasses = error
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : ''

    const combinedClasses = `
      ${baseClasses}
      ${sizeClasses[size]}
      ${variantClasses[variant]}
      ${errorClasses}
      ${className}
    `
      .trim()
      .replace(/\s+/g, ' ')

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {label}{' '}
            <span className="text-gray-500 font-normal">
              {required ? '(requerido)' : '(opcional)'}
            </span>
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          disabled={disabled}
          required={required}
          className={combinedClasses}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? 'error-message' : helperText ? 'helper-text' : undefined
          }
          {...props}
        />

        {error && (
          <p id="error-message" className="mt-1 text-sm text-red-600">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id="helper-text" className="mt-1 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

TextInput.displayName = 'TextInput'

export default TextInput
