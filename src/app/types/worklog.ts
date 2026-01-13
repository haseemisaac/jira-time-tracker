export interface WorklogEntry {
  key: string;
  started: string;
  timeSpentSeconds: number;
  date: string;
  author: string;
}

export interface TicketInfo {
  key: string;
  summary: string;
}

export interface TicketSummary {
  ticket: string;
  title: string;
  totalHours: number;
}

export interface DailySummary {
  date: string;
  totalHours: number;
  cumulativeHours: number;
}

export interface TicketDailyBreakdown {
  date: string;
  hours: number;
}