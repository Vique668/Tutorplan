import type { GroupDraft } from "./group-types";

export const emptyGroupDraft: GroupDraft = {
  name: "",
  subject: null,
  studentIds: [],
  lessonPrice: 1000,
  lessonDuration: 60,
  notes: "",
};
