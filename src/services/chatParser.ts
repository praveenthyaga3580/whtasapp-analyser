import { Message, ChatAnalytics, EmojiStat } from "../types";

// Common stop-words to exclude from the word counts to provide accurate analysis
const STOP_WORDS = new Set([
  "the", "and", "to", "of", "a", "i", "is", "in", "it", "you", "that", "he", "was", "for", "on", "are", 
  "as", "with", "his", "they", "i'm", "im", "this", "but", "at", "by", "an", "be", "my", "have", "not", 
  "your", "we", "we're", "can", "do", "how", "what", "will", "or", "me", "so", "if", "up", "so", "just", 
  "out", "about", "all", "go", "get", "get", "no", "yes", "ok", "okay", "like", "our", "its", "from", 
  "has", "had", "would", "should", "could", "want", "there", "then", "their", "there's", "than", "now", "see"
]);

/**
 * Robust WhatsApp exported chat text parser.
 * Handles diverse date patterns:
 * - [24/11/2025, 14:15:22] Praveen: Hello
 * - 24/11/25, 2:15 PM - Praveen: Hello
 * - 11/24/25, 14:15 - Praveen: Hello
 */
export function parseWhatsAppChat(text: string): Message[] {
  const lines = text.split(/\r?\n/);
  const parsedMessages: Message[] = [];
  
  // Clean line regex patterns
  // Pattern 1: [DD/MM/YYYY, HH:MM:SS] Sender: Message
  // Pattern 2: DD/MM/YY, HH:MM - Sender: Message
  // Pattern 3: DD/MM/YYYY, HH:MM PM - Sender: Message
  const bracketRegex = /^\[(\d{1,4}[/\-.]\d{1,2}[/\-.]\d{1,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[aApP][mM])?)\]\s*(.+)$/;
  const dashRegex = /^(\d{1,4}[/\-.]\d{1,2}[/\-.]\d{1,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[aApP][mM])?)\s+[-–]\s+(.+)$/;

  let lastMsg: Message | null = null;
  let linesProcessed = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine || rawLine.trim() === "") continue;

    let dateStr = "";
    let timeStr = "";
    let messageBody = "";

    const bracketMatch = rawLine.match(bracketRegex);
    const dashMatch = rawLine.match(dashRegex);

    if (bracketMatch) {
      dateStr = bracketMatch[1];
      timeStr = bracketMatch[2];
      messageBody = bracketMatch[3];
    } else if (dashMatch) {
      dateStr = dashMatch[1];
      timeStr = dashMatch[2];
      messageBody = dashMatch[3];
    }

    if (dateStr && timeStr && messageBody) {
      // Create a new message block
      const dateParts = dateStr.split(/[/\-.]/);
      let year = 2026;
      let month = 4; // May (0-indexed)
      let day = 14;

      if (dateParts.length === 3) {
        const d0 = parseInt(dateParts[0]);
        const d1 = parseInt(dateParts[1]);
        const d2 = parseInt(dateParts[2]);

        // Auto-detect format DD/MM/YYYY vs YYYY/MM/DD
        if (d0 > 1000) {
          year = d0;
          month = d1 - 1;
          day = d2;
        } else {
          // Assume common standard DD/MM/YYYY or MM/DD/YYYY
          // We will use standard fallback
          day = d0;
          month = (d1 >= 1 && d1 <= 12) ? d1 - 1 : 4;
          year = d2 < 100 ? 2000 + d2 : d2;
        }
      }

      // Time breakdown
      let hours = 12;
      let minutes = 0;
      const timeParts = timeStr.split(":");
      if (timeParts.length >= 2) {
        hours = parseInt(timeParts[0]);
        minutes = parseInt(timeParts[1]);

        // AM/PM calculation
        if (timeStr.toLowerCase().includes("pm") && hours < 12) {
          hours += 12;
        } else if (timeStr.toLowerCase().includes("am") && hours === 12) {
          hours = 0;
        }
      }

      const parsedDate = new Date(year, month, day, hours, minutes);
      
      // Determine if text features standard user formatting "Sender: Msgtext"
      const colonIndex = messageBody.indexOf(":");
      let sender = "System";
      let content = messageBody;
      let isSystem = true;

      // Special exclude: avoid matching system notices like "Messages to this chat are now secured..."
      if (colonIndex > 0 && !messageBody.toLowerCase().includes("security code changed") && !messageBody.substring(0, colonIndex).includes("created the group")) {
        sender = messageBody.substring(0, colonIndex).trim();
        content = messageBody.substring(colonIndex + 1).trim();
        isSystem = false;
      }

      // Identify attachment tags
      const isMedia = content.toLowerCase().includes("<media omitted>") || 
                      content.toLowerCase().includes("file attached") || 
                      content.toLowerCase().includes("<image omitted>") ||
                      content.toLowerCase().includes("<video omitted>") ||
                      content.toLowerCase().includes("<sticker omitted>");

      lastMsg = {
        id: `msg-${linesProcessed++}-${Math.random().toString(36).substr(2, 5)}`,
        sender,
        content,
        rawTimestamp: `${dateStr}, ${timeStr}`,
        timestamp: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
        isSystem,
        isMedia
      };
      parsedMessages.push(lastMsg);
    } else {
      // Multi-line text continuation
      if (lastMsg) {
        lastMsg.content += "\n" + rawLine;
      } else if (parsedMessages.length > 0) {
        parsedMessages[parsedMessages.length - 1].content += "\n" + rawLine;
      }
    }
  }

  return parsedMessages;
}

