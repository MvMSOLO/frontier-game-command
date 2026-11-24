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
  "Manage games & setup": "Управление играми и настройкой", "Sound": "Звук", "Haptics": "Вибрация",
  "English": "Английский", "Russian": "Русский", "Language": "Язык", "Game integration": "Интеграция игр", "Auto-detect selected games": "Автоопределение выбранных игр", "Launch selected game": "Запуск выбранной игры", "LAUNCH": "ЗАПУСК", "No games selected yet.": "Игры ещё не выбраны."
};

export function tr(language: FrontierLanguage, value: string): string {
  return language === "ru" ? (RU[value] ?? value) : value;
}

export function applyLanguage(language: FrontierLanguage) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = language;
  document.documentElement.dataset.frontierLanguage = language;
}
