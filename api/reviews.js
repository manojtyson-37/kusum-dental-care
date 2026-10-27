// Vercel serverless function — proxies SerpApi's Google Maps engine so the key stays server-side.
// SerpApi wraps real Google Maps data (rating, review count, reviews) without needing
// a Google Cloud billing account. Free tier: 100 searches/month.
// Responses are edge-cached for 6 hours to stay within that quota.

const API_KEY    = process.env.SERPAPI_KEY;
const PLACE_NAME = "Dr Kusum's Dental Care Malleshpalya, Bangalore";
const LAT_LNG    = '12.9751706,77.6733556';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Edge-cache 6 h; serve stale for up to 1 h while refreshing
  res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=3600');

  if (!API_KEY) {
    return res.status(500).json({ error: 'API_KEY_MISSING' });
  }

  try {
    // ── Step 1: Resolve the place's data_id via a Google Maps search ───────
    const searchUrl =
      'https://serpapi.com/search.json?' +
      `engine=google_maps&q=${encodeURIComponent(PLACE_NAME)}` +
      `&ll=@${LAT_LNG},15z` +
      `&api_key=${API_KEY}`;

    const searchResp = await fetch(searchUrl);
    const searchData = await searchResp.json();

    const place = searchData.place_results ?? searchData.local_results?.[0];
    if (!place?.data_id) {
      return res.status(404).json({ error: 'PLACE_NOT_FOUND' });
    }

    const { rating, reviews: totalReviews, data_id: dataId } = place;

    // ── Step 2: Fetch the actual review text via the reviews engine ────────
    const reviewsUrl =
      'https://serpapi.com/search.json?' +
      `engine=google_maps_reviews&data_id=${dataId}` +
      `&sort_by=newestFirst&api_key=${API_KEY}`;

    const reviewsResp = await fetch(reviewsUrl);
    const reviewsData = await reviewsResp.json();

    const reviews = (reviewsData.reviews ?? [])
      .filter((r) => r.snippet && r.snippet.trim().length > 0)
      .slice(0, 6)
      .map((r) => ({
        author: r.user?.name,
        avatar: r.user?.thumbnail,
        rating: r.rating,
        text: r.snippet,
        time: r.date,
      }));

    return res.json({ rating, totalReviews, reviews });
  } catch (err) {
    console.error('[reviews-api]', err);
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}
