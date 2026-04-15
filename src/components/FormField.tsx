import React from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  type: React.HTMLInputTypeAttribute;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  required?: boolean;
}

const FormField = ({ id, label, type, placeholder, value, onChange, hint, required = true }: FormFieldProps) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-gray-700" htmlFor={id}>{label}</label>
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
    />
    {hint && <span className="text-xs text-gray-400">{hint}</span>}
  </div>
);

export default FormField;
