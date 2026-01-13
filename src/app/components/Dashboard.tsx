'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Calendar, Clock, Ticket, TrendingUp, RefreshCw, BarChart3, CalendarDays, CalendarCheck, X, Trophy, Target } from 'lucide-react';
import { format, parseISO, subDays, eachDayOfInterval, isWeekend, getDay } from 'date-fns';
import { WorklogEntry, TicketSummary, TicketDailyBreakdown, TicketInfo } from '../types/worklog';
import { useUsernames } from '../hooks/useUsernames';
import { useWorklogs } from '../hooks/useWorklogs';
import UserManager from './UserManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type TabType = 'daily' | 'tickets' | 'ticket-detail' | 'day-detail';
type DateRangeType = 7 | 14 | 30 | 60 | 90;

interface CustomTab {
  id: string;
  type: TabType;
  label: string;
  data?: string;
}

const USER_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

const getUserColor = (index: number): string => {
  return USER_COLORS[index % USER_COLORS.length];
};

interface MultiUserDailyTooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; fill: string }>;
  label?: string;
}

const MultiUserDailyTooltip = ({ active, payload, label }: MultiUserDailyTooltipProps) => {
  if (active && payload && payload.length && label) {
    const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
    return (
      <div className="bg-background p-3 border border-border rounded-lg shadow-lg">
        <p className="font-semibold text-foreground mb-2">
          {format(parseISO(label), 'EEEE, MMM dd')}
        </p>
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2 text-sm text-foreground">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.fill }}
            />
            <span>{entry.dataKey}: {(entry.value || 0).toFixed(2)} hours</span>
          </div>
        ))}
        <div className="mt-2 pt-2 border-t border-border text-sm font-medium text-foreground">
          Total: {total.toFixed(2)} hours
        </div>
      </div>
    );
  }
  return null;
};

interface MultiUserTicketTooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; fill: string }>;
  label?: string;
  ticketInfo: Record<string, TicketInfo>;
}

