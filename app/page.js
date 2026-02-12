'use client';

import { useState, useEffect } from 'react';
import { useQueries } from '@tanstack/react-query';

export default function Home() {
  const [buckets, setBuckets] = useState([]);
  const [selectedBucket, setSelectedBucket] = useState(null);
  const [currentBucketId, setCurrentBucketId] = useState(null);
  const [isChangingBucket, setIsChangingBucket] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const [newQuery, setNewQuery] = useState('');
  const [showAddBucket, setShowAddBucket] = useState(false);
  const [showSyntaxHelper, setShowSyntaxHelper] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minLikes, setMinLikes] = useState(0);
  const [minRetweets, setMinRetweets] = useState(0);

  // Handle bucket change with cleanup
  useEffect(() => {
    if (selectedBucket && selectedBucket.id !== currentBucketId) {
      console.log('🔄 Bucket changed:', currentBucketId, '→', selectedBucket.id);
      setIsChangingBucket(true);
      setCurrentBucketId(selectedBucket.id);

      // Small delay to ensure old queries are cleared
      const timer = setTimeout(() => {
        setIsChangingBucket(false);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [selectedBucket, currentBucketId]);

  // Load buckets from server on mount
  useEffect(() => {
    fetch('/api/buckets')
      .then(res => res.json())
      .then(data => {
        setBuckets(data);
        // Auto-select first bucket if available
        if (data.length > 0) setSelectedBucket(data[0]);
      })
      .catch(err => console.error('Failed to load buckets:', err));
  }, []);

  // Save buckets to server whenever they change
  useEffect(() => {
    if (buckets.length >= 0) {
      fetch('/api/buckets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buckets),
      }).catch(err => console.error('Failed to save buckets:', err));
    }
  }, [buckets]);

  // Build API URL with filters
  const buildApiUrl = (query) => {
    const params = new URLSearchParams({ query });
    if (startDate) params.append('start_time', new Date(startDate).toISOString());
    if (endDate) params.append('end_time', new Date(endDate).toISOString());
    return `/api/search?${params}`;
  };

  // Fetch tweets for all queries in selected bucket
  // Only create queries when we're not changing buckets
  const queries = selectedBucket && !isChangingBucket && currentBucketId === selectedBucket.id
    ? selectedBucket.queries.map((query) => ({
        queryKey: ['tweets', currentBucketId, query, startDate, endDate],
        queryFn: async () => {
          console.log('📡 Fetching for bucket', currentBucketId, 'query:', query.substring(0, 50) + '...');
          const res = await fetch(buildApiUrl(query));
          if (!res.ok) throw new Error('Failed to fetch');
          return res.json();
        },
        enabled: true,
        staleTime: 0, // Always fetch fresh
        cacheTime: 1000 * 60 * 5, // Cache for 5 minutes
      }))
    : [];

  const results = useQueries({ queries });

  // Add new bucket
  const addBucket = () => {
    if (!newBucketName.trim()) return;
    const newBucket = {
      id: Date.now(),
      name: newBucketName,
      queries: [],
    };
    setBuckets([...buckets, newBucket]);
    setNewBucketName('');
    setShowAddBucket(false);
  };

  // Add query to selected bucket
  const addQueryToBucket = () => {
    if (!newQuery.trim() || !selectedBucket) return;
    const updatedBucket = {
      ...selectedBucket,
      queries: [...selectedBucket.queries, newQuery],
    };
    setBuckets(
      buckets.map((b) =>
        b.id === selectedBucket.id ? updatedBucket : b
      )
    );
    setSelectedBucket(updatedBucket);
    setNewQuery('');
  };

  // Remove query from bucket
  const removeQuery = (query) => {
    const updatedBucket = {
      ...selectedBucket,
      queries: selectedBucket.queries.filter((q) => q !== query),
    };
    setBuckets(
      buckets.map((b) =>
        b.id === selectedBucket.id ? updatedBucket : b
      )
    );
    setSelectedBucket(updatedBucket);
  };

  // Delete bucket
  const deleteBucket = (id) => {
    const newBuckets = buckets.filter((b) => b.id !== id);
    setBuckets(newBuckets);
    if (selectedBucket?.id === id) {
      setSelectedBucket(newBuckets.length > 0 ? newBuckets[0] : null);
    }
  };

  // Combine all tweets from all queries and apply client-side filters
  // Return empty array if we're changing buckets to clear old data
  const allTweets = isChangingBucket ? [] : results
    .filter((r) => r.isSuccess && r.data?.data)
    .flatMap((r) => r.data.data.map(tweet => ({
      ...tweet,
      author: r.data.includes?.users?.find(u => u.id === tweet.author_id)
    })))
    .filter(tweet => {
      const likes = tweet.public_metrics?.like_count || 0;
      const retweets = tweet.public_metrics?.retweet_count || 0;
      return likes >= minLikes && retweets >= minRetweets;
    })
    .sort((a, b) => {
      // Sort by engagement (likes + retweets)
      const aScore = (a.public_metrics?.like_count || 0) + (a.public_metrics?.retweet_count || 0);
      const bScore = (b.public_metrics?.like_count || 0) + (b.public_metrics?.retweet_count || 0);
      return bScore - aScore;
    });

  const isLoading = isChangingBucket || results.some((r) => r.isLoading);
  const hasErrors = results.some((r) => r.isError);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">X Post Viewer</h1>
          <button
            onClick={() => setShowSyntaxHelper(!showSyntaxHelper)}
            className="text-sm bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
          >
            {showSyntaxHelper ? 'Hide' : 'Show'} Query Syntax
          </button>
        </div>

        {/* Query Syntax Helper */}
        {showSyntaxHelper && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-2">Supported Query Operators</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <div><code>from:username</code> - from user</div>
              <div><code>to:username</code> - replies to user</div>
              <div><code>#hashtag</code> - has hashtag</div>
              <div><code>"exact phrase"</code> - exact match</div>
              <div><code>keyword OR other</code> - either word</div>
              <div><code>-word</code> - exclude word</div>
              <div><code>lang:en</code> - language</div>
              <div><code>is:retweet</code> - only retweets</div>
              <div><code>-is:retweet</code> - no retweets</div>
              <div><code>is:reply</code> - only replies</div>
              <div><code>is:quote</code> - quote tweets</div>
              <div><code>has:media</code> - has images/videos</div>
              <div><code>has:links</code> - has URLs</div>
              <div><code>has:hashtags</code> - has hashtags</div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              ⚠️ Note: min_faves, min_retweets, since/until are NOT API operators.
              Use date filters and engagement filters in the UI instead.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar: Bucket Management */}
          <div className="md:col-span-1 space-y-4">
            <div className="bg-white rounded-lg p-4 shadow">
              <h2 className="text-xl font-semibold mb-4">Buckets</h2>

              <div className="space-y-2 mb-4">
                {buckets.map((bucket) => (
                  <div
                    key={bucket.id}
                    className={`p-3 rounded cursor-pointer border ${
                      selectedBucket?.id === bucket.id
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedBucket(bucket)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{bucket.name}</div>
                        <div className="text-sm text-gray-500">
                          {bucket.queries.length} queries
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteBucket(bucket.id);
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {showAddBucket ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Bucket name"
                    value={newBucketName}
                    onChange={(e) => setNewBucketName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addBucket()}
                    className="w-full px-3 py-2 border rounded"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={addBucket}
                      className="flex-1 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddBucket(false);
                        setNewBucketName('');
                      }}
                      className="flex-1 bg-gray-300 px-3 py-1 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddBucket(true)}
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  + New Bucket
                </button>
              )}
            </div>

            {/* Filters */}
            {selectedBucket && (
              <div className="bg-white rounded-lg p-4 shadow">
                <h3 className="font-semibold mb-3">Filters</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2 py-1 border rounded text-sm"
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-2 py-1 border rounded text-sm"
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Min Likes: {minLikes}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1000"
                      step="10"
                      value={minLikes}
                      onChange={(e) => setMinLikes(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Min Retweets: {minRetweets}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="500"
                      step="5"
                      value={minRetweets}
                      onChange={(e) => setMinRetweets(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  {(startDate || endDate || minLikes > 0 || minRetweets > 0) && (
                    <button
                      onClick={() => {
                        setStartDate('');
                        setEndDate('');
                        setMinLikes(0);
                        setMinRetweets(0);
                      }}
                      className="w-full text-sm text-red-600 hover:text-red-800"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="md:col-span-3 space-y-6">
            {/* Query Management */}
            {selectedBucket && (
              <div className="bg-white rounded-lg p-4 shadow">
                <h2 className="text-xl font-semibold mb-4">
                  Queries in "{selectedBucket.name}"
                </h2>

                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Add query (e.g., from:elonmusk -is:retweet)"
                    value={newQuery}
                    onChange={(e) => setNewQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addQueryToBucket()}
                    className="flex-1 px-3 py-2 border rounded"
                  />
                  <button
                    onClick={addQueryToBucket}
                    className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
                  >
                    Add Query
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedBucket.queries.map((query, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-100 px-3 py-1 rounded-full flex items-center gap-2"
                    >
                      <span className="text-sm font-mono">{query}</span>
                      <button
                        onClick={() => removeQuery(query)}
                        className="text-red-500 hover:text-red-700 font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tweet Display */}
            {selectedBucket && (
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  Posts ({allTweets.length})
                  {(minLikes > 0 || minRetweets > 0) && (
                    <span className="text-sm text-gray-500 ml-2">
                      (filtered client-side)
                    </span>
                  )}
                </h2>

                {hasErrors && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-red-800 text-sm">
                      ⚠️ Some queries failed. Check your X_BEARER_TOKEN or query syntax.
                    </p>
                  </div>
                )}

                {isLoading && (
                  <div className="text-center py-8 text-gray-500">
                    Loading tweets from {selectedBucket.queries.length} queries...
                  </div>
                )}

                <div className="space-y-4">
                  {allTweets.map((tweet) => (
                    <div
                      key={tweet.id}
                      className="bg-white rounded-lg p-4 shadow hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        {tweet.author?.profile_image_url && (
                          <img
                            src={tweet.author.profile_image_url}
                            alt={tweet.author.name}
                            className="w-12 h-12 rounded-full"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold">
                              {tweet.author?.name || 'Unknown'}
                            </span>
                            {tweet.author?.verified && (
                              <span className="text-blue-500">✓</span>
                            )}
                            <span className="text-gray-500 text-sm">
                              @{tweet.author?.username || 'unknown'}
                            </span>
                          </div>
                          <p className="text-gray-800 mb-2 whitespace-pre-wrap">{tweet.text}</p>
                          <div className="flex gap-4 text-sm text-gray-500">
                            <span>❤️ {tweet.public_metrics?.like_count || 0}</span>
                            <span>🔁 {tweet.public_metrics?.retweet_count || 0}</span>
                            <span>💬 {tweet.public_metrics?.reply_count || 0}</span>
                            <span className="text-xs text-gray-400">
                              {new Date(tweet.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {!isLoading && allTweets.length === 0 && selectedBucket.queries.length > 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No tweets found matching your filters
                  </div>
                )}

                {selectedBucket.queries.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Add queries to this bucket to start fetching posts
                  </div>
                )}
              </div>
            )}

            {!selectedBucket && (
              <div className="bg-white rounded-lg p-8 shadow text-center text-gray-500">
                Select a bucket or create a new one to get started
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