/**
 * Extracts and maps emojis found in strings
 */
export function extractEmojis(text: string): string[] {
  // Common emoji range regex
  const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu;
  return text.match(emojiRegex) || [];
}

/**
 * Compile detailed Analytics properties over lists of Chat Messages
 */
export function calculateAnalytics(messages: Message[]): ChatAnalytics {
  const activeDays = new Set<string>();
  let totalMessages = 0;
  let totalWords = 0;
  let mediaOmittedCount = 0;

  // Trackers
  const hourlyCounts = Array(24).fill(0);
  const dayOfWeekCounts: { [day: string]: number } = {
    Sunday: 0, Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0
  };
  const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  const monthlyCounts: { [dateStr: string]: number } = {};
  const emojiTally: { [emoji: string]: number } = {};
  const wordTally: { [word: string]: number } = {};

  const userBreakdown: { [username: string]: {
    messageCount: number;
    wordCount: number;
    avgLength: number;
    mediaCount: number;
    emojiCount: number;
    activeHour: number;
    hourlyActivity: number[];
  } } = {};

  messages.forEach((msg) => {
    // Record date for active days check
    const dateKey = msg.timestamp.toLocaleDateString();
    activeDays.add(dateKey);

    // Group month activity as "MMM YY" (e.g. "May 26")
    const monthYearStr = msg.timestamp.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    monthlyCounts[monthYearStr] = (monthlyCounts[monthYearStr] || 0) + 1;

    if (msg.isSystem) return;

    totalMessages++;

    // Word parsing
    const words = msg.content.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const mWordsCount = words.length;
    totalWords += mWordsCount;

    // Collect visual keywords
    words.forEach((rawW) => {
      const cleanW = rawW.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "").trim();
      if (cleanW.length > 2 && !STOP_WORDS.has(cleanW)) {
        wordTally[cleanW] = (wordTally[cleanW] || 0) + 1;
      }
    });

    // Time calculations
    const hour = msg.timestamp.getHours();
    hourlyCounts[hour]++;

    const dayName = weekDays[msg.timestamp.getDay()];
    dayOfWeekCounts[dayName]++;

    // Media tally
    if (msg.isMedia) {
      mediaOmittedCount++;
    }

    // Emojis tally
    const emojis = extractEmojis(msg.content);
    emojis.forEach((em) => {
      emojiTally[em] = (emojiTally[em] || 0) + 1;
    });

    // User calculations
    const user = msg.sender || "Unknown";
    if (!userBreakdown[user]) {
      userBreakdown[user] = {
        messageCount: 0,
        wordCount: 0,
        avgLength: 0,
        mediaCount: 0,
        emojiCount: 0,
        activeHour: 12,
        hourlyActivity: Array(24).fill(0)
      };
    }

    const uStats = userBreakdown[user];
    uStats.messageCount++;
    uStats.wordCount += mWordsCount;
    uStats.emojiCount += emojis.length;
    uStats.hourlyActivity[hour]++;

    if (msg.isMedia) {
      uStats.mediaCount++;
    }
  });

  // Consolidate values for users
  const formattedUserStats: { [username: string]: any } = {};
  Object.keys(userBreakdown).forEach((username) => {
    const raw = userBreakdown[username];
    
    // Find active hour
    let peakHour = 12;
    let peakCount = -1;
    for (let h = 0; h < 24; h++) {
      if (raw.hourlyActivity[h] > peakCount) {
        peakCount = raw.hourlyActivity[h];
        peakHour = h;
      }
    }

    formattedUserStats[username] = {
      messageCount: raw.messageCount,
      wordCount: raw.wordCount,
      avgLength: raw.messageCount > 0 ? Math.round((raw.wordCount / raw.messageCount) * 10) / 10 : 0,
      mediaCount: raw.mediaCount,
      emojiCount: raw.emojiCount,
      activeHour: peakHour
    };
  });

  // Find most active hour of entire chat
  let peakHourTotal = 12;
  let peakHourCount = -1;
  for (let h = 0; h < 24; h++) {
    if (hourlyCounts[h] > peakHourCount) {
      peakHourCount = hourlyCounts[h];
      peakHourTotal = h;
    }
  }

  // Find most active day of week
  let activeDayMax = "Sunday";
  let activeDayCountMax = -1;
  weekDays.forEach((d) => {
    if (dayOfWeekCounts[d] > activeDayCountMax) {
      activeDayCountMax = dayOfWeekCounts[d];
      activeDayMax = d;
    }
  });

  // Top Emojis
  const topEmojis: EmojiStat[] = Object.keys(emojiTally)
    .map(key => ({ emoji: key, count: emojiTally[key] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top Vocabulary
  const topWords = Object.keys(wordTally)
    .map(key => ({ text: key, value: wordTally[key] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);

  // Convert charts to arrays
  const hourlyActivity = hourlyCounts.map((messages, hour) => ({ hour, messages }));
  const dayOfWeekActivity = weekDays.map((day) => ({ day, messages: dayOfWeekCounts[day] }));
  
  // Month sorting
  const monthlyActivity = Object.keys(monthlyCounts).map((dateStr) => ({
    dateStr,
    messages: monthlyCounts[dateStr]
  }));

  return {
    activeDaysCount: activeDays.size || 1,
    totalMessages,
    totalWords,
    avgMessageLength: totalMessages > 0 ? Math.round((totalWords / totalMessages) * 10) / 10 : 0,
    mediaOmittedCount,
    mostActiveHour: peakHourTotal,
    mostActiveDayOfWeek: activeDayMax,
    topEmojis,
    topWords,
    userBreakdown: formattedUserStats,
    hourlyActivity,
    dayOfWeekActivity,
    monthlyActivity
  };
}

// ----------------------------------------------------
// MOCK CHAT EXPORTS (Fictional, highly engaging, rich metadata)
// ----------------------------------------------------

export const MOCK_CHATS = {
  friends: `
14/04/2026, 11:15 - System: Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
14/04/2026, 11:16 - Alex: Hey everyone! 👋 Are we still on for the road trip next weekend? 🚗💨
14/04/2026, 11:17 - Praveen: Oh absolutely! I already double-checked our hostel booking. We are good to go! 😎🎉
14/04/2026, 11:18 - Sarah: YES! Counts me in! 🥳 But please tell me we aren't leaving at 5 AM. I need my beauty sleep 😴
14/04/2026, 11:18 - Alex: Sarah, if we don't leave by 5:30 AM we are going to hit massive beach holiday traffic 😭
14/04/2026, 11:19 - Praveen: Honestly, last year we spent 3 hours in gridlock on that bridge... It was tragic. I vote early departure ⏰
14/04/2026, 11:20 - Sarah: Okay, fine... 🙄 I'll buy a giant coffee. Who is driving?
14/04/2026, 11:21 - Alex: <Media omitted>
14/04/2026, 11:21 - Alex: Here's the route option! My car has the most legroom. I can drive the first leg.
14/04/2026, 11:23 - Praveen: Legend! I'll curate the Spotify playlist. Need high energy rock and some classic throwbacks 🎸🎧
14/04/2026, 11:25 - Sarah: Please, no extreme heavy metal at 6 AM, okay? My ears will bleed ☠️
14/04/2026, 13:40 - Alex: What's the plan for snacks? I can grab some chips and sodas.
14/04/2026, 13:41 - Sarah: I'll bake some fresh chocolate chip cookies! 🍪🍫
14/04/2026, 13:42 - Praveen: Chocolate chip cookies?! Sarah, you are officially the MVP of this road trip. All is forgiven about the early departure request! 😂🙏
14/04/2026, 13:45 - Sarah: Haha I know, my baking solves all conflicts 😌
14/04/2026, 18:10 - Alex: <Media omitted>
14/04/2026, 18:11 - Alex: Look at this scenic overlook along the way. We definitely have to stop there for group selfies!
14/04/2026, 18:15 - Praveen: Oh, that looks majestic 🏔️ Count me in for the photoshoot!
14/04/2026, 18:18 - Sarah: Perfect aesthetic! I'll bring my polaroid camera 📷✨
15/04/2026, 09:30 - Praveen: Hey, has anyone heard from Marcus? Is he coming or what? 🤷‍♂️
15/04/2026, 09:35 - Alex: I messaged him yesterday. He said he has a work project but is trying to squeeze it in.
15/04/2026, 09:38 - Sarah: Classic Marcus, always leaving us in suspense! 🙄 Hope he makes it.
15/04/2026, 09:41 - Marcus: Hey, sorry guys! 😅 I just resolved the client issue! I AM COMING! Let's goooo! 🚀☄️
15/04/2026, 09:42 - Praveen: YESSS MARCUS! The band is fully back together! 🙌🔥
15/04/2026, 09:43 - Alex: Awesome. Marcus, you're on water duty. Bring a couple of cases! 🚰
15/04/2026, 09:44 - Marcus: Easy. Done deal. Can't wait!
`,

  couple: `
12/05/2026, 08:30 - System: Messages and calls are end-to-end encrypted.
12/05/2026, 08:31 - Emily: Good morning, love! ❤️ Hope you slept well.
12/05/2026, 08:34 - Praveen: Morning sunshine! ☀️ Yes, slept great, dreaming of you. Got a busy day today but starting it with your text makes it perfect! 😘
12/05/2026, 08:36 - Emily: Aww, you're the sweetest! 🥰 Have a great day at work. Don't skip lunch! 🍱
12/05/2026, 08:38 - Praveen: I promise, lunch scheduled at 1. Talk to you soon!
12/05/2026, 12:45 - Emily: <Media omitted>
12/05/2026, 12:46 - Emily: Look at this cute puppy I saw on my walk to the coffee shop! My heart melted 🐶🥺
12/05/2026, 12:50 - Praveen: Oh my goodness! Look at those ears! 😍 We absolutely need to adopt a golden retriever someday.
12/05/2026, 12:51 - Emily: Yes, please! A million times yes! 💛🐾
12/05/2026, 17:30 - Praveen: Just wrapped up my final meeting! Heading home now. Are we still eating out for date night? 🍝🍷
12/05/2026, 17:33 - Emily: YES! I'm so excited. I booked a table at that cozy Italian place we love for 7:30.
12/05/2026, 17:35 - Praveen: Perfect choice. I'll pick you up in an hour? 🚗
12/05/2026, 17:36 - Emily: Make it 1 hour and 15 mins! I'm still doing my makeup/hair 💄💇‍♀️
12/05/2026, 17:38 - Praveen: Haha, take your time, you're gorgeous representing any style. I'll be there at 6:50!
12/05/2026, 17:40 - Emily: Love you! See you soon. 😘❤️
12/05/2026, 21:45 - Emily: Dinner was so delicious tonight. Thanks for taking me out, honey. 🥰
12/05/2026, 21:49 - Praveen: Always, my love. Best food, but even better company! Sweet dreams. See you tomorrow 🌙💑
`,

  startup: `
14/05/2026, 09:00 - System: Praveen created group 'NextGen App Workspace'
14/05/2026, 09:01 - Praveen: Welcome team to our development sync chat! 🚀 Let's use this to discuss launch blocks and coordinate push sessions.
14/05/2026, 09:04 - Dave (Lead Dev): Morning! Codebase synced. I've finished implementing the new custom UI framework. 💻
14/05/2026, 09:06 - Priya (QA manager): Thanks Dave! I'll run the end_to_end testing suite as soon as the staging server is deployed of version 1.0.4.
14/05/2026, 09:08 - Praveen: Perfect. Priya, did we fix the user registration token crash? That is blocking production.
14/05/2026, 09:10 - Dave (Lead Dev): Yes, that was a null pointer check on the auth token callback. I resolved it in commit #22a94f.
14/05/2026, 09:12 - Priya (QA manager): Great, I will explicitly verify this on multiple edge cases.
14/05/2026, 09:13 - Dave (Lead Dev): <Media omitted>
14/05/2026, 09:14 - Dave (Lead Dev): Here's a screenshot of the updated Analytics dashboard running smoothly.
14/05/2026, 09:16 - Priya (QA manager): Wow, looks super clean! Love the dark-mode grid 📊🔥
14/05/2026, 11:30 - Praveen: Excellent progress. Dave, are we good on Firebase integration?
14/05/2026, 11:35 - Dave (Lead Dev): Config is in file assets, Database is securely firewalled, rules deploy is complete! It fully works.
14/05/2026, 14:15 - Priya (QA manager): All QA test cases PASSED for current build layout! Zero high-severity bugs found. 🏆🎈
14/05/2026, 14:18 - Praveen: Phenomenal job team. Let's schedule the official Play Store release for 5:00 PM today.
14/05/2026, 14:20 - Dave (Lead Dev): Ready! Preparing release bundle. Let's ship it! ⚓🛫
`
};
