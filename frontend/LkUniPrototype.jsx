import React, { useMemo, useState } from 'react';
import './LkUniPrototype.css';

const SCREENS = {
  LOGIN: 'LOGIN',
  REGISTER: 'REGISTER',
  VERIFY: 'VERIFY',
  MAX: 'MAX',
  RECOVERY_START: 'RECOVERY_START',
  RECOVERY_OPTIONS: 'RECOVERY_OPTIONS',
  PROFILE: 'PROFILE',
  ADMIN: 'ADMIN',
};

const providers = [
  { id: 'email', label: 'Email', description: 'Код на почту', status: 'enabled' },
  { id: 'phone', label: 'Телефон', description: 'Код или звонок', status: 'enabled' },
  { id: 'max', label: 'MAX', description: 'Подтверждение через бота', status: 'enabled' },
  { id: 'telegram', label: 'Telegram', description: 'Вход через Telegram', status: 'enabled' },
  { id: 'vk', label: 'VK ID', description: 'OAuth / VK ID', status: 'enabled' },
  { id: 'sberid', label: 'SberID', description: 'OIDC-провайдер', status: 'disabled' },
];

const linkedIdentities = [
  { provider: 'Телефон', value: '+7 *** *** 12 34', verified: true },
  { provider: 'Email', value: 'i***@mail.ru', verified: true },
  { provider: 'MAX', value: 'Аккаунт привязан', verified: true },
  { provider: 'Telegram', value: 'Не привязан', verified: false },
];

function ProviderIcon({ children }) {
  return <span className="lk-provider-icon">{children}</span>;
}

