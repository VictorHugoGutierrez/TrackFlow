const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const VALIDATION_LIMITS = {
  passwordMin: 6,
  userNameMin: 2,
  userNameMax: 100,
  clientNameMin: 2,
  clientNameMax: 160,
  projectNameMin: 2,
  projectNameMax: 180,
  taskTitleMin: 2,
  taskTitleMax: 200,
  timeEntryDescriptionMax: 500,
  pomodoroFocusMin: 1,
  pomodoroFocusMax: 120,
  pomodoroPauseMin: 1,
  pomodoroPauseMax: 60,
};

export const VALID_CURRENCIES = ["BRL", "USD", "EUR"];
export const VALID_THEMES = ["dark", "light"];

export function normalizeText(value) {
  return String(value ?? "").trim();
}

export function createValidationError(message) {
  const error = new Error(message);
  error.name = "ValidationError";
  return error;
}

export function isValidEmail(value) {
  return EMAIL_REGEX.test(normalizeText(value));
}

export function isValidPassword(value) {
  return String(value ?? "").length >= VALIDATION_LIMITS.passwordMin;
}

export function getFirstValidationError(...validations) {
  return validations.find((validation) => validation?.error)?.error ?? null;
}

export function validateEmail(value, options = {}) {
  const { required = true, label = "E-mail" } = options;
  const email = normalizeText(value);

  if (!email) {
    return {
      value: email,
      error: required ? `${label} é obrigatório.` : null,
    };
  }

  return {
    value: email,
    error: isValidEmail(email) ? null : `${label} inválido.`,
  };
}

export function validatePassword(value) {
  const password = String(value ?? "");

  if (!password) {
    return { value: password, error: "Senha é obrigatória." };
  }

  return {
    value: password,
    error: isValidPassword(password)
      ? null
      : `A senha deve ter no mínimo ${VALIDATION_LIMITS.passwordMin} caracteres.`,
  };
}

export function validateRequiredText(value, options) {
  const { fieldName, min = 1, max = Infinity } = options;
  const text = normalizeText(value);

  if (!text) {
    return { value: text, error: `${fieldName} é obrigatório.` };
  }

  if (text.length < min) {
    return {
      value: text,
      error: `${fieldName} deve ter no mínimo ${min} caracteres.`,
    };
  }

  if (text.length > max) {
    return {
      value: text,
      error: `${fieldName} não pode exceder ${max} caracteres.`,
    };
  }

  return { value: text, error: null };
}

export function validateOptionalText(value, options) {
  const { fieldName, max = Infinity } = options;
  const text = normalizeText(value);

  if (text && text.length > max) {
    return {
      value: text,
      error: `${fieldName} não pode exceder ${max} caracteres.`,
    };
  }

  return { value: text, error: null };
}

export function validateOptionalNonNegativeNumber(value, fieldName) {
  const rawValue = normalizeText(value);

  if (!rawValue) {
    return { value: null, error: null };
  }

  const number = Number(rawValue.replace(",", "."));

  if (!Number.isFinite(number)) {
    return { value: null, error: `${fieldName} deve ser um número válido.` };
  }

  if (number < 0) {
    return { value: null, error: `${fieldName} não pode ser negativo.` };
  }

  return { value: number, error: null };
}

export function validateIntegerInRange(value, options) {
  const { fieldName, min, max, defaultValue = null } = options;
  const rawValue = normalizeText(value);

  if (!rawValue && defaultValue !== null) {
    return { value: defaultValue, error: null };
  }

  const number = Number(rawValue);

  if (!Number.isInteger(number)) {
    return {
      value: defaultValue,
      error: `${fieldName} deve ser um número inteiro.`,
    };
  }

  if (number < min || number > max) {
    return {
      value: defaultValue,
      error: `${fieldName} deve ser entre ${min} e ${max}.`,
    };
  }

  return { value: number, error: null };
}

export function validateAllowedValue(value, options) {
  const { fieldName, allowedValues } = options;
  const normalizedValue = normalizeText(value);

  return {
    value: normalizedValue,
    error: allowedValues.includes(normalizedValue)
      ? null
      : `${fieldName} inválido.`,
  };
}

export function validateLoginInput({ email, password }) {
  const emailValidation = validateEmail(email);
  const passwordValidation = validatePassword(password);

  return {
    values: {
      email: emailValidation.value,
      password: passwordValidation.value,
    },
    error: getFirstValidationError(emailValidation, passwordValidation),
  };
}

export function validateSignupInput({ email, password, name }) {
  const emailValidation = validateEmail(email);
  const passwordValidation = validatePassword(password);
  const nameValidation = validateRequiredText(name, {
    fieldName: "O nome",
    min: VALIDATION_LIMITS.userNameMin,
    max: VALIDATION_LIMITS.userNameMax,
  });

  return {
    values: {
      email: emailValidation.value,
      password: passwordValidation.value,
      name: nameValidation.value,
    },
    error: getFirstValidationError(
      emailValidation,
      passwordValidation,
      nameValidation,
    ),
  };
}
