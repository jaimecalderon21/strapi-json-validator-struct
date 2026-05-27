import { useState } from 'react';
import { Field, Flex } from '@strapi/design-system';
import { type InputProps, useField } from '@strapi/strapi/admin';
import styled from 'styled-components';

// ─── Styled textarea ─────────────────────────────────────────────────────────

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
    min-height: 140px;
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

// ─── Types & schemas ──────────────────────────────────────────────────────────

type ActionType =
  | 'navigate'
  | 'track_event'
  | 'deeplink'
  | 'open_webview'
  | 'execute_function';

const ACTION_TYPES: ActionType[] = [
  'navigate',
  'track_event',
  'deeplink',
  'open_webview',
  'execute_function',
];

interface FieldDef {
  name: string;
  type: string;
  required: boolean;
}

const actionFields: Record<ActionType, FieldDef[]> = {
  navigate: [
    { name: 'type', type: '"navigate"', required: true },
    { name: 'screen', type: 'string', required: true },
    { name: 'params', type: 'object', required: false },
  ],
  track_event: [
    { name: 'type', type: '"track_event"', required: true },
    { name: 'event_name', type: 'string', required: true },
    { name: 'properties', type: 'object', required: false },
  ],
  deeplink: [
    { name: 'type', type: '"deeplink"', required: true },
    { name: 'url', type: 'string (uri)', required: true },
  ],
  open_webview: [
    { name: 'type', type: '"open_webview"', required: true },
    { name: 'url', type: 'string (uri)', required: true },
    { name: 'title', type: 'string', required: false },
  ],
  execute_function: [
    { name: 'type', type: '"execute_function"', required: true },
    { name: 'function_name', type: 'string (no spaces)', required: true },
    { name: 'args', type: 'array', required: false },
  ],
};

const examples: Record<ActionType, string> = {
  navigate: '{\n  "type": "navigate",\n  "screen": "Home",\n  "params": {}\n}',
  track_event: '{\n  "type": "track_event",\n  "event_name": "button_click",\n  "properties": {}\n}',
  deeplink: '{\n  "type": "deeplink",\n  "url": "https://example.com"\n}',
  open_webview: '{\n  "type": "open_webview",\n  "url": "https://example.com",\n  "title": "Page"\n}',
  execute_function: '{\n  "type": "execute_function",\n  "function_name": "myFunction",\n  "args": []\n}',
};

// ─── Validation ───────────────────────────────────────────────────────────────

interface ValidationResult {
  valid: boolean;
  error?: string;
  detectedType?: ActionType;
}

function validatePayload(value: string): ValidationResult {
  if (!value.trim()) return { valid: true };

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return { valid: false, error: 'Invalid JSON' };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { valid: false, error: 'Must be a JSON object' };
  }

  const obj = parsed as Record<string, unknown>;

  // Validate that 'type' exists and is a known action type
  if (!obj.type) {
    return {
      valid: false,
      error: `Missing required field "type". Must be one of: ${ACTION_TYPES.join(', ')}`,
    };
  }

  if (typeof obj.type !== 'string' || !ACTION_TYPES.includes(obj.type as ActionType)) {
    return {
      valid: false,
      error: `"type" must be one of: ${ACTION_TYPES.join(', ')}`,
    };
  }

  const actionType = obj.type as ActionType;
  const fields = actionFields[actionType];
  const allowedKeys = new Set(fields.map((f) => f.name));

  // Check required fields
  for (const field of fields) {
    if (field.required && (obj[field.name] === undefined || obj[field.name] === null)) {
      return { valid: false, error: `Missing required field: "${field.name}"`, detectedType: actionType };
    }
  }

  // Check for unexpected fields
  const extraKeys = Object.keys(obj).filter((k) => !allowedKeys.has(k));
  if (extraKeys.length > 0) {
    return {
      valid: false,
      error: `Unexpected field${extraKeys.length > 1 ? 's' : ''}: "${extraKeys.join('", "')}"`,
      detectedType: actionType,
    };
  }

  // Type-specific validations
  if (actionType === 'execute_function' && typeof obj.function_name === 'string') {
    if (obj.function_name.includes(' ')) {
      return { valid: false, error: '"function_name" must not contain spaces', detectedType: actionType };
    }
  }

  if (
    (actionType === 'deeplink' || actionType === 'open_webview') &&
    obj.url !== undefined &&
    typeof obj.url !== 'string'
  ) {
    return { valid: false, error: '"url" must be a string', detectedType: actionType };
  }

  if (actionType === 'navigate' && obj.screen !== undefined && typeof obj.screen !== 'string') {
    return { valid: false, error: '"screen" must be a string', detectedType: actionType };
  }

  if (actionType === 'track_event' && obj.event_name !== undefined && typeof obj.event_name !== 'string') {
    return { valid: false, error: '"event_name" must be a string', detectedType: actionType };
  }

  return { valid: true, detectedType: actionType };
}

// ─── Component ────────────────────────────────────────────────────────────────

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

  const result = validatePayload(jsonValue);
  const hasValue = jsonValue.trim().length > 0;
  const hasExternalError = Boolean(field.error);
  const hasValidationError = hasValue && !result.valid;
  const hasError = hasExternalError || hasValidationError;
  const errorMessage = hasValidationError ? result.error : field.error;

  const detectedType = result.detectedType;
  const schemaToShow: ActionType = detectedType ?? 'execute_function';

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    field.onChange(newValue);
    props.onChange({ target: { name, value: newValue, type: 'text' } });
    setJsonValue(newValue);
  };

  return (
    <Field.Root name={name} id={name} hint={hint} required={required} disabled={disabled} error={errorMessage}>
      <Field.Label action={labelAction}>{label}</Field.Label>
      <Flex direction="column" alignItems="stretch" gap={2}>

        {/* Schema reference */}
        <div
          style={{
            padding: '10px 14px',
            background: '#eef4ff',
            border: '1px solid #c7d9ff',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: "'SF Mono', 'Monaco', monospace",
            lineHeight: '1.7',
            color: '#1a1a4b',
          }}
        >
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', color: '#4945ff', textTransform: 'uppercase' }}>
              ℹ︎ Schema — {schemaToShow}
            </span>
            {/* Available types pills */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {ACTION_TYPES.map((t) => (
                <span
                  key={t}
                  style={{
                    padding: '1px 7px',
                    borderRadius: '20px',
                    fontSize: '10px',
                    fontWeight: 600,
                    fontFamily: 'sans-serif',
                    background: t === schemaToShow ? '#4945ff' : '#d6e4ff',
                    color: t === schemaToShow ? '#fff' : '#3a3a8c',
                    letterSpacing: '0.2px',
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          {/* Fields */}
          <div style={{ borderTop: '1px solid #c7d9ff', paddingTop: '6px' }}>
            {actionFields[schemaToShow].map((f) => (
              <div key={f.name}>
                <span style={{ color: f.required ? '#4945ff' : '#7b8fb5' }}>
                  {f.required ? '● ' : '○ '}
                </span>
                <strong>{f.name}</strong>
                <span style={{ color: '#7b8fb5' }}>: {f.type}</span>
                {!f.required && <span style={{ color: '#a5b8d9' }}> (optional)</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Textarea */}
        <StyledTextareaWrapper $hasError={hasError}>
          <textarea
            id={name}
            name={name}
            value={jsonValue}
            onChange={handleChange}
            disabled={disabled}
            required={required}
            placeholder={placeholder || examples[schemaToShow]}
            rows={7}
          />
        </StyledTextareaWrapper>

      </Flex>
      <Field.Hint />
      <Field.Error />
    </Field.Root>
  );
};

export default Input;
