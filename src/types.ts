export interface Message {
  id: string;
  sender: string;
  content: string;
  rawTimestamp: string;
  timestamp: Date;
  isSystem: boolean;
  isMedia: boolean;
}

export interface ChatSession {
  id: string;
  name: string;
  importedAt: string;
  messages: Message[];
  participants: string[];
}

export interface EmojiStat {
  emoji: string;
  count: number;
}

export interface UserStats {
  messageCount: number;
  wordCount: number;
  avgLength: number;
  mediaCount: number;
  emojiCount: number;
  activeHour: number;
}

export interface ChatAnalytics {
  activeDaysCount: number;
  totalMessages: number;
  totalWords: number;
  avgMessageLength: number;
  mediaOmittedCount: number;
  mostActiveHour: number;
  mostActiveDayOfWeek: string;
  topEmojis: EmojiStat[];
  topWords: { text: string; value: number }[];
  userBreakdown: { [username: string]: UserStats };
  hourlyActivity: { hour: number; messages: number }[];
  dayOfWeekActivity: { day: string; messages: number }[];
  monthlyActivity: { dateStr: string; messages: number }[];
}

export interface AndroidFileNode {
  path: string;
  name: string;
  type: "file" | "dir";
  language: "java" | "xml" | "gradle" | "json";
  content: string;
  description: string;
  children?: AndroidFileNode[];
}
