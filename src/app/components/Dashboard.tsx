/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Clock, Ticket, TrendingUp, RefreshCw, BarChart3, CalendarDays, CalendarCheck, X } from 'lucide-react';
import { format, parseISO, subDays, eachDayOfInterval, isWeekend, getDay } from 'date-fns';
import { WorklogEntry, TicketSummary, DailySummary, TicketDailyBreakdown, TicketInfo } from '../types/worklog';
import { useUserStore } from '../store/userStore';
import UsernameInput from './UsernameInput';

type TabType = 'daily' | 'tickets' | 'ticket-detail' | 'day-detail';
type DateRangeType = 7 | 14 | 30 | 60 | 90;

interface Tab {
  id: string;
  type: TabType;
  label: string;
  data?: string; // ticket ID or date
}

// Custom tooltip component for daily view
const CustomDailyTooltip = ({ active, payload, label, worklogs, ticketInfo }: any) => {
  if (active && payload && payload.length) {
    const date = label;
    const dayLogs = worklogs.filter((log: WorklogEntry) => log.date === date);

    // Group by ticket
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ticketHours = dayLogs.reduce((acc: any, log: WorklogEntry) => {
      if (!acc[log.key]) {
        acc[log.key] = 0;
      }
      acc[log.key] += log.timeSpentSeconds / 3600;
      return acc;
    }, {});

    return (
      <div className="bg-white p-3 border border-gray-200 rounded shadow-lg max-w-sm">
        <p className="font-semibold text-gray-900 mb-2">
          {format(parseISO(date), 'EEEE, MMM dd')}
        </p>
        <p className="text-sm font-medium text-gray-700 mb-1">
          Total: {payload[0].value} hours
        </p>
        {Object.keys(ticketHours).length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-600 mb-1">Breakdown:</p>
            {Object.entries(ticketHours)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([ticket, hours]) => {
                const info = ticketInfo[ticket];
                return (
                  <div key={ticket} className="text-xs text-gray-600 mb-1">
                    <span className="font-medium">{ticket}</span> - {(hours as number).toFixed(2)} hours
                    {info && (
                      <p className="text-gray-500 truncate">{info.summary}</p>
                    )}
                  </div>
                );
              })}
          </div>
        )}
        <p className="text-xs text-gray-500 mt-2 pt-2 border-t">
          Click to see full breakdown
        </p>
      </div>
    );
  }
  return null;
};

