import React from 'react';
import { useConfigStyles } from './useConfigStyles';

interface FormInputProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
  required?: boolean;
  description?: string;
  codeExample?: string;
}

export const FormInput: React.FC<FormInputProps> = ({ label, value, onChange, type = 'text', required = false, description, codeExample }) => {
  const s = useConfigStyles();
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={s.labelStyle}>{label}{required && ' *'}</label>
      {description && <small style={s.descriptionStyle}>{description}</small>}
      {codeExample && <pre style={s.preStyle}>{codeExample}</pre>}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={s.inputStyle} />
    </div>
  );
};

interface FormSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  description?: string;
}

export const FormSlider: React.FC<FormSliderProps> = ({ label, value, onChange, min, max, step, description }) => {
  const s = useConfigStyles();
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={s.labelStyle}>{label}</label>
      {description && <small style={s.descriptionStyle}>{description}</small>}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ flex: 1, accentColor: s.theme.primary }} />
        <span style={{ minWidth: '70px', textAlign: 'right', color: s.theme.gray900, fontSize: '13px' }}>{value}</span>
      </div>
    </div>
  );
};

interface FormCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

export const FormCheckbox: React.FC<FormCheckboxProps> = ({ label, checked, onChange, description }) => {
  const s = useConfigStyles();
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={s.labelStyle}>{label}</label>
      {description && <small style={s.descriptionStyle}>{description}</small>}
      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
          style={{ marginRight: '8px', width: '16px', height: '16px', accentColor: s.theme.primary, cursor: 'pointer' }} />
        <span style={{ color: s.theme.gray900, fontSize: '13px' }}>{label}</span>
      </label>
    </div>
  );
};

interface FormRadioGroupProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  description?: string;
}

export const FormRadioGroup: React.FC<FormRadioGroupProps> = ({ label, options, value, onChange, description }) => {
  const s = useConfigStyles();
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={s.labelStyle}>{label}</label>
      {description && <small style={s.descriptionStyle}>{description}</small>}
      {options.map((option) => (
        <label key={option} style={{ display: 'block', marginBottom: '4px', cursor: 'pointer', color: s.theme.gray900, fontSize: '13px' }}>
          <input type="radio" name={label} value={option} checked={value === option}
            onChange={(e) => onChange(e.target.value)}
            style={{ marginRight: '8px', accentColor: s.theme.primary }} />
          {option}
        </label>
      ))}
    </div>
  );
};

interface FormSelectProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  description?: string;
}

export const FormSelect: React.FC<FormSelectProps> = ({ label, options, value, onChange, required = false, description }) => {
  const s = useConfigStyles();
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={s.labelStyle}>{label}{required && ' *'}</label>
      {description && <small style={s.descriptionStyle}>{description}</small>}
      <select value={value} onChange={(e) => onChange(e.target.value)} style={s.selectStyle}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
};
