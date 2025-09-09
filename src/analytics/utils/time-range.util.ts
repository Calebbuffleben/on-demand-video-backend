import { EventsTimeRangeDto, ParsedDateRange } from '../dto/events-time-range.dto';

function zonedTimeToUtcLocal(date: Date, timeZone: string): Date {
  // Convert a Date interpreted in a specific IANA timezone to its UTC equivalent
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour');
  const minute = get('minute');
  const second = get('second');
  // Construct an ISO string as if the above values are in the target timezone, then treat it as UTC
  const asUTC = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
  // Calculate the offset between local and "target tz expressed in UTC" to get true UTC time
  const offsetMs = asUTC.getTime() - date.getTime();
  return new Date(date.getTime() - offsetMs);
}

function parseDateLike(input?: string): Date | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  // If only date is provided (YYYY-MM-DD), return Date without time component
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    // Use local midnight; will be converted with timezone
    return new Date(`${trimmed}T00:00:00`);
  }
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function toUtcDateRange(dto?: Partial<EventsTimeRangeDto>): ParsedDateRange {
  if (!dto) return {};

  const timezone = dto.timezone || 'UTC';
  const startBase = parseDateLike(dto.startDate);
  const endBase = parseDateLike(dto.endDate);

  let start: Date | undefined;
  let end: Date | undefined;

  if (startBase) {
    // Interpret provided start in timezone and convert to UTC
    start = zonedTimeToUtcLocal(startBase, timezone);
  }
  if (endBase) {
    // If only date without time, include entire day by setting to 23:59:59.999 in tz
    const endIsDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dto.endDate || '');
    const endLocal = new Date(endBase);
    if (endIsDateOnly) {
      endLocal.setHours(23, 59, 59, 999);
    }
    end = zonedTimeToUtcLocal(endLocal, timezone);
  }

  return { start, end };
}

export function buildCreatedAtFilter(range?: ParsedDateRange) {
  if (!range?.start && !range?.end) return undefined;
  const filter: { gte?: Date; lte?: Date } = {};
  if (range.start) filter.gte = range.start;
  if (range.end) filter.lte = range.end;
  return filter;
}

