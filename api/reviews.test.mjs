// Standalone test for api/reviews.js — mocks SerpApi's HTTP responses so we can
// verify the review-mapping pipeline end-to-end without touching the clinic's
// real Google Business listing. Run: node api/reviews.test.mjs
import assert from 'node:assert/strict';

process.env.SERPAPI_KEY = 'test-key';
const { default: handler } = await import('./reviews.js');

const FAKE_PLACE_SEARCH = {
  place_results: { rating: 4.9, reviews: 33, data_id: 'fake-data-id' },
};

const FAKE_REVIEWS = {
  reviews: [
    {
      user: { name: 'Test Patient', thumbnail: 'https://example.com/avatar.jpg' },
      rating: 5,
      snippet: 'New review added for usability testing — great experience!',
      date: 'a day ago',
    },
  ],
};

globalThis.fetch = async (url) => {
  const body = url.includes('google_maps_reviews') ? FAKE_REVIEWS : FAKE_PLACE_SEARCH;
  return { json: async () => body };
};

function mockRes() {
  const res = {
    headers: {},
    statusCode: 200,
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  return res;
}

const res = mockRes();
await handler({}, res);

assert.equal(res.statusCode, 200, 'expected 200 OK');
assert.equal(res.body.rating, 4.9, 'rating should pass through from place search');
assert.equal(res.body.totalReviews, 33, 'totalReviews should pass through');
assert.equal(res.body.reviews.length, 1, 'should map exactly the reviews returned');

const [review] = res.body.reviews;
assert.equal(review.author, 'Test Patient');
assert.equal(review.avatar, 'https://example.com/avatar.jpg');
assert.equal(review.rating, 5);
assert.equal(review.text, 'New review added for usability testing — great experience!');
assert.equal(review.time, 'a day ago');

console.log('PASS — new review flows through /api/reviews mapping correctly:');
console.log(JSON.stringify(res.body, null, 2));
