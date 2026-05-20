// index.js
const fs = require('fs');
const ical = require('node-ical');

const icalUrls = [
  { url: 'https://hhs.haverford.k12.pa.us/calendar/calendar_361.ics', outputFile: 'rss.xml' },
  { url: 'https://hhs.haverford.k12.pa.us/calendar/calendar_354.ics', outputFile: 'rss2.xml' },
];
const outputHtmlFile = 'index.html';

function escapeXml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function formatDate(date) {
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'short' });
  const weekday = date.toLocaleString('default', { weekday: 'short' });
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;

  // Check if the event is all day (no specific time)
  const isAllDay = hours === 0 && minutes === '00';

  if (isAllDay) {
    return `${weekday}, ${month} ${day}${getOrdinalSuffix(day)}: All Day`;
  } else {
    return `${weekday}, ${month} ${day}${getOrdinalSuffix(day)} at ${formattedHours}:${minutes} ${ampm}`;
  }
}

async function generateRss() {
  try {
    console.log('Fetching iCal feeds...');
    const allItems = [];

    for (const { url, outputFile } of icalUrls) {
      const data = await ical.async.fromURL(url);
      const items = Object.values(data)
        .filter(event => event.type === 'VEVENT')
        .map(event => {
          const startDate = new Date(event.start);
          const formattedDate = formatDate(startDate);
          return {
            title: `${formattedDate}: ${event.summary}`,
            description: event.description || '',
            pubDate: startDate.toUTCString(),
            link: event.url || url,
          };
        })
        .sort((a, b) => new Date(a.pubDate) - new Date(b.pubDate));
      allItems.push(...items);

      // Generate RSS XML for this feed
      const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>HHS Calendar RSS Feed</title>
    <description>RSS feed for HHS Calendar</description>
    <link>https://${process.env.GITHUB_REPOSITORY.split('/')}.github.io/${process.env.GITHUB_REPOSITORY.split('/')}/</link>
    ${items
      .map(
        item => `
      <item>
        <title>${escapeXml(item.title)}</title>
        <description>${escapeXml(item.description)}</description>
        <pubDate>${item.pubDate}</pubDate>
        <link>${escapeXml(item.link)}</link>
      </item>
    `,
      )
      .join('')}
  </channel>
</rss>`;

      fs.writeFileSync(outputFile, rssXml);
      console.log(`RSS feed generated: ${outputFile}`);
    }

    console.log(`Found ${allItems.length} total events.`);

    // Generate HTML page
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HHS Calendar RSS Feeds</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 2rem; }
    h1 { color: #2c3e50; }
    ul { list-style: none; padding: 0; }
    li { margin: 1rem 0; padding: 1rem; background: #f9f9f9; border-radius: 4px; }
    a { color: #3498db; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>HHS Calendar RSS Feeds</h1>
  <p>Subscribe to these RSS feeds in your RSS reader:</p>
  <ul>
    <li><a href="rss.xml">RSS Feed 1 (calendar_361.ics)</a></li>
    <li><a href="rss2.xml">RSS Feed 2 (calendar_354.ics)</a></li>
  </ul>
</body>
</html>
    `;

    fs.writeFileSync(outputHtmlFile, html);
    console.log('HTML page generated:', outputHtmlFile);
  } catch (error) {
    console.error('Error generating RSS feeds:', error);
    process.exit(1);
  }
}

generateRss();
