import { cloneElement, createElement, Fragment, isValidElement, type ReactNode } from "react";

export type FrontierLanguage = "en" | "ru";

const RU: Record<string, string> = {
  "Home": "Главная", "Performance": "Производительность", "Tools": "Инструменты", "Voice Changer": "Изменение голоса", "Settings": "Настройки",
  "Lighting": "Подсветка", "Interface": "Интерфейс", "Animation intensity": "Интенсивность анимации", "Panel opacity": "Прозрачность панели",
  "Mini FPS when closed": "Мини-FPS в закрытом состоянии", "Sound & haptics": "Звук и вибрация", "Interface sounds": "Звуки интерфейса",
  "Master volume": "Общая громкость", "Haptic feedback": "Тактильная отдача", "Gestures & overlay": "Жесты и оверлей",
  "Edge swipe distance": "Дистанция свайпа от края", "Auto-hide": "Автоскрытие", "System setup": "Системная настройка",
  "Manage the games selected during initiation and review platform access.": "Управляйте выбранными играми и проверяйте системные разрешения.",
  "MANAGE GAMES & SETUP": "УПРАВЛЕНИЕ ИГРАМИ И НАСТРОЙКОЙ", "Performance preference": "Настройки производительности",
  "Launch profile": "Профиль запуска", "Never": "Никогда", "5s": "5 сек", "10s": "10 сек", "20s": "20 сек",
  "Engine profile": "Профиль движка", "Display": "Экран", "Refresh rate": "Частота обновления", "Frame pacing lock": "Ограничение кадров",
  "Thermal envelope": "Тепловой режим", "Tactical tools": "Тактические инструменты", "RAM Purge": "Очистка памяти",
  "Touch Boost": "Ускорение касания", "Ping Stabilizer": "Стабилизация пинга", "Pro Crosshair": "Прицел",
  "Zero-Distraction": "Без отвлечений", "Instant Replay": "Мгновенный повтор", "Screen Recorder": "Запись экрана",
  "Voice engine live": "Голосовой движок активен", "Engine offline": "Движок выключен", "Presets": "Пресеты",
  "Custom voice": "Настройка голоса", "Natural": "Естественный", "Robot": "Робот", "Titan": "Титан",
  "Spectre": "Призрак", "Comms": "Связь", "Xeno": "Ксеноморф", "Tone (dark ↔ bright)": "Тон (низкий ↔ высокий)",
  "Modulation": "Модуляция", "Echo": "Эхо", "Input gain": "Усиление входа", "Monitor in headphones": "Прослушивать в наушниках",
  "English": "Английский", "Russian": "Русский", "Language": "Язык",
  "Game integration": "Интеграция игр", "Auto-detect selected games": "Автоопределение выбранных игр",
  "Launch selected game": "Запуск выбранной игры", "LAUNCH": "ЗАПУСК", "No games selected yet.": "Игры ещё не выбраны.",
  "Device diagnostics": "Диагностика устройства", "Available RAM": "Доступная память", "Battery": "Батарея",
  "Thermal status": "Тепловой статус", "Low memory": "Мало памяти", "Zero-Distraction during a game": "Не беспокоить во время игры",
  "Performance Mode": "Режим производительности", "Quick Tools": "Быстрые инструменты", "Frame Time": "Время кадра",
  "Stability": "Стабильность", "Performance Optimized!": "Производительность оптимизирована!",
  "Enjoy smoother gameplay": "Играйте плавнее", "Purging…": "Очистка…", "Crosshair": "Прицел",
  "No Disturb": "Не беспокоить", "Frame pacing": "Синхронизация кадров",
  "Foreground game": "Игра на переднем плане", "No supported game detected": "Поддерживаемая игра не обнаружена",
  "Usage access required for detection": "Для обнаружения нужен доступ к статистике использования",
  "Notification access": "Доступ к уведомлениям", "Native device diagnostics are available in the Android overlay.": "Диагностика устройства доступна в Android-оверлее.",
  "YES": "ДА", "NO": "НЕТ", "NORMAL": "НОРМА", "LIGHT": "ЛЁГКИЙ", "MODERATE": "УМЕРЕННЫЙ",
  "SEVERE": "СЕРЬЁЗНЫЙ", "CRITICAL": "КРИТИЧЕСКИЙ", "EMERGENCY": "АВАРИЙНЫЙ", "UNSUPPORTED": "НЕ ПОДДЕРЖИВАЕТСЯ",
  "GRANTED": "РАЗРЕШЕНО", "DENIED": "ЗАПРЕЩЕНО", "UNKNOWN": "НЕИЗВЕСТНО",
  "Android capability status": "Статус возможностей Android", "Only controls with a verified Android implementation are enabled. Unsupported game-level tuning is not simulated.": "Включены только проверенные функции Android. Недоступная настройка игры не имитируется.",
  "Foreground game detector": "Определение активной игры", "Launch selected games": "Запуск выбранных игр",
  "Memory diagnostics": "Диагностика памяти", "Game FPS / GPU tuning": "Настройка FPS / GPU игры", "In-game voice routing": "Передача голоса в игру",
  "Screen recording / replay": "Запись экрана / повтор", "Crosshair over game": "Прицел поверх игры",
  "AVAILABLE": "ДОСТУПНО", "DIAGNOSTICS": "ДИАГНОСТИКА", "NATIVE DATA REQUIRED": "НУЖНЫ ДАННЫЕ ANDROID",
  "GAME FPS · NATIVE REQUIRED": "FPS ИГРЫ · НУЖЕН NATIVE API", "GAME FRAME TIME · UNAVAILABLE": "ВРЕМЯ КАДРА ИГРЫ · НЕДОСТУПНО",
  "GAME STABILITY · UNAVAILABLE": "СТАБИЛЬНОСТЬ ИГРЫ · НЕДОСТУПНО",
  "WELCOME": "ДОБРО ПОЖАЛОВАТЬ", "ACCESS": "ДОСТУП", "GAMES": "ИГРЫ", "REVIEW": "ПРОВЕРКА", "READY": "ГОТОВО",
  "Display over other apps": "Поверх других приложений", "Usage access": "Доступ к статистике использования",
  "NOT CHECKED": "НЕ ПРОВЕРЕНО", "NOT GRANTED": "НЕ РАЗРЕШЕНО",
  "RESTRICTED": "ОГРАНИЧЕНО", "NATIVE REQUIRED": "НУЖЕН NATIVE API",
  "All": "Все", "Battle Royale": "Королевская битва", "MOBA": "MOBA", "Sports": "Спорт",
  "Racing": "Гонки", "Sandbox": "Песочница", "Action": "Экшен", "Search your games...": "Поиск игр...",
  "No games selected yet. You can add games later in Settings.": "Игры пока не выбраны. Их можно добавить позже в настройках.",
  "CHECK": "ПРОВЕРИТЬ", "CONTINUE": "ПРОДОЛЖИТЬ", "BACK": "НАЗАД", "EDIT": "ИЗМЕНИТЬ",
  "ACTIVATE FRONTIER": "АКТИВИРОВАТЬ FRONTIER", "INITIALIZE SYSTEM": "ЗАПУСТИТЬ СИСТЕМУ",
  "ENTER FRONTIER": "ВОЙТИ В FRONTIER", "SELECTED": "ВЫБРАНО", "INSTALLED": "УСТАНОВЛЕНО", "Tactical tools": "Тактические инструменты", "SAVE LAST 30s": "СОХРАНИТЬ ПОСЛЕДНИЕ 30 СЕК", "Routing into in-game voice chat requires the Android native bridge.": "Для передачи голоса в игровой чат требуется нативный мост Android.", "Enable interface sounds and raise the volume to preview FRONTIER SFX.": "Включите звуки интерфейса и увеличьте громкость для прослушивания эффектов FRONTIER.", "01 / CORE SYSTEM": "01 / СИСТЕМА CORE", "02 / NEXUS INTELLIGENCE": "02 / ИНТЕЛЛЕКТ NEXUS", "ACTIVE PROFILE": "АКТИВНЫЙ ПРОФИЛЬ", "FRAME STABILITY": "СТАБИЛЬНОСТЬ КАДРОВ", "QUICK SYSTEM ACTIONS": "БЫСТРЫЕ СИСТЕМНЫЕ ДЕЙСТВИЯ", "Distraction Shield": "Защита от отвлечений", "Custom Crosshair": "Настраиваемый прицел", "NETWORK SNAPSHOT": "СЕТЕВОЙ СНИМОК", "SIMULATED PING": "СИМУЛИРУЕМЫЙ ПИНГ", "PACKET LOSS": "ПОТЕРЯ ПАКЕТОВ", "THERMAL GUARD": "ТЕПЛОВАЯ ЗАЩИТА", "Simulated device temperature": "Смоделированная температура устройства", "Adaptive thermal awareness": "Адаптивный контроль нагрева", "TOOL STATUS MATRIX": "МАТРИЦА СОСТОЯНИЯ ИНСТРУМЕНТОВ", "AUDIO SIGNAL": "АУДИОСИГНАЛ", "FRONTIER AUDIO ENGINE": "АУДИОДВИЖОК FRONTIER", "INTERFACE STATUS": "СОСТОЯНИЕ ИНТЕРФЕЙСА", "Motion profile": "Профиль анимации", "Haptics": "Тактильная отдача", "Sound": "Звук", "FRONTIER / TWIN-CORE": "FRONTIER / TWIN-CORE", "CORE + NEXUS · GAME FIRST": "CORE + NEXUS · ИГРА ПРЕЖДЕ ВСЕГО", "CHECKING LOCAL CONFIGURATION": "ПРОВЕРКА ЛОКАЛЬНОЙ КОНФИГУРАЦИИ", "SYSTEM INITIALIZATION / 01": "ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ / 01", "GAME SPACE & PERFORMANCE ENGINE": "ИГРОВОЕ ПРОСТРАНСТВО И ДВИЖОК ПРОИЗВОДИТЕЛЬНОСТИ", "INITIATION PROTOCOL": "ПРОТОКОЛ ИНИЦИАЛИЗАЦИИ", "V1.0": "ВЕРСИЯ 1.0", "YOUR GAME SPACE.": "ТВОЁ ИГРОВОЕ ПРОСТРАНСТВО.", "YOUR CONTROL.": "ТВОЙ КОНТРОЛЬ.", "CONNECT YOUR": "ПОДКЛЮЧИТЕ СВОИ", "CAPABILITIES.": "ВОЗМОЖНОСТИ.", "CHOOSE YOUR": "ВЫБЕРИТЕ СВОЮ", "ARENA.": "АРЕНУ.", "Select the games you want FRONTIER to organize. You can change this later in Settings.": "Выберите игры для FRONTIER. Позже выбор можно изменить в настройках.", "NO MATCHING GAMES FOUND": "ИГРЫ НЕ НАЙДЕНЫ", "VERIFY YOUR": "ПРОВЕРЬТЕ СВОЮ", "CONFIGURATION.": "КОНФИГУРАЦИЮ.", "Check the selections and device capabilities before activation.": "Проверьте выбор и возможности устройства перед запуском.", "No games selected yet. You can add games later in Settings.": "Игры пока не выбраны. Их можно добавить позже в настройках.", "INITIALIZATION COMPLETE / 05": "ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА / 05", "FRONTIER IS": "FRONTIER", "READY.": "ГОТОВ.", "GAME FIRST · SYSTEM AWARE": "ИГРА НА ПЕРВОМ МЕСТЕ · КОНТРОЛЬ СИСТЕМЫ", "SYS / INIT / 001": "СИСТЕМА / ИНИЦИАЛИЗАЦИЯ / 001", "SECURE SESSION": "ЗАЩИЩЁННЫЙ СЕАНС", "USAGE ACCESS REQUIRED": "ТРЕБУЕТСЯ ДОСТУП", "AVAILABLE FOR INSTALLED TITLES": "ДОСТУПНО ДЛЯ УСТАНОВЛЕННЫХ ИГР", "System memory / thermal": "Память / температура системы", "Notification filter": "Фильтр уведомлений", "OPT-IN · NOTIFICATION ACCESS": "ПО ВЫБОРУ · ДОСТУП К УВЕДОМЛЕНИЯМ", "NOT EXPOSED BY ANDROID": "ANDROID НЕ ПРЕДОСТАВЛЯЕТ API"
};

