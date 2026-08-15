import type { StudentDraft } from "./student-types";

export const emptyStudentDraft: StudentDraft = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  address: "",
  parentFirstName: null,
  parentLastName: null,
  parentPhone: null,
  parentEmail: null,
  lessonPrice: 1400,
  lessonDuration: 60,
  notes: "",
};
