import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordField({ value, onChange, autoComplete, required, minLength, id, placeholder }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        id={id}
        className="password-field__input"
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
      />
      <button
        type="button"
        className="password-field__toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        tabIndex={-1}
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}
