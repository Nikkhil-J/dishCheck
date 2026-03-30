'use client'

import { type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

interface BaseProps {
  label?: string
  error?: string
  helperText?: string
}

interface InputProps extends BaseProps, InputHTMLAttributes<HTMLInputElement> {
  as?: 'input'
}

interface TextareaProps extends BaseProps, TextareaHTMLAttributes<HTMLTextAreaElement> {
  as: 'textarea'
}

type Props = InputProps | TextareaProps

const baseFieldClasses =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-50 disabled:cursor-not-allowed'

const errorFieldClasses =
  'border-red-400 focus:ring-red-400 focus:border-red-400'

export function Input(props: Props) {
  const { label, error, helperText } = props
  const hasError = Boolean(error)
  const fieldClasses = [baseFieldClasses, hasError ? errorFieldClasses : ''].join(' ')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      {props.as === 'textarea' ? (
        <textarea
          rows={4}
          className={fieldClasses}
          {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          className={fieldClasses}
          {...(props as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
      {!error && helperText && <p className="text-xs text-gray-400">{helperText}</p>}
    </div>
  )
}
