'use client';

import { useState, useEffect } from 'react';
import { useQueries } from '@tanstack/react-query';

export default function Home() {
  const [buckets, setBuckets] = useState([]);
  const [selectedBucket, setSelectedBucket] = useState(null);
  const [newBucketName, setNewBucketName] = useState('');
  const [newQuery, setNewQuery] = useState('');
  const [showAddBucket, setShowAddBucket] = useState(false);

  // Load buckets from server on mount
  useEffect(() => {
    fetch('/api/buckets')
      .then(res => res.json())
      .then(data => setBuckets(data))
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

  // Fetch tweets for all queries in selected bucket
  const queries = selectedBucket
    ? selectedBucket.queries.map((query) => ({
        queryKey: ['tweets', query],
        queryFn: async () => {
          const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
          if (!res.ok) throw new Error('Failed to fetch');
          return res.json();
        },
        enabled: !!selectedBucket,
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
    setBuckets(
      buckets.map((b) =>
        b.id === selectedBucket.id
          ? { ...b, queries: [...b.queries, newQuery] }
          : b
      )
    );
    setSelectedBucket({
      ...selectedBucket,
      queries: [...selectedBucket.queries, newQuery],
    });
    setNewQuery('');
  };

  // Remove query from bucket
  const removeQuery = (query) => {
    setBuckets(
      buckets.map((b) =>
        b.id === selectedBucket.id
          ? { ...b, queries: b.queries.filter((q) => q !== query) }
          : b
      )
    );
    setSelectedBucket({
      ...selectedBucket,
      queries: selectedBucket.queries.filter((q) => q !== query),
    });
  };

  // Delete bucket
  const deleteBucket = (id) => {
    setBuckets(buckets.filter((b) => b.id !== id));
    if (selectedBucket?.id === id) setSelectedBucket(null);
  };

  // Combine all tweets from all queries
  const allTweets = results
    .filter((r) => r.isSuccess && r.data?.data)
    .flatMap((r) => r.data.data.map(tweet => ({
      ...tweet,
      author: r.data.includes?.users?.find(u => u.id === tweet.author_id)
    })));

  const isLoading = results.some((r) => r.isLoading);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">X Post Viewer</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar: Bucket Management */}
          <div className="md:col-span-1 bg-white rounded-lg p-4 shadow h-fit">
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
                    placeholder="Add query (e.g., from:elonmusk)"
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
                      <span className="text-sm">{query}</span>
                      <button
                        onClick={() => removeQuery(query)}
                        className="text-red-500 hover:text-red-700"
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
                </h2>

                {isLoading && (
                  <div className="text-center py-8 text-gray-500">
                    Loading tweets...
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
                            <span className="text-gray-500 text-sm">
                              @{tweet.author?.username || 'unknown'}
                            </span>
                          </div>
                          <p className="text-gray-800 mb-2">{tweet.text}</p>
                          <div className="flex gap-4 text-sm text-gray-500">
                            <span>❤️ {tweet.public_metrics?.like_count || 0}</span>
                            <span>🔁 {tweet.public_metrics?.retweet_count || 0}</span>
                            <span>💬 {tweet.public_metrics?.reply_count || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {!isLoading && allTweets.length === 0 && selectedBucket.queries.length > 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No tweets found
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
