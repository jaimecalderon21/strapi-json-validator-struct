import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Field } from '@strapi/design-system';
import { type InputProps, useField } from '@strapi/strapi/admin';
import styled from 'styled-components';

const StyledTextareaWrapper = styled.div<{ $hasError: boolean }>`
  textarea {
    border: 1px solid
      ${({ theme, $hasError }) => ($hasError ? theme.colors.danger600 : theme.colors.neutral200)};
    border-radius: ${({ theme }) => theme.borderRadius};
    background: ${({ theme }) => theme.colors.neutral0};
    color: ${({ theme }) => theme.colors.neutral800};
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Droid Sans Mono', 'Source Code Pro', monospace;
    font-size: ${({ theme }) => theme.fontSizes[2]};
    padding: ${({ theme }) => theme.spaces[3]};
    width: 100%;
    min-height: 120px;
    resize: vertical;
    outline: none;
    transition: border-color 0.2s ease;

    &:focus {
      border-color: ${({ theme }) => theme.colors.primary600};
      box-shadow: ${({ theme }) => theme.colors.primary600} 0 0 0 2px;
    }

    &::placeholder {
      color: ${({ theme }) => theme.colors.neutral500};
    }
  }
`;

const PLUGIN_ID = 'strapi-phone-validator-5';

interface ValidationResult {
  valid: boolean;
  error?: string;
}

const validateJsonStructure = (value: string): ValidationResult => {
  if (!value.trim()) {
    return { valid: true };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return { valid: false, error: 'Invalid JSON format' };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { valid: false, error: 'Must be a JSON object' };
  }

  const keys = Object.keys(parsed as Record<string, unknown>);
  if (keys.length !== 1) {
    return { valid: false, error: 'Must contain exactly one key: "funtion-name"' };
  }

  if (keys[0] !== 'funtion-name') {
    return { valid: false, error: 'The key must be "funtion-name"' };
  }

  const val = (parsed as Record<string, unknown>)['funtion-name'];
  if (typeof val !== 'string') {
    return { valid: false, error: 'The value of "funtion-name" must be a string' };
  }

  if (val.includes(' ')) {
    return { valid: false, error: 'The value must not contain spaces' };
  }

  if (val.includes('_')) {
    return { valid: false, error: 'The value must not contain underscores' };
  }

  return { valid: true };
};

type StrapiChangeEvent = { target: { name: string; value: string; type?: string } };

const Input = ({
  hint,
  disabled,
  labelAction,
  label,
  name,
  required,
  placeholder,
  ...props
}: InputProps & {
  onChange: (event: StrapiChangeEvent) => void;
}) => {
  const field = useField(name);
  const rawValue = (field.value as string | null | undefined) ?? '';
  const [jsonValue, setJsonValue] = useState<string>(rawValue);
  const { formatMessage } = useIntl();

  const validation = validateJsonStructure(jsonValue);
  const hasValue = jsonValue.trim().length > 0;
  const hasExternalError = Boolean(field.error);
  const hasValidationError = hasValue && !validation.valid;
  const hasError = hasExternalError || hasValidationError;
  const errorMessage = hasValidationError
    ? validation.error
    : field.error;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const event: StrapiChangeEvent = {
      target: {
        name,
        value: newValue,
        type: 'text',
      },
    };
    field.onChange(newValue);
    props.onChange(event);
    setJsonValue(newValue);
  };

  return (
    <Field.Root
      name={name}
      id={name}
      hint={hint}
      required={required}
      disabled={disabled}
      error={errorMessage}
    >
      <Field.Label action={labelAction}>{label}</Field.Label>
      <StyledTextareaWrapper $hasError={hasError}>
        <textarea
          id={name}
          name={name}
          value={jsonValue}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          placeholder={placeholder || `{\n  "funtion-name": ""\n}`}
          rows={6}
        />
      </StyledTextareaWrapper>
      <Field.Hint />
      <Field.Error />
    </Field.Root>
  );
};

export default Input;
