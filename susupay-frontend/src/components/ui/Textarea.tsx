import { forwardRef, type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  maxChars?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, maxChars, value, className = '', id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const charCount = typeof value === 'string' ? value.length : 0;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          className={`
            w-full rounded-lg border px-3 py-2.5 text-gray-900
            placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0
            resize-none
            ${error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
            }
            ${className}
          `}
          {...props}
        />
        <div className="flex justify-between mt-1">
          {error && <p className="text-sm text-red-600">{error}</p>}
          {maxChars && (
            <p className={`text-xs ml-auto ${charCount > maxChars ? 'text-red-600' : 'text-gray-400'}`}>
              {charCount}/{maxChars}
            </p>
          )}
        </div>
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';
