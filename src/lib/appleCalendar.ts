import { Capacitor } from "@capacitor/core";
import { CapacitorCalendar } from "@ebarooni/capacitor-calendar";

const isNative = () => Capacitor.isNativePlatform();

export interface AppleEvent {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  location?: string;
  description?: string;
  color?: string;
}

export async function requestCalendarAccess(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { result } = await CapacitorCalendar.requestFullCalendarAccess();
    return result === "granted";
  } catch {
    return false;
  }
}

export async function checkCalendarAccess(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { result } = await CapacitorCalendar.checkPermission({
      scope: "readCalendar" as any,
    });
    return result === "granted";
  } catch {
    return false;
  }
}

export async function fetchAppleEvents(start: Date, end: Date): Promise<AppleEvent[]> {
  if (!isNative()) return [];
  try {
    const { result } = await CapacitorCalendar.listEventsInRange({
      startDate: start.getTime(),
      endDate: end.getTime(),
    });
    return result.map((e) => ({
      id: e.id,
      title: e.title,
      startDate: new Date(e.startDate),
      endDate: new Date(e.endDate),
      isAllDay: e.isAllDay,
      location: e.location ?? undefined,
      description: e.description ?? undefined,
      color: e.color ?? undefined,
    }));
  } catch {
    return [];
  }
}

export async function createAppleEvent(event: {
  title: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  location?: string;
}): Promise<string | null> {
  if (!isNative()) return null;
  try {
    const { id } = await CapacitorCalendar.createEvent({
      title: event.title,
      startDate: event.startDate.getTime(),
      endDate: event.endDate.getTime(),
      isAllDay: event.allDay,
      location: event.location,
    });
    return id;
  } catch {
    return null;
  }
}

export async function updateAppleEvent(
  appleId: string,
  event: {
    title: string;
    startDate: Date;
    endDate: Date;
    allDay: boolean;
    location?: string;
  }
): Promise<void> {
  if (!isNative()) return;
  try {
    await CapacitorCalendar.modifyEvent({
      id: appleId,
      title: event.title,
      startDate: event.startDate.getTime(),
      endDate: event.endDate.getTime(),
      isAllDay: event.allDay,
      location: event.location,
    });
  } catch {
    // silently fail — local event still exists
  }
}

export async function deleteAppleEvent(appleId: string): Promise<void> {
  if (!isNative()) return;
  try {
    await CapacitorCalendar.deleteEvent({ id: appleId });
  } catch {
    // silently fail
  }
}
