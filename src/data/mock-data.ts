export type Lesson = {
  id: number;
  day: number;
  time: string;
  student: string;
  subject: string;
  format: "Онлайн" | "Очно";
  color: "orange" | "purple" | "blue" | "green";
  paid?: boolean;
};

export const lessons: Lesson[] = [
  { id: 1, day: 3, time: "10:00", student: "Миша Соколов", subject: "Математика", format: "Онлайн", color: "orange", paid: true },
  { id: 2, day: 3, time: "16:30", student: "София Ким", subject: "Физика", format: "Очно", color: "purple", paid: true },
  { id: 3, day: 5, time: "14:00", student: "8 класс · мини-группа", subject: "Алгебра", format: "Онлайн", color: "blue" },
  { id: 4, day: 7, time: "11:30", student: "Лиза Волкова", subject: "Математика", format: "Онлайн", color: "green", paid: true },
  { id: 5, day: 10, time: "10:00", student: "Миша Соколов", subject: "Математика", format: "Онлайн", color: "orange", paid: true },
  { id: 6, day: 11, time: "18:00", student: "Олег Иванов", subject: "Физика", format: "Очно", color: "purple" },
  { id: 7, day: 12, time: "14:00", student: "8 класс · мини-группа", subject: "Алгебра", format: "Онлайн", color: "blue", paid: true },
  { id: 8, day: 13, time: "12:00", student: "Маша Лебедева", subject: "Геометрия", format: "Онлайн", color: "green", paid: true },
  { id: 9, day: 13, time: "16:30", student: "София Ким", subject: "Физика", format: "Очно", color: "purple" },
  { id: 10, day: 14, time: "11:30", student: "Лиза Волкова", subject: "Математика", format: "Онлайн", color: "green" },
  { id: 11, day: 17, time: "10:00", student: "Миша Соколов", subject: "Математика", format: "Онлайн", color: "orange" },
  { id: 12, day: 19, time: "14:00", student: "8 класс · мини-группа", subject: "Алгебра", format: "Онлайн", color: "blue" },
  { id: 13, day: 20, time: "12:00", student: "Маша Лебедева", subject: "Геометрия", format: "Онлайн", color: "green" },
  { id: 14, day: 24, time: "10:00", student: "Миша Соколов", subject: "Математика", format: "Онлайн", color: "orange" },
  { id: 15, day: 25, time: "18:00", student: "Олег Иванов", subject: "Физика", format: "Очно", color: "purple" },
  { id: 16, day: 26, time: "14:00", student: "8 класс · мини-группа", subject: "Алгебра", format: "Онлайн", color: "blue" },
  { id: 17, day: 28, time: "11:30", student: "Лиза Волкова", subject: "Математика", format: "Онлайн", color: "green" },
];

export const students = [
  { name: "Михаил Соколов", initials: "МС", subject: "Математика · 9 класс", phone: "+7 916 345-18-02", next: "17 авг, 10:00", balance: "4 800 ₽", color: "orange" as const, progress: 78 },
  { name: "София Ким", initials: "СК", subject: "Физика · 10 класс", phone: "+7 903 118-24-40", next: "13 авг, 16:30", balance: "2 400 ₽", color: "purple" as const, progress: 64 },
  { name: "Елизавета Волкова", initials: "ЕВ", subject: "Математика · 8 класс", phone: "+7 925 672-50-19", next: "14 авг, 11:30", balance: "3 600 ₽", color: "green" as const, progress: 86 },
  { name: "Олег Иванов", initials: "ОИ", subject: "Физика · 11 класс", phone: "+7 916 912-33-07", next: "25 авг, 18:00", balance: "—", color: "blue" as const, progress: 52 },
  { name: "Мария Лебедева", initials: "МЛ", subject: "Геометрия · 8 класс", phone: "+7 985 440-78-22", next: "20 авг, 12:00", balance: "2 800 ₽", color: "pink" as const, progress: 72 },
];

export const groups = [
  { name: "Алгебра · 8 класс", schedule: "Среда, 14:00", members: ["АН", "КР", "ВМ", "+2"], color: "blue", lessons: 8, price: "1 000 ₽" },
  { name: "ОГЭ по математике", schedule: "Вт, Чт · 17:00", members: ["МС", "ЕВ", "ПА", "+3"], color: "orange", lessons: 12, price: "1 200 ₽" },
  { name: "Физика без страха", schedule: "Суббота, 12:30", members: ["СК", "ОИ", "ТН"], color: "purple", lessons: 5, price: "1 100 ₽" },
];

export const transactions = [
  { date: "12 августа", student: "Михаил Соколов", purpose: "Абонемент · 4 урока", amount: "+4 800 ₽", status: "Оплачено" },
  { date: "11 августа", student: "София Ким", purpose: "Занятие по физике", amount: "+1 200 ₽", status: "Оплачено" },
  { date: "9 августа", student: "Алгебра · 8 класс", purpose: "Групповое занятие", amount: "+5 000 ₽", status: "Оплачено" },
  { date: "7 августа", student: "Сервисы", purpose: "Zoom и онлайн-доска", amount: "−1 890 ₽", status: "Расход" },
  { date: "5 августа", student: "Елизавета Волкова", purpose: "Абонемент · 4 урока", amount: "+3 600 ₽", status: "Оплачено" },
];
