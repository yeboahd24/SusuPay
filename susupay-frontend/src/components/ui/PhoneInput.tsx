import { forwardRef, type InputHTMLAttributes } from 'react';

interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'pattern'> {
  label?: string;
  error?: string;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ label = 'Phone Number', error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type="tel"
          inputMode="numeric"
          placeholder="0244 000 000"
          maxLength={10}
          className={`
            w-full rounded-lg border px-3 py-2.5 text-gray-900
            placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0
            ${error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
            }
            ${className}
          `}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  },
);

PhoneInput.displayName = 'PhoneInput';

export function isValidGhanaPhone(phone: string): boolean {
  return /^0\d{9}$/.test(phone);
}
