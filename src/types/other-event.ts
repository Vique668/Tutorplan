export type OtherEvent = {
  id: string;
  tutorId: string;
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  notes: string | null;
  createdAt: string;
};

export type CreateOtherEventInput = Omit<OtherEvent, "id" | "tutorId" | "createdAt">;