const MultiUserTicketTooltip = ({ active, payload, label, ticketInfo }: MultiUserTicketTooltipProps) => {
  if (active && payload && payload.length && label) {
    const info = ticketInfo[label];
    const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
    return (
      <div className="bg-background p-3 border border-border rounded-lg shadow-lg max-w-sm">
        <p className="font-semibold text-foreground">{label}</p>
        {info && <p className="text-sm text-muted-foreground mb-2">{info.summary}</p>}
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2 text-sm text-foreground">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.fill }}
            />
            <span>{entry.dataKey}: {(entry.value || 0).toFixed(2)} hours</span>
          </div>
        ))}
        <div className="mt-2 pt-2 border-t border-border text-sm font-medium text-foreground">
          Total: {total.toFixed(2)} hours
        </div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [customTabs, setCustomTabs] = useState<CustomTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('daily');
  const [dateRange, setDateRange] = useState<DateRangeType>(30);
  const { usernames, visibleUsers, hydrated, addUsername, removeUsername, toggleUserVisibility } = useUsernames();

  // Filter usernames to only visible ones for charts
  const visibleUsernames = usernames.filter(u => visibleUsers.has(u));

  const { data, isLoading, error, refetch, isFetching } = useWorklogs(usernames, dateRange);

  const worklogs = data?.worklogs || [];
  const ticketInfo = data?.ticketInfo || {};

  const getWeekdayLetter = (date: Date): string => {
    const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return weekdays[getDay(date)];
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      const weekdayLetter = getWeekdayLetter(date);
      return `${weekdayLetter} ${format(date, 'MMM dd')}`;
    } catch {
      return dateStr;
    }
  };

  const fillMissingWeekdays = <T extends { date: string }>(data: T[], defaultValues: Omit<T, 'date'>): T[] => {
    const startDate = subDays(new Date(), dateRange);
    const endDate = new Date();

    const allDays = eachDayOfInterval({ start: startDate, end: endDate })
      .filter(date => !isWeekend(date))
      .map(date => format(date, 'yyyy-MM-dd'));

    const dataMap = new Map(data.map(item => [item.date, item]));

    return allDays.map(date => {
      const existing = dataMap.get(date);
      if (existing) return existing;
      return { date, ...defaultValues } as T;
    });
  };

  const getFilteredWorklogs = (): WorklogEntry[] => {
    const cutoffDate = subDays(new Date(), dateRange).toISOString().split('T')[0];
    return worklogs.filter(log => log.date >= cutoffDate);
  };

  // Multi-user daily summaries for grouped bar chart
  const getMultiUserDailySummaries = () => {
    const filteredLogs = getFilteredWorklogs().filter(log => visibleUsers.has(log.author));
    const dailyMap = new Map<string, Record<string, number>>();

    filteredLogs.forEach(log => {
      if (!dailyMap.has(log.date)) {
        dailyMap.set(log.date, {});
      }
      const dayData = dailyMap.get(log.date)!;
      dayData[log.author] = (dayData[log.author] || 0) + log.timeSpentSeconds / 3600;
    });

    const summaries = Array.from(dailyMap.entries()).map(([date, userData]) => ({
      date,
      ...Object.fromEntries(
        Object.entries(userData).map(([user, hours]) => [user, Number(hours.toFixed(2))])
      )
    }));

    const defaultValues = Object.fromEntries(visibleUsernames.map(u => [u, 0]));
    return fillMissingWeekdays(summaries, defaultValues);
  };

  // Multi-user ticket summaries
  const getMultiUserTicketSummaries = () => {
    const filteredLogs = getFilteredWorklogs().filter(log => visibleUsers.has(log.author));
    const ticketMap = new Map<string, Record<string, number>>();

    filteredLogs.forEach(log => {
      if (!ticketMap.has(log.key)) {
        ticketMap.set(log.key, {});
      }
      const ticketData = ticketMap.get(log.key)!;
      ticketData[log.author] = (ticketData[log.author] || 0) + log.timeSpentSeconds / 3600;
    });

    return Array.from(ticketMap.entries())
      .map(([ticket, userData]) => {
        const total = Object.values(userData).reduce((sum, h) => sum + h, 0);
        return {
          ticket,
          title: ticketInfo[ticket]?.summary || 'No title available',
          total,
          ...Object.fromEntries(
            Object.entries(userData).map(([user, hours]) => [user, Number(hours.toFixed(2))])
          )
        };
      })
      .sort((a, b) => b.total - a.total);
  };

  const getTicketDailyBreakdown = (ticket: string): TicketDailyBreakdown[] => {
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

    return fillMissingWeekdays(breakdown, { hours: 0 });
  };

  const getDayTicketBreakdown = (date: string): TicketSummary[] => {
    const filteredLogs = getFilteredWorklogs();
    const ticketMap = new Map<string, number>();

    filteredLogs
      .filter(log => log.date === date)
      .forEach(log => {
        const current = ticketMap.get(log.key) || 0;
        ticketMap.set(log.key, current + log.timeSpentSeconds);
      });

    return Array.from(ticketMap.entries())
      .map(([ticket, seconds]) => ({
        ticket,
        title: ticketInfo[ticket]?.summary || 'No title available',
        totalHours: Number((seconds / 3600).toFixed(2))
      }))
      .sort((a, b) => b.totalHours - a.totalHours);
  };

  const handleTicketClick = (ticket: string) => {
    const tabId = `ticket-${ticket}`;
    const existingTab = customTabs.find(tab => tab.id === tabId);

    if (existingTab) {
      setActiveTabId(tabId);
    } else {
      const newTab: CustomTab = {
        id: tabId,
        type: 'ticket-detail',
        label: ticket,
        data: ticket
      };
      setCustomTabs([...customTabs, newTab]);
      setActiveTabId(tabId);
    }
  };

  const handleDayClick = (date: string) => {
    const tabId = `day-${date}`;
    const existingTab = customTabs.find(tab => tab.id === tabId);

    if (existingTab) {
      setActiveTabId(tabId);
    } else {
      const newTab: CustomTab = {
        id: tabId,
        type: 'day-detail',
        label: formatDate(date),
        data: date
      };
      setCustomTabs([...customTabs, newTab]);
      setActiveTabId(tabId);
    }
  };

  const closeTab = (tabId: string) => {
    const tabIndex = customTabs.findIndex(tab => tab.id === tabId);
    const newTabs = customTabs.filter(tab => tab.id !== tabId);
    setCustomTabs(newTabs);

    if (activeTabId === tabId) {
      if (newTabs.length > 0) {
        const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
        setActiveTabId(newTabs[newActiveIndex].id);
      } else {
        setActiveTabId('daily');
      }
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

  const activeCustomTab = customTabs.find(tab => tab.id === activeTabId);
  const filteredWorklogs = getFilteredWorklogs();
  const visibleFilteredWorklogs = filteredWorklogs.filter(log => visibleUsers.has(log.author));

  // Calculate per-user totals (for visible users only)
  const userTotals = visibleUsernames.reduce((acc, username) => {
    const userLogs = filteredWorklogs.filter(log => log.author === username);
    const total = userLogs.reduce((sum, log) => sum + log.timeSpentSeconds, 0) / 3600;
    acc[username] = total;
    return acc;
  }, {} as Record<string, number>);

  const totalHours = Object.values(userTotals).reduce((sum, h) => sum + h, 0);
  const uniqueTickets = new Set(visibleFilteredWorklogs.map(log => log.key)).size;
  const daysWithLogs = new Set(visibleFilteredWorklogs.map(log => log.date)).size;

  // Calculate user rankings
  const getUserStats = () => {
    const startDate = subDays(new Date(), dateRange);
    const endDate = new Date();
    const allWeekdays = eachDayOfInterval({ start: startDate, end: endDate })
      .filter(date => !isWeekend(date))
      .map(date => format(date, 'yyyy-MM-dd'));
    const totalWeekdays = allWeekdays.length;

    return visibleUsernames.map((username) => {
      const userLogs = filteredWorklogs.filter(log => log.author === username);
      const totalHours = userLogs.reduce((sum, log) => sum + log.timeSpentSeconds / 3600, 0);
      const daysLogged = new Set(userLogs.map(log => log.date)).size;
      const consistencyPercent = totalWeekdays > 0 ? (daysLogged / totalWeekdays) * 100 : 0;
      const originalIndex = usernames.indexOf(username);

      return {
        username,
        totalHours,
        daysLogged,
        consistencyPercent,
        color: getUserColor(originalIndex),
      };
    });
  };

  const userStats = getUserStats();
  const sortedByHours = [...userStats].sort((a, b) => b.totalHours - a.totalHours);
  const sortedByConsistency = [...userStats].sort((a, b) => b.consistencyPercent - a.consistencyPercent);

  // Show loading while hydrating from localStorage
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary" />
            JIRA Time Tracker
          </h1>
          <div className="flex items-center gap-4">
            <Select
              value={dateRange.toString()}
              onValueChange={(value) => setDateRange(Number(value) as DateRangeType)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="60">Last 60 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            {usernames.length > 0 && (
              <Button
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </div>
        </div>

        <UserManager
          usernames={usernames}
          visibleUsers={visibleUsers}
          addUsername={addUsername}
          removeUsername={removeUsername}
          toggleUserVisibility={toggleUserVisibility}
        />

        {error && (
          <Card className="border-red-200 bg-red-50 mb-6">
            <CardContent className="pt-6">
              <p className="text-sm text-red-800">Error: {error.message}</p>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Clock className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">Loading worklogs...</p>
            </div>
          </div>
        )}

        {!isLoading && usernames.length > 0 && worklogs.length === 0 && (
          <div className="text-center py-12">
            <Ticket className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">No worklogs found for the selected users in this period</p>
          </div>
        )}

        {!isLoading && worklogs.length > 0 && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{totalHours.toFixed(2)}</div>
                  <div className="mt-2 space-y-1">
                    {visibleUsernames.map((username) => {
                      const originalIndex = usernames.indexOf(username);
                      return (
                        <div key={username} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getUserColor(originalIndex) }}
                          />
                          <span>{username}: {(userTotals[username] || 0).toFixed(2)}h</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Tickets</CardTitle>
                  <Ticket className="w-5 h-5 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{uniqueTickets}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Avg Hours/Day</CardTitle>
                  <Calendar className="w-5 h-5 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">
                    {daysWithLogs > 0 ? (totalHours / daysWithLogs).toFixed(2) : '0.00'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* User Rankings */}
            {visibleUsernames.length > 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Hours Ranking</CardTitle>
                    <Trophy className="w-5 h-5 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {sortedByHours.map((user, index) => (
                        <div key={user.username} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                              #{index + 1}
                            </span>
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: user.color }}
                            />
                            <span className="text-sm text-foreground">{user.username}</span>
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">{user.totalHours.toFixed(1)}h</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Consistency Ranking</CardTitle>
                    <Target className="w-5 h-5 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {sortedByConsistency.map((user, index) => (
                        <div key={user.username} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                              #{index + 1}
                            </span>
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: user.color }}
                            />
                            <span className="text-sm text-foreground">{user.username}</span>
                          </div>
                          <span className="text-sm font-medium text-muted-foreground">
                            {user.consistencyPercent.toFixed(0)}% ({user.daysLogged} days)
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tabs */}
            <Card>
              <Tabs value={activeTabId} onValueChange={setActiveTabId}>
                <div className="border-b px-6 pt-4">
                  <TabsList className="bg-transparent gap-2">
                    <TabsTrigger value="daily" className="flex items-center gap-2 data-[state=active]:bg-blue-100">
                      <CalendarDays className="w-4 h-4" />
                      Daily Hours
                    </TabsTrigger>
                    <TabsTrigger value="tickets" className="flex items-center gap-2 data-[state=active]:bg-blue-100">
                      <BarChart3 className="w-4 h-4" />
                      Tickets Summary
                    </TabsTrigger>
                    {customTabs.map((tab) => (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className="flex items-center gap-2 group data-[state=active]:bg-blue-100"
                      >
                        {getTabIcon(tab.type)}
                        {tab.label}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            closeTab(tab.id);
                          }}
                          className="ml-1 p-0.5 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                <CardContent className="pt-6">
                  {/* Daily Hours */}
                  <TabsContent value="daily" className="mt-0">
                    <h2 className="text-xl font-bold text-foreground mb-4">Hours Logged Per Day</h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={getMultiUserDailySummaries()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={formatDate}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip content={<MultiUserDailyTooltip />} />
                        <Legend />
                        {visibleUsernames.map((username) => {
                          const originalIndex = usernames.indexOf(username);
                          return (
                            <Bar
                              key={username}
                              dataKey={username}
                              name={username}
                              fill={getUserColor(originalIndex)}
                              onClick={(data) => data && handleDayClick(data.date)}
                              style={{ cursor: 'pointer' }}
                            />
                          );
                        })}
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      Click on a bar to see ticket breakdown for that day
                    </p>
                  </TabsContent>

                  {/* Tickets Summary */}
                  <TabsContent value="tickets" className="mt-0">
                    <h2 className="text-xl font-bold text-foreground mb-4">Total Hours by Ticket</h2>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={getMultiUserTicketSummaries()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="ticket" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip content={<MultiUserTicketTooltip ticketInfo={ticketInfo} />} />
                        <Legend />
                        {visibleUsernames.map((username) => {
                          const originalIndex = usernames.indexOf(username);
                          return (
                            <Bar
                              key={username}
                              dataKey={username}
                              name={username}
                              fill={getUserColor(originalIndex)}
                              onClick={(data) => data && handleTicketClick(data.ticket)}
                              style={{ cursor: 'pointer' }}
                            />
                          );
                        })}
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      Click on a bar to see daily breakdown for that ticket
                    </p>
                  </TabsContent>

                  {/* Dynamic Tabs */}
                  {customTabs.map((tab) => (
                    <TabsContent key={tab.id} value={tab.id} className="mt-0">
                      {tab.type === 'ticket-detail' && tab.data && (
                        <div>
                          <div className="mb-4">
                            <h2 className="text-xl font-bold text-foreground">
                              Daily Hours for {tab.data}
                            </h2>
                            {ticketInfo[tab.data] && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {ticketInfo[tab.data].summary}
                              </p>
                            )}
                          </div>
                          <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={getTicketDailyBreakdown(tab.data)}>
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
                                formatter={(value: number) => [`${value} hours`, 'Hours']}
                              />
                              <Bar dataKey="hours" fill="#8B5CF6" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {tab.type === 'day-detail' && tab.data && (
                        <div>
                          <div className="mb-4">
                            <h2 className="text-xl font-bold text-foreground">
                              Tickets for {format(parseISO(tab.data), 'EEEE, MMMM d, yyyy')}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                              Total: {getDayTicketBreakdown(tab.data).reduce((sum, t) => sum + t.totalHours, 0).toFixed(2)} hours
                            </p>
                          </div>
                          {getDayTicketBreakdown(tab.data).length > 0 ? (
                            <>
                              <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={getDayTicketBreakdown(tab.data)}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="ticket" angle={-45} textAnchor="end" height={80} />
                                  <YAxis />
                                  <Tooltip
                                    formatter={(value: number) => [`${value} hours`, 'Hours']}
                                  />
                                  <Bar
                                    dataKey="totalHours"
                                    fill="#F59E0B"
                                    onClick={(data) => handleTicketClick(data.ticket)}
                                    style={{ cursor: 'pointer' }}
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                              <p className="text-sm text-muted-foreground mt-2 text-center">
                                Click on a bar to see daily breakdown for that ticket
                              </p>
                            </>
                          ) : (
                            <div className="text-center py-12 bg-muted rounded-lg">
                              <CalendarCheck className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                              <p className="text-lg text-muted-foreground">No time logged on this day</p>
                            </div>
                          )}
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </CardContent>
              </Tabs>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
