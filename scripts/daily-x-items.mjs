export function selectXItems(tweets, start, end) {
  return tweets.flatMap(tweet => {
    const time = Date.parse(tweet.createdAtISO || tweet.createdAt || '');
    if (!Number.isFinite(time) || time < start || time >= end) return [];
    const id = String(tweet.id ?? '');
    const handle = String(tweet.author?.screenName ?? '');
    if (!/^\d+$/.test(id) || !/^[\w]{1,15}$/.test(handle)) return [];
    return [{
      author: tweet.author?.name || handle,
      handle,
      createdAt: new Date(time).toISOString(),
      text: tweet.text || '',
      url: `https://x.com/${handle}/status/${id}`,
    }];
  });
}
