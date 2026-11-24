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
  "No Disturb": "Не беспокоить", "Frame pacing": "Синхронизация кадров", "Foreground game": "Игра на переднем плане", "No supported game detected": "Поддерживаемая игра не обнаружена", "Usage access required for detection": "Для обнаружения нужен доступ к статистике использования", "Notification access": "Доступ к уведомлениям", "Native device diagnostics are available in the Android overlay.": "Диагностика устройства доступна в Android-оверлее.", "YES": "ДА", "NO": "НЕТ", "NORMAL": "НОРМА", "LIGHT": "ЛЁГКИЙ", "MODERATE": "УМЕРЕННЫЙ", "SEVERE": "СЕРЬЁЗНЫЙ", "CRITICAL": "КРИТИЧЕСКИЙ", "EMERGENCY": "АВАРИЙНЫЙ", "UNSUPPORTED": "НЕ ПОДДЕРЖИВАЕТСЯ", "GRANTED": "РАЗРЕШЕНО", "DENIED": "ЗАПРЕЩЕНО", "UNKNOWN": "НЕИЗВЕСТНО"
};

export function tr(language: FrontierLanguage, value: string): string {
  return language === "ru" ? (RU[value] ?? value) : value;
}

export function applyLanguage(language: FrontierLanguage) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = language;
  document.documentElement.dataset.frontierLanguage = language;
}