export function tr(language: FrontierLanguage, value: string): string {
  return language === "ru" ? (RU[value] ?? value) : value;
}

function translateNode(node: ReactNode, language: FrontierLanguage): ReactNode {
  if (typeof node === "string") return tr(language, node);
  if (Array.isArray(node)) return node.map((child) => translateNode(child, language));
  if (!isValidElement<Record<string, unknown>>(node)) return node;
  const props = { ...node.props };
  for (const key of ["label", "title", "placeholder", "aria-label", "alt", "description", "purpose", "name"]) {
    const value = props[key];
    if (typeof value === "string") props[key] = tr(language, value);
  }
  if (Array.isArray(props.options)) {
    props.options = props.options.map((option) => {
      if (!option || typeof option !== "object") return option;
      const next = { ...(option as Record<string, unknown>) };
      if (typeof next.l === "string") next.l = tr(language, next.l);
      if (typeof next.label === "string") next.label = tr(language, next.label);
      return next;
    });
  }
  if (props.item && typeof props.item === "object") {
    const item = { ...(props.item as Record<string, unknown>) };
    for (const key of ["title", "description", "purpose", "category"]) {
      if (typeof item[key] === "string") item[key] = tr(language, item[key] as string);
    }
    props.item = item;
  }
  if (props.game && typeof props.game === "object") {
    const game = { ...(props.game as Record<string, unknown>) };
    if (typeof game.category === "string") game.category = tr(language, game.category);
    props.game = game;
  }
  if ("children" in props) props.children = translateNode(props.children as ReactNode, language);
  return cloneElement(node, props);
}

export function LocalizedTree({ language, children }: { language: FrontierLanguage; children: ReactNode }) {
  return createElement(Fragment, null, translateNode(children, language));
}

export function applyLanguage(language: FrontierLanguage) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = language;
  document.documentElement.dataset.frontierLanguage = language;
}