function Header({ screen, setScreen }) {
  const items = [
    { id: SCREENS.LOGIN, label: 'Вход' },
    { id: SCREENS.REGISTER, label: 'Регистрация' },
    { id: SCREENS.RECOVERY_START, label: 'Восстановление' },
    { id: SCREENS.PROFILE, label: 'Профиль' },
    { id: SCREENS.ADMIN, label: 'Админ' },
  ];

  return (
    <header className="lk-header">
      <div className="lk-brand">
        <div className="lk-logo">LK</div>
        <div>
          <strong>Lk_uni</strong>
          <span>Identity Platform</span>
        </div>
      </div>
      <nav className="lk-nav" aria-label="Навигация прототипа">
        {items.map((item) => (
          <button
            key={item.id}
            className={screen === item.id ? 'is-active' : ''}
            type="button"
            onClick={() => setScreen(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

function AuthShell({ eyebrow, title, subtitle, children, side }) {
  return (
    <main className="lk-shell">
      <section className="lk-card lk-auth-card">
        <div className="lk-eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p className="lk-subtitle">{subtitle}</p>
        {children}
      </section>
      <aside className="lk-side-panel">
        {side || (
          <>
            <div className="lk-side-badge">project-aware</div>
            <h2>Один кабинет для разных проектов</h2>
            <p>
              Каналы входа, подтверждения и восстановления включаются настройками проекта:
              email, телефон, MAX, Telegram, VK ID, SberID.
            </p>
            <div className="lk-mini-list">
              <span>PostgreSQL</span>
              <span>JWT + refresh</span>
              <span>Audit log</span>
              <span>Recovery</span>
            </div>
          </>
        )}
      </aside>
    </main>
  );
}

function ProviderButtons({ onMax }) {
  return (
    <div className="lk-provider-grid">
      <button type="button"><ProviderIcon>@</ProviderIcon>Email</button>
      <button type="button"><ProviderIcon>+7</ProviderIcon>Телефон</button>
      <button type="button" onClick={onMax}><ProviderIcon>M</ProviderIcon>MAX</button>
      <button type="button"><ProviderIcon>T</ProviderIcon>Telegram</button>
      <button type="button"><ProviderIcon>VK</ProviderIcon>VK ID</button>
      <button type="button"><ProviderIcon>S</ProviderIcon>SberID</button>
    </div>
  );
}

function LoginScreen({ setScreen }) {
  return (
    <AuthShell
      eyebrow="Вход в сервис"
      title="Добро пожаловать"
      subtitle="Войдите любым подключённым способом. Логин не обязателен — система найдёт пользователя через подтверждённую identity."
    >
      <label className="lk-label">Email, телефон или идентификатор</label>
      <input className="lk-input" placeholder="ivan@example.ru или +7 900 000-00-00" />
      <button className="lk-primary" type="button">Продолжить</button>
      <div className="lk-divider"><span>или войти через</span></div>
      <ProviderButtons onMax={() => setScreen(SCREENS.MAX)} />
      <div className="lk-links-row">
        <button type="button" onClick={() => setScreen(SCREENS.RECOVERY_START)}>Не удаётся войти?</button>
        <button type="button" onClick={() => setScreen(SCREENS.REGISTER)}>Создать аккаунт</button>
      </div>
    </AuthShell>
  );
}

function RegisterScreen({ setScreen }) {
  return (
    <AuthShell
      eyebrow="Регистрация"
      title="Создание аккаунта"
      subtitle="Сначала создаём профиль, затем подтверждаем пользователя одним из разрешённых каналов проекта."
    >
      <div className="lk-two-fields">
        <div>
          <label className="lk-label">Имя</label>
          <input className="lk-input" placeholder="Иван" />
        </div>
        <div>
          <label className="lk-label">Проект</label>
          <input className="lk-input" value="utimoshi" readOnly />
        </div>
      </div>
      <label className="lk-label">Email</label>
      <input className="lk-input" placeholder="ivan@example.ru" />
      <label className="lk-label">Телефон</label>
      <input className="lk-input" placeholder="+7 900 000-00-00" />
      <label className="lk-check">
        <input type="checkbox" defaultChecked />
        <span>Согласен на обработку персональных данных</span>
      </label>
      <button className="lk-primary" type="button" onClick={() => setScreen(SCREENS.VERIFY)}>
        Зарегистрироваться
      </button>
    </AuthShell>
  );
}

function VerifyScreen({ setScreen }) {
  return (
    <AuthShell
      eyebrow="Подтверждение"
      title="Выберите способ подтверждения"
      subtitle="Для этого проекта достаточно одного канала из списка: email, телефон или MAX."
      side={
        <>
          <div className="lk-side-badge">mode: one_of</div>
          <h2>Настройка проекта</h2>
          <pre className="lk-code">{`required_verification:\n  mode: one_of\n  channels:\n    - email\n    - phone\n    - max`}</pre>
        </>
      }
    >
      <div className="lk-method-list">
        <button type="button">
          <strong>Email</strong>
          <span>Отправим 6-значный код на i***@mail.ru</span>
        </button>
        <button type="button">
          <strong>Телефон</strong>
          <span>Подтверждение звонком или кодом</span>
        </button>
        <button type="button" onClick={() => setScreen(SCREENS.MAX)}>
          <strong>MAX</strong>
          <span>Открыть MAX-бота и подтвердить регистрацию</span>
        </button>
      </div>
    </AuthShell>
  );
}

function MaxScreen({ setScreen }) {
  return (
    <AuthShell
      eyebrow="MAX"
      title="Подтверждение через MAX"
      subtitle="Откройте MAX-бота по защищённой ссылке. После подтверждения webhook активирует аккаунт или создаст сессию."
      side={
        <>
          <div className="lk-phone-mock">
            <div className="lk-phone-top" />
            <div className="lk-chat-bubble is-bot">Подтвердите вход в Lk_uni?</div>
            <div className="lk-chat-bubble is-user">Подтверждаю</div>
          </div>
        </>
      }
    >
      <div className="lk-max-box">
        <div className="lk-qr-placeholder">MAX</div>
        <div>
          <strong>Ссылка действует 10 минут</strong>
          <p>challenge_id: 8f2a...c19<br />purpose: registration / login / recovery</p>
        </div>
      </div>
      <button className="lk-primary" type="button">Открыть MAX</button>
      <button className="lk-secondary" type="button" onClick={() => setScreen(SCREENS.VERIFY)}>
        Выбрать другой способ
      </button>
    </AuthShell>
  );
}

function RecoveryStartScreen({ setScreen }) {
  return (
    <AuthShell
      eyebrow="Восстановление доступа"
      title="Не удаётся войти?"
      subtitle="Введите любой известный идентификатор. Мы не раскрываем наличие аккаунта и покажем только безопасные варианты восстановления."
    >
      <label className="lk-label">Email, телефон, MAX, Telegram или VK ID</label>
      <input className="lk-input" placeholder="ivan@example.ru или +7 900 000-00-00" />
      <button className="lk-primary" type="button" onClick={() => setScreen(SCREENS.RECOVERY_OPTIONS)}>
        Найти способы восстановления
      </button>
      <p className="lk-safe-note">Если аккаунт найден, будут доступны способы восстановления.</p>
    </AuthShell>
  );
}

function RecoveryOptionsScreen({ setScreen }) {
  return (
    <AuthShell
      eyebrow="Восстановление доступа"
      title="Выберите подтверждённый канал"
      subtitle="Данные маскируются. Восстановление возможно только через ранее подтверждённую identity."
    >
      <div className="lk-method-list">
        <button type="button"><strong>Email</strong><span>i***@mail.ru</span></button>
        <button type="button"><strong>Телефон</strong><span>+7 *** *** 12 34</span></button>
        <button type="button" onClick={() => setScreen(SCREENS.MAX)}><strong>MAX</strong><span>Аккаунт MAX привязан</span></button>
        <button type="button"><strong>Telegram</strong><span>Аккаунт Telegram привязан</span></button>
      </div>
    </AuthShell>
  );
}

function ProfileScreen({ setScreen }) {
  return (
    <main className="lk-dashboard">
      <section className="lk-card lk-profile-main">
        <div className="lk-profile-head">
          <div className="lk-avatar">И</div>
          <div>
            <div className="lk-eyebrow">Профиль пользователя</div>
            <h1>Иван Иванов</h1>
            <p>status: active · project: utimoshi</p>
          </div>
        </div>
        <h2>Связанные способы входа</h2>
        <div className="lk-identity-list">
          {linkedIdentities.map((item) => (
            <div className="lk-identity" key={item.provider}>
              <div>
                <strong>{item.provider}</strong>
                <span>{item.value}</span>
              </div>
              <em className={item.verified ? 'is-ok' : 'is-muted'}>{item.verified ? 'verified' : 'not linked'}</em>
            </div>
          ))}
        </div>
      </section>
      <aside className="lk-card lk-profile-side">
        <h2>Безопасность</h2>
        <button className="lk-secondary" type="button" onClick={() => setScreen(SCREENS.MAX)}>Привязать MAX</button>
        <button className="lk-secondary" type="button">Активные сессии</button>
        <button className="lk-secondary" type="button">Журнал входов</button>
      </aside>
    </main>
  );
}

function AdminScreen() {
  const enabledCount = useMemo(() => providers.filter((p) => p.status === 'enabled').length, []);

  return (
    <main className="lk-dashboard">
      <section className="lk-card lk-admin-main">
        <div className="lk-eyebrow">Администрирование проекта</div>
        <h1>Настройки авторизации</h1>
        <p className="lk-subtitle">Проект сам определяет, какие каналы регистрации, входа и восстановления доступны пользователю.</p>
        <div className="lk-admin-grid">
          {providers.map((provider) => (
            <div className="lk-provider-setting" key={provider.id}>
              <div>
                <strong>{provider.label}</strong>
                <span>{provider.description}</span>
              </div>
              <label className="lk-switch">
                <input type="checkbox" defaultChecked={provider.status === 'enabled'} />
                <span />
              </label>
            </div>
          ))}
        </div>
      </section>
      <aside className="lk-card lk-profile-side">
        <h2>Policy</h2>
        <p>{enabledCount} каналов включено</p>
        <pre className="lk-code">{`mode: one_of\nchannels:\n  - email\n  - phone\n  - max`}</pre>
        <button className="lk-primary" type="button">Сохранить настройки</button>
      </aside>
    </main>
  );
}

export default function LkUniPrototype() {
  const [screen, setScreen] = useState(SCREENS.LOGIN);

  return (
    <div className="lk-page">
      <Header screen={screen} setScreen={setScreen} />
      {screen === SCREENS.LOGIN && <LoginScreen setScreen={setScreen} />}
      {screen === SCREENS.REGISTER && <RegisterScreen setScreen={setScreen} />}
      {screen === SCREENS.VERIFY && <VerifyScreen setScreen={setScreen} />}
      {screen === SCREENS.MAX && <MaxScreen setScreen={setScreen} />}
      {screen === SCREENS.RECOVERY_START && <RecoveryStartScreen setScreen={setScreen} />}
      {screen === SCREENS.RECOVERY_OPTIONS && <RecoveryOptionsScreen setScreen={setScreen} />}
      {screen === SCREENS.PROFILE && <ProfileScreen setScreen={setScreen} />}
      {screen === SCREENS.ADMIN && <AdminScreen />}
    </div>
  );
}
