import type { GroupDraft, StudentGroup } from "./group-types";

export const initialGroups: StudentGroup[] = [
  {
    id: "group-1",
    name: "Round Up",
    studentIds: ["student-1", "student-3", "student-4"],
    lessonPrice: 1000,
    lessonDuration: 90,
    notes: "Разговорная практика и закрепление школьной программы.",
    status: "active",
    upcomingLessons: [
      { id: "round-up-1", date: "18 августа", time: "18:00–19:30" },
      { id: "round-up-2", date: "25 августа", time: "18:00–19:30" },
    ],
  },
  {
    id: "group-2",
    name: "Алгебра · 8 класс",
    studentIds: ["student-2", "student-3"],
    lessonPrice: 900,
    lessonDuration: 60,
    notes: "Мини-группа по алгебре. Встречаемся по средам.",
    status: "active",
    upcomingLessons: [{ id: "algebra-1", date: "19 августа", time: "14:00–15:00" }],
  },
  {
    id: "group-3",
    name: "Физика без страха",
    studentIds: ["student-2", "student-4"],
    lessonPrice: 1100,
    lessonDuration: 90,
    notes: "Подготовка к контрольным и разбор лабораторных работ.",
    status: "archived",
    upcomingLessons: [],
  },
];

export const emptyGroupDraft: GroupDraft = {
  name: "",
  studentIds: [],
  lessonPrice: 1000,
  lessonDuration: 60,
  notes: "",
};