// Custom tooltip for ticket bars
const CustomTicketTooltip = ({ active, payload, label, ticketInfo }: any) => {
  if (active && payload && payload.length) {
    const info = ticketInfo[label];
    return (
      <div className="bg-white p-3 border border-gray-200 rounded shadow-lg max-w-sm">
        <p className="font-semibold text-gray-900">{label}</p>
        {info && (
          <p className="text-sm text-gray-600 mb-2">{info.summary}</p>
        )}
        <p className="text-sm font-medium text-gray-700">
          Total: {payload[0].value} hours
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [worklogs, setWorklogs] = useState<WorklogEntry[]>([]);
  const [ticketInfo, setTicketInfo] = useState<Record<string, TicketInfo>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'daily', type: 'daily', label: 'Daily Hours' },
    { id: 'tickets', type: 'tickets', label: 'Tickets Summary' }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('daily');
  const [dateRange, setDateRange] = useState<DateRangeType>(30);
  const { username } = useUserStore();

  useEffect(() => {
    if (username) {
      console.log(`[Dashboard] Username changed to: ${username}, triggering worklog fetch`);
      fetchWorklogs();
    }
  }, [username, dateRange]);

  const fetchWorklogs = async () => {
    if (!username) {
      console.log('[Dashboard] No username set, skipping worklog fetch');
      return;
    }

    console.log(`[Dashboard] Fetching worklogs for user: ${username}, days: ${dateRange}`);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/worklogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, days: dateRange }),
      });

      const data = await response.json();

      console.log(data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch worklogs');
      }

      if (data.worklogs) {
        console.log(`[Dashboard] Successfully fetched ${data.worklogs.length} worklog entries for ${username}`);
        console.log(`[Dashboard] Date range: last ${dateRange} days`);
        console.log(`[Dashboard] Ticket info received for ${Object.keys(data.ticketInfo || {}).length} tickets`);
        setWorklogs(data.worklogs);
        setTicketInfo(data.ticketInfo || {});
      }
    } catch (error) {
      console.error('[Dashboard] Error fetching worklogs:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Get weekday letter
  const getWeekdayLetter = (date: Date): string => {
    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return weekdays[getDay(date)];
  };

  // Format date with weekday letter
  const formatDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      const weekdayLetter = getWeekdayLetter(date);
      return `${weekdayLetter} ${format(date, 'MMM dd')}`;
    } catch {
      return dateStr;
    }
  };

  // Fill in missing weekdays
  const fillMissingWeekdays = (data: { date: string;[key: string]: any }[]): any[] => {
    const startDate = subDays(new Date(), dateRange);
    const endDate = new Date();

    const allDays = eachDayOfInterval({ start: startDate, end: endDate })
      .filter(date => !isWeekend(date))
      .map(date => format(date, 'yyyy-MM-dd'));

    const dataMap = new Map(data.map(item => [item.date, item]));

    return allDays.map(date => {
      const existing = dataMap.get(date);
      if (existing) {
        return existing;
      }
      // Return empty data for missing days - only include the required fields
      if (data.length > 0 && 'totalHours' in data[0]) {
        return {
          date,
          totalHours: 0
        };
      } else {
        return {
          date,
          hours: 0
        };
      }
    });
  };

  // Filter worklogs by date range
  const getFilteredWorklogs = (): WorklogEntry[] => {
    const cutoffDate = subDays(new Date(), dateRange).toISOString().split('T')[0];
    return worklogs.filter(log => log.date >= cutoffDate);
  };

  // Calculate daily summaries (Screen 1)
  const getDailySummaries = (): DailySummary[] => {
    const filteredLogs = getFilteredWorklogs();
    const dailyMap = new Map<string, number>();

    filteredLogs.forEach(log => {
      const current = dailyMap.get(log.date) || 0;
      dailyMap.set(log.date, current + log.timeSpentSeconds);
    });

    const summaries = Array.from(dailyMap.entries())
      .map(([date, seconds]) => ({
        date,
        totalHours: Number((seconds / 3600).toFixed(2)),
        cumulativeHours: 0 // Not used but keeping for type compatibility
      }));

    return fillMissingWeekdays(summaries) as DailySummary[];
  };

  // Calculate ticket summaries (Screen 2)
  const getTicketSummaries = (): TicketSummary[] => {
    const filteredLogs = getFilteredWorklogs();
    const summaryMap = new Map<string, number>();

    filteredLogs.forEach(log => {
      const current = summaryMap.get(log.key) || 0;
      summaryMap.set(log.key, current + log.timeSpentSeconds);
    });

    return Array.from(summaryMap.entries())
      .map(([ticket, seconds]) => ({
        ticket,
        title: ticketInfo[ticket]?.summary || 'No title available',
        totalHours: Number((seconds / 3600).toFixed(2))
      }))
      .sort((a, b) => b.totalHours - a.totalHours);
  };

  // Get daily breakdown for selected ticket (Screen 3)
  const getTicketDailyBreakdown = (ticket: string): TicketDailyBreakdown[] => {
    console.log(`[Dashboard] Getting daily breakdown for ticket: ${ticket}`);
    const filteredLogs = getFilteredWorklogs();
    const dailyMap = new Map<string, number>();

    filteredLogs
      .filter(log => log.key === ticket)
      .forEach(log => {
        const current = dailyMap.get(log.date) || 0;
        dailyMap.set(log.date, current + log.timeSpentSeconds);
      });

    const breakdown = Array.from(dailyMap.entries())
      .map(([date, seconds]) => ({
        date,
        hours: Number((seconds / 3600).toFixed(2))
      }));

    console.log(`[Dashboard] Found ${breakdown.length} days with logs for ticket: ${ticket}`);
    return fillMissingWeekdays(breakdown) as TicketDailyBreakdown[];
  };

  // Get tickets for a specific day (Screen 4)
  const getDayTicketBreakdown = (date: string): TicketSummary[] => {
    console.log(`[Dashboard] Getting ticket breakdown for date: ${date}`);
    const filteredLogs = getFilteredWorklogs();
    const ticketMap = new Map<string, number>();

    filteredLogs
      .filter(log => log.date === date)
      .forEach(log => {
        const current = ticketMap.get(log.key) || 0;
        ticketMap.set(log.key, current + log.timeSpentSeconds);
      });

    const tickets = Array.from(ticketMap.entries())
      .map(([ticket, seconds]) => ({
        ticket,
        title: ticketInfo[ticket]?.summary || 'No title available',
        totalHours: Number((seconds / 3600).toFixed(2))
      }))
      .sort((a, b) => b.totalHours - a.totalHours);

    console.log(`[Dashboard] Found ${tickets.length} tickets logged on ${date}`);
    return tickets;
  };

  const handleTicketClick = (ticket: string) => {
    console.log(`[Dashboard] User clicked on ticket: ${ticket}`);
    const tabId = `ticket-${ticket}`;
    const existingTab = tabs.find(tab => tab.id === tabId);

    if (existingTab) {
      console.log(`[Dashboard] Tab already exists for ticket: ${ticket}, switching to it`);
      setActiveTabId(tabId);
    } else {
      console.log(`[Dashboard] Creating new tab for ticket: ${ticket}`);
      const newTab: Tab = {
        id: tabId,
        type: 'ticket-detail',
        label: `${ticket}`,
        data: ticket
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(tabId);
    }
  };

  const handleDayClick = (date: string) => {
    console.log(`[Dashboard] User clicked on day: ${date}`);
    const tabId = `day-${date}`;
    const existingTab = tabs.find(tab => tab.id === tabId);

    if (existingTab) {
      console.log(`[Dashboard] Tab already exists for date: ${date}, switching to it`);
      setActiveTabId(tabId);
    } else {
      console.log(`[Dashboard] Creating new tab for date: ${date}`);
      const newTab: Tab = {
        id: tabId,
        type: 'day-detail',
        label: formatDate(date),
        data: date
      };
      setTabs([...tabs, newTab]);
      setActiveTabId(tabId);
    }
  };

  const handleDateRangeChange = (newRange: DateRangeType) => {
    console.log(`[Dashboard] User changed date range from ${dateRange} to ${newRange} days`);
    setDateRange(newRange);
  };

  const handleTabChange = (tabId: string) => {
    console.log(`[Dashboard] User switched to tab: ${tabId}`);
    setActiveTabId(tabId);
  };

  const handleRefresh = () => {
    console.log(`[Dashboard] User clicked refresh button`);
    fetchWorklogs();
  };

  const closeTab = (tabId: string) => {
    console.log(`[Dashboard] User closing tab: ${tabId}`);
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);

    // If we're closing the active tab, switch to an adjacent tab
    if (activeTabId === tabId && newTabs.length > 0) {
      const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
      const newActiveTabId = newTabs[newActiveIndex].id;
      console.log(`[Dashboard] Active tab was closed, switching to: ${newActiveTabId}`);
      setActiveTabId(newActiveTabId);
    }
  };

  const getTabIcon = (type: TabType) => {
    switch (type) {
      case 'daily':
        return <CalendarDays className="w-4 h-4" />;
      case 'tickets':
        return <BarChart3 className="w-4 h-4" />;
      case 'ticket-detail':
        return <Ticket className="w-4 h-4" />;
      case 'day-detail':
        return <CalendarCheck className="w-4 h-4" />;
    }
  };

  const activeTab = tabs.find(tab => tab.id === activeTabId);
  const dailySummaries = getDailySummaries();
  const ticketSummaries = getTicketSummaries();
  const filteredWorklogs = getFilteredWorklogs();

  // Calculate total hours only from days with actual logs
  const totalHours = filteredWorklogs.reduce((sum, log) => sum + log.timeSpentSeconds, 0) / 3600;
  const daysWithLogs = new Set(filteredWorklogs.map(log => log.date)).size;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Clock className="w-8 h-8 text-blue-600" />
            JIRA Time Tracker
          </h1>
          <div className="flex items-center gap-4">
            {/* Date Range Selector */}
            <select
              value={dateRange}
              onChange={(e) => handleDateRangeChange(Number(e.target.value) as DateRangeType)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>

            {username && (
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            )}
          </div>
        </div>

        <UsernameInput onUsernameChange={fetchWorklogs} />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">Error: {error}</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Clock className="w-16 h-16 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-lg text-gray-600">Loading worklogs...</p>
            </div>
          </div>
        )}

        {!loading && username && worklogs.length === 0 && (
          <div className="text-center py-12">
            <Ticket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-lg text-gray-600">No worklogs found for the selected period</p>
          </div>
        )}

        {!loading && worklogs.length > 0 && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Hours</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {totalHours.toFixed(2)}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Tickets</p>
                    <p className="text-2xl font-bold text-gray-900">{ticketSummaries.length}</p>
                  </div>
                  <Ticket className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Hours/Day</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {daysWithLogs > 0 ? (totalHours / daysWithLogs).toFixed(2) : '0.00'}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex flex-wrap">
                  {tabs.map((tab) => (
                    <div
                      key={tab.id}
                      className={`group relative px-6 py-3 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTabId === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      <button
                        onClick={() => handleTabChange(tab.id)}
                        className="flex items-center gap-2"
                      >
                        {getTabIcon(tab.type)}
                        {tab.label}
                      </button>
                      {!['daily', 'tickets'].includes(tab.id) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            closeTab(tab.id);
                          }}
                          className="ml-2 p-1 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {/* Screen 1: Daily Hours */}
                {activeTab?.type === 'daily' && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Hours Logged Per Day</h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={dailySummaries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatDate}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip
                          content={<CustomDailyTooltip worklogs={filteredWorklogs} ticketInfo={ticketInfo} />}
                        />
                        <Bar
                          dataKey="totalHours"
                          fill="#3B82F6"
                          onClick={(data) => handleDayClick(data.date)}
                          style={{ cursor: 'pointer' }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      Click on a bar to see ticket breakdown for that day
                    </p>
                  </div>
                )}

                {/* Screen 2: Tickets Summary */}
                {activeTab?.type === 'tickets' && (
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Total Hours by Ticket</h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={ticketSummaries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="ticket" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip
                          content={<CustomTicketTooltip ticketInfo={ticketInfo} />}
                        />
                        <Bar
                          dataKey="totalHours"
                          fill="#10B981"
                          onClick={(data) => handleTicketClick(data.ticket)}
                          style={{ cursor: 'pointer' }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      Click on a bar to see daily breakdown for that ticket
                    </p>
                  </div>
                )}

                {/* Screen 3: Ticket Daily Breakdown */}
                {activeTab?.type === 'ticket-detail' && activeTab.data && (
                  <div>
                    <div className="mb-4">
                      <h2 className="text-xl font-bold text-gray-900">
                        Daily Hours for {activeTab.data}
                      </h2>
                      {ticketInfo[activeTab.data] && (
                        <p className="text-sm text-gray-600 mt-1">
                          {ticketInfo[activeTab.data].summary}
                        </p>
                      )}
                    </div>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={getTicketDailyBreakdown(activeTab.data)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatDate}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip
                          labelFormatter={(value) => formatDate(value as string)}
                          formatter={(value: number) => `${value} hours`}
                        />
                        <Bar dataKey="hours" fill="#8B5CF6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Screen 4: Day Ticket Breakdown */}
                {activeTab?.type === 'day-detail' && activeTab.data && (
                  <div>
                    <div className="mb-4">
                      <h2 className="text-xl font-bold text-gray-900">
                        Tickets for {format(parseISO(activeTab.data), 'EEEE, MMMM d, yyyy')}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Total: {getDayTicketBreakdown(activeTab.data).reduce((sum, t) => sum + t.totalHours, 0).toFixed(2)} hours
                      </p>
                    </div>
                    {getDayTicketBreakdown(activeTab.data).length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={getDayTicketBreakdown(activeTab.data)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="ticket" angle={-45} textAnchor="end" height={80} />
                          <YAxis />
                          <Tooltip
                            content={<CustomTicketTooltip ticketInfo={ticketInfo} />}
                          />
                          <Bar
                            dataKey="totalHours"
                            fill="#F59E0B"
                            onClick={(data) => handleTicketClick(data.ticket)}
                            style={{ cursor: 'pointer' }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <CalendarCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-lg text-gray-600">No time logged on this day</p>
                      </div>
                    )}
                    {getDayTicketBreakdown(activeTab.data).length > 0 && (
                      <p className="text-sm text-gray-500 mt-2 text-center">
                        Click on a bar to see daily breakdown for that ticket
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
