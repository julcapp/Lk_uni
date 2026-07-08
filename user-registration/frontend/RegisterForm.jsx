import React, { useState } from 'react';
import './RegisterForm.css';

/**
 * Типовая форма регистрации личного кабинета.
 * Шаги: телефон -> звонок-подтверждение -> email (зона .ru/.su/.рф) -> код с почты -> готово.
 * Плюс блок "или войти через" с расширяемым списком провайдеров (VK/MAX/Telegram/SberID).
 *
 * Настраивается через проп apiBase — базовый URL бэкенда (/api/auth по умолчанию).
 */

const STEPS = {
  PHONE_INPUT: 'PHONE_INPUT',
  PHONE_CONFIRM: 'PHONE_CONFIRM',
  PHONE_CODE: 'PHONE_CODE',
  EMAIL_INPUT: 'EMAIL_INPUT',
  EMAIL_CODE: 'EMAIL_CODE',
  DONE: 'DONE',
};

// Список провайдеров для кнопок "войти через". Значок и подпись —
// единственное, что нужно добавить при подключении нового сервиса.
const OAUTH_PROVIDERS = [
  { id: 'vk', label: 'VK' },
  { id: 'max', label: 'MAX' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'sberid', label: 'СберID' },
];

export default function RegisterForm({ apiBase = '/api/auth' }) {
  const [step, setStep] = useState(STEPS.PHONE_INPUT);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [possibleCallers, setPossibleCallers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function api(path, body) {
    const resp = await fetch(`${apiBase}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await resp.json();
    if (!resp.ok || data.ok === false) {
      throw new Error(data.error || 'Произошла ошибка');
    }
    return data;
  }

  function handlePhoneSubmit(e) {
    e.preventDefault();
    setError('');
    if (!/^[\d+\s()-]{10,20}$/.test(phone)) {
      setError('Проверьте номер телефона');
      return;
    }
    setStep(STEPS.PHONE_CONFIRM);
  }

  async function confirmPhoneAndCall() {
    setLoading(true);
    setError('');
    try {
      const data = await api('/phone/request-call', { phone });
      setPossibleCallers(data.possibleCallerNumbers || []);
      setStep(STEPS.PHONE_CODE);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePhoneCodeSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api('/phone/verify-call', { phone, code: phoneCode });
      setStep(STEPS.EMAIL_INPUT);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api('/email/request-code', { email });
      setStep(STEPS.EMAIL_CODE);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailCodeSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api('/email/verify-code', { phone, email, code: emailCode });
      setStep(STEPS.DONE);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function startOAuth(providerId) {
    window.location.href = `${apiBase}/${providerId}/redirect`;
  }

  return (
    <div className="reg-card">
      <div className="reg-progress">
        {['Телефон', 'Почта', 'Готово'].map((label, i) => {
          const idx = step === STEPS.PHONE_INPUT || step === STEPS.PHONE_CONFIRM || step === STEPS.PHONE_CODE
            ? 0
            : step === STEPS.EMAIL_INPUT || step === STEPS.EMAIL_CODE
            ? 1
            : 2;
          return (
            <div key={label} className={`reg-progress__step ${i <= idx ? 'is-active' : ''}`}>
              <span className="reg-progress__dot" />
              <span className="reg-progress__label">{label}</span>
            </div>
          );
        })}
      </div>

      {error && <div className="reg-error">{error}</div>}

      {step === STEPS.PHONE_INPUT && (
        <form onSubmit={handlePhoneSubmit} className="reg-form">
          <h2 className="reg-title">Регистрация</h2>
          <label className="reg-label" htmlFor="phone">Номер телефона</label>
          <input
            id="phone"
            className="reg-input"
            type="tel"
            placeholder="+7 900 000-00-00"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoFocus
          />
          <button className="reg-button" type="submit">Продолжить</button>
        </form>
      )}

      {step === STEPS.PHONE_CONFIRM && (
        <div className="reg-form">
          <h2 className="reg-title">Проверьте номер</h2>
          <p className="reg-text">Всё верно?</p>
          <div className="reg-phone-display">{phone}</div>
          <div className="reg-row">
            <button className="reg-button reg-button--ghost" onClick={() => setStep(STEPS.PHONE_INPUT)}>
              Исправить
            </button>
            <button className="reg-button" onClick={confirmPhoneAndCall} disabled={loading}>
              {loading ? 'Звоним…' : 'Да, верно — позвонить'}
            </button>
          </div>
        </div>
      )}

      {step === STEPS.PHONE_CODE && (
        <form onSubmit={handlePhoneCodeSubmit} className="reg-form">
          <h2 className="reg-title">Ожидайте звонок</h2>
          <p className="reg-text">
            Отвечать не нужно. Посмотрите номер входящего вызова и введите его
            последние 6 цифр ниже.
          </p>
          {possibleCallers.length > 0 && (
            <p className="reg-hint">
              Звонок поступит с одного из номеров: {possibleCallers.join(', ')}
            </p>
          )}
          <label className="reg-label" htmlFor="phoneCode">Последние 6 цифр номера звонка</label>
          <input
            id="phoneCode"
            className="reg-input reg-input--code"
            inputMode="numeric"
            maxLength={6}
            value={phoneCode}
            onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />
          <button className="reg-button" type="submit" disabled={loading}>
            {loading ? 'Проверяем…' : 'Подтвердить'}
          </button>
        </form>
      )}

      {step === STEPS.EMAIL_INPUT && (
        <form onSubmit={handleEmailSubmit} className="reg-form">
          <h2 className="reg-title">Рабочая почта</h2>
          <p className="reg-text">Укажите почту в российской зоне (.ru, .su или .рф)</p>
          <label className="reg-label" htmlFor="email">Email</label>
          <input
            id="email"
            className="reg-input"
            type="email"
            placeholder="ivanov@example.ru"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
          <button className="reg-button" type="submit" disabled={loading}>
            {loading ? 'Отправляем…' : 'Отправить код'}
          </button>
        </form>
      )}

      {step === STEPS.EMAIL_CODE && (
        <form onSubmit={handleEmailCodeSubmit} className="reg-form">
          <h2 className="reg-title">Код из письма</h2>
          <p className="reg-text">Мы отправили код на {email}</p>
          <label className="reg-label" htmlFor="emailCode">Код подтверждения</label>
          <input
            id="emailCode"
            className="reg-input reg-input--code"
            inputMode="numeric"
            maxLength={6}
            value={emailCode}
            onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />
          <button className="reg-button" type="submit" disabled={loading}>
            {loading ? 'Проверяем…' : 'Завершить регистрацию'}
          </button>
        </form>
      )}

      {step === STEPS.DONE && (
        <div className="reg-form reg-done">
          <h2 className="reg-title">Готово</h2>
          <p className="reg-text">Регистрация завершена, аккаунт активен.</p>
        </div>
      )}

      {step !== STEPS.DONE && (
        <div className="reg-oauth">
          <div className="reg-oauth__divider"><span>или войти через</span></div>
          <div className="reg-oauth__row">
            {OAUTH_PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="reg-oauth__button"
                onClick={() => startOAuth(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
