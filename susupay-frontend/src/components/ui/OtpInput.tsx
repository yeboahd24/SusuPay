import { useRef, useCallback, useEffect, type KeyboardEvent, type ClipboardEvent } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: string;
  label?: string;
}

export function OtpInput({ value, onChange, onComplete, error, label }: OtpInputProps) {
  const length = 6;
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const focusInput = useCallback((index: number) => {
    inputRefs.current[index]?.focus();
  }, []);

  useEffect(() => {
    if (value.length === length && onComplete) {
      onComplete(value);
    }
  }, [value, onComplete]);

  const handleChange = useCallback(
    (index: number, char: string) => {
      if (!/^\d?$/.test(char)) return;
      const chars = value.split('');
      chars[index] = char;
      const newValue = chars.join('').slice(0, length);
      onChange(newValue);
      if (char && index < length - 1) {
        focusInput(index + 1);
      }
    },
    [value, onChange, focusInput],
  );

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !value[index] && index > 0) {
        focusInput(index - 1);
      }
    },
    [value, focusInput],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
      if (pasted) {
        onChange(pasted);
        focusInput(Math.min(pasted.length, length - 1));
      }
    },
    [onChange, focusInput],
  );

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      )}
      <div className="flex gap-2 justify-center">
        {Array.from({ length }, (_, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[i] || ''}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            className={`
              w-11 h-14 text-center text-xl font-bold rounded-lg border
              focus:outline-none focus:ring-2 focus:ring-offset-0
              ${error
                ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
              }
            `}
          />
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-600 text-center">{error}</p>}
    </div>
  );
}
