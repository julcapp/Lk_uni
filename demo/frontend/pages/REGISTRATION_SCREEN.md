# Lk_uni Demo Frontend — Registration Screen v0.1

## Purpose

Registration screen for Lk_uni Demo. The screen demonstrates creation of a new Identity.

## User Flow

Welcome → Registration → Consent → Verification Provider → Identity Created

## Fields

### Name

Required field.

Rules:
- Cyrillic characters
- digits allowed
- hyphen allowed

Tooltip:

> Введите имя для обращения в сервисе.

---

### Email

Required field.

Rules:
- Latin characters
- must contain @ symbol
- validate domain format

Example:

`example@mail.ru`

Tooltip:

> Используйте латинские символы. Пример: example@mail.ru

---

### Phone

Used as an additional verification channel.

---

### Consent

Demo mode:
- checkbox may be enabled by default for demonstration.

Production mode:
- user must actively confirm consent.

Options:

- Terms of Use
- Personal Data Processing

## Validation Principles

User receives understandable actions, not technical errors.

Example:

Incorrect:

`REG_EMAIL_INVALID`

Correct:

`Введите корректный email. Проверьте наличие символа @.`

## Next Step

After successful registration user proceeds to Verification Provider selection.
