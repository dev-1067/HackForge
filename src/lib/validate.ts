export const validators = {
  name: (v: string) => (v.trim().length < 2 ? 'Enter your full name.' : ''),
  phone: (v: string) => (/^\+?[0-9]{10,15}$/.test(v.replace(/[\s\-()]/g, '')) ? '' : 'Enter a valid mobile number (10 to 15 digits).'),
  email: (v: string) => (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim()) ? '' : 'Enter a valid work email.'),
  newPassword: (v: string) =>
    v.length < 8 ? 'Use at least 8 characters.' : /^[0-9]+$/.test(v) ? 'Use a mix of letters and numbers.' : '',
  required: (label: string) => (v: string) => (v.trim() ? '' : `Enter ${label}.`),
}

export type Errors = Record<string, string>

/** Runs each field's validator and returns only the failures. */
export function check(values: Record<string, string>, rules: Record<string, (v: string) => string>): Errors {
  const errors: Errors = {}
  for (const [field, rule] of Object.entries(rules)) {
    const message = rule(values[field] ?? '')
    if (message) errors[field] = message
  }
  return errors
}
