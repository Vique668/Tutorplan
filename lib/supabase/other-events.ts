import type { CreateOtherEventInput, OtherEvent } from "../../src/types/other-event";
import { createClient } from "./client";
import { CURRENT_TUTOR_ID } from "./students";

const otherEventColumns = "id,tutor_id,title,event_date,start_time,end_time,notes,created_at" as const;

type OtherEventRow = {
  id: string;
  tutor_id: string;
  title: string;
  event_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  created_at: string;
};

export async function getOtherEvents(): Promise<OtherEvent[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("other_events")
    .select(otherEventColumns)
    .eq("tutor_id", CURRENT_TUTOR_ID)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) throw error;
  return (data as OtherEventRow[]).map(toOtherEvent);
}

export async function createOtherEvent(input: CreateOtherEventInput): Promise<OtherEvent> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("other_events")
    .insert({
      tutor_id: CURRENT_TUTOR_ID,
      title: input.title.trim(),
      event_date: input.eventDate,
      start_time: input.startTime,
      end_time: input.endTime,
      notes: emptyToNull(input.notes),
    })
    .select(otherEventColumns)
    .single();

  if (error) throw error;
  return toOtherEvent(data as OtherEventRow);
}

export async function updateOtherEvent(eventId: string, input: CreateOtherEventInput): Promise<OtherEvent> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("other_events")
    .update({
      title: input.title.trim(),
      event_date: input.eventDate,
      start_time: input.startTime,
      end_time: input.endTime,
      notes: emptyToNull(input.notes),
    })
    .eq("id", eventId)
    .eq("tutor_id", CURRENT_TUTOR_ID)
    .select(otherEventColumns)
    .single();

  if (error) throw error;
  return toOtherEvent(data as OtherEventRow);
}

export async function deleteOtherEvent(eventId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("other_events")
    .delete()
    .eq("id", eventId)
    .eq("tutor_id", CURRENT_TUTOR_ID);

  if (error) throw error;
}

function toOtherEvent(row: OtherEventRow): OtherEvent {
  return {
    id: row.id,
    tutorId: row.tutor_id,
    title: row.title,
    eventDate: row.event_date,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function emptyToNull(value?: string | null): string | null {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}
