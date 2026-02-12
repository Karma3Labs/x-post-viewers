import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  const BEARER_TOKEN = process.env.X_BEARER_TOKEN;

  if (!BEARER_TOKEN) {
    return NextResponse.json(
      { error: 'X API credentials not configured' },
      { status: 500 }
    );
  }

  try {
    const params = new URLSearchParams({
      query: query,
      max_results: '20',
      'tweet.fields': 'created_at,author_id,public_metrics,text',
      'expansions': 'author_id',
      'user.fields': 'name,username,profile_image_url'
    });

    const response = await fetch(
      `https://api.x.com/2/tweets/search/recent?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${BEARER_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || 'Failed to fetch tweets' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch tweets' },
      { status: 500 }
    );
  }
}
