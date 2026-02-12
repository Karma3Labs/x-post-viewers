import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const BUCKETS_FILE = path.join(process.cwd(), 'data', 'buckets.json');

async function readBuckets() {
  try {
    const data = await fs.readFile(BUCKETS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty array
    return [];
  }
}

async function writeBuckets(buckets) {
  await fs.writeFile(BUCKETS_FILE, JSON.stringify(buckets, null, 2));
}

// GET - Fetch all buckets
export async function GET() {
  try {
    const buckets = await readBuckets();
    return NextResponse.json(buckets);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to read buckets' },
      { status: 500 }
    );
  }
}

// POST - Save all buckets
export async function POST(request) {
  try {
    const buckets = await request.json();
    await writeBuckets(buckets);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save buckets' },
      { status: 500 }
    );
  }
}
