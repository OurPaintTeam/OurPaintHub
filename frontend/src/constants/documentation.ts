export const DOCUMENTATION_CATEGORIES = [
  "Примитивы",
  "Требования",
  "Горячие клавиши",
  "Работа по сети",
  "Сохранение",
  "Консольные команды",
] as const;

export type DocumentationCategory = typeof DOCUMENTATION_CATEGORIES[number];

