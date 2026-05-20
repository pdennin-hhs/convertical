// index.js
const fs = require('fs');
const ical = require('node-ical');

const icalUrl = 'https://hhs.haverford.k12.pa.us/calendar/calendar_361.ics';
const outputFile = 'rss.xml';
const outputHtmlFile = 'index.html';

function formatDate(date) {
  const options = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  return date.toLocaleString('en-US', options).replace(',', '');
}

async function generateRss() {
  try {
    console.log('Fetching iCal feed...');
    const data = await ical.async.fromURL(icalUrl);

    const items = Object.values(data)
      .filter(event => event.type === 'VEVENT')
      .map(event => {
        const startDate = new Date(event.start);
        const formattedDate = formatDate(startDate);
        return {
          title: `${formattedDate}: ${event.summary}`,
          description: event.description || '',
          pubDate: startDate.toUTCString(),
          link: event.url || icalUrl,
        };
      })
      .sort((a, b) => new Date(a.pubDate) - new Date(b.pubDate));

    console.log(`Found ${items.length} events.`);

    // Generate RSS XML
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
        <title>${item.title}</title>
        <description>${item.description}</description>
        <pubDate>${item.pubDate}</pubDate>
        <link>${item.link}</link>
      </item>
    `,
      )
      .join('')}
  </channel>
</rss>`;

    fs.writeFileSync(outputFile, rssXml);
    console.log('RSS feed generated:', outputFile);

    // Generate HTML page
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HHS Calendar RSS Feed</title>
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
  <h1>HHS Calendar RSS Feed</h1>
  <p>Subscribe to this <a href="rss.xml">RSS feed</a> in your RSS reader.</p>
  <h2>Upcoming Events</h2>
  <ul>
    ${items
      .map(
        item => `
      <li>
        <h3><a href="${item.link}">${item.title}</a></h3>
        <p>${item.description}</p>
      </li>
    `,
      )
      .join('')}
  </ul>
</body>
</html>
    `;

    fs.writeFileSync(outputHtmlFile, html);
    console.log('HTML page generated:', outputHtmlFile);
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    process.exit(1);
  }
}

generateRss();
