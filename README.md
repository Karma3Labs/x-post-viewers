# X Post Viewer

A simple Next.js app for viewing Twitter/X posts based on search queries organized in buckets.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file with your X API credentials:
```bash
cp .env.local.example .env.local
```

3. Add your X Bearer Token to `.env.local`:
```
X_BEARER_TOKEN=your_actual_bearer_token
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## How to Use

### 1. Create Buckets
- Click "+ New Bucket" in the sidebar
- Give it a name (e.g., "Tech News", "Sports Updates")
- Buckets are collections of search queries

### 2. Add Queries to Buckets
- Select a bucket from the sidebar
- Add search queries using X API query syntax
- Examples:
  - `from:elonmusk` - tweets from a specific user
  - `#ai` - tweets with a hashtag
  - `bitcoin lang:en` - tweets containing "bitcoin" in English
  - `from:nasa OR from:spacex` - tweets from multiple users

### 3. View Posts
- Posts from all queries in the selected bucket will be fetched and displayed
- Switch between buckets to see different sets of posts
- Each bucket independently manages its own queries

## X API Query Syntax

Refer to the [X API documentation](https://docs.x.com/x-api/posts/search-all-posts) for query syntax.

Common operators:
- `from:username` - posts from a specific user
- `to:username` - replies to a user
- `#hashtag` - posts with a hashtag
- `"exact phrase"` - posts with exact phrase
- `keyword1 OR keyword2` - posts with either keyword
- `keyword1 -keyword2` - posts with keyword1 but not keyword2
- `lang:en` - posts in English

## Features

- 📦 Organize queries into buckets
- 🔍 Multiple queries per bucket
- 📊 Fetch from all queries in parallel
- 💾 LocalStorage persistence
- 🎨 Simple, clean UI
- ⚡ Fast with TanStack Query

## Tech Stack

- Next.js 15 (App Router)
- TanStack Query (React Query)
- Tailwind CSS
- X API v2
