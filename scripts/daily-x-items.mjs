export function unwrapTwitterListResponse(response) {
  if (Array.isArray(response)) return response;
  if (response?.ok === true && Array.isArray(response.data)) return response.data;
  return null;
}

export function isXWindowTruncated(tweets, start, limit) {
  if (tweets.length < limit) return false;
  const times = tweets.map(tweet => Date.parse(tweet.createdAtISO || tweet.createdAt || '')).filter(Number.isFinite);
  return times.length === 0 || Math.min(...times) >= start;
}

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
