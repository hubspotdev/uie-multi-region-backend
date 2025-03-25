import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient, Collection } from 'mongodb';

interface Restaurant {
  location: string;
  postalCode: string;
  name?: string;
  cuisine?: string;
  createdAt: Date;
}

interface CreateRestaurantDto {
  location: string;
  postalCode: string;
  name?: string;
  cuisine?: string;
}

const COUNTRY_REGEX = /^[A-Za-z]{2}$/;
const POSTAL_CODE_REGEX = /^[A-Za-z0-9\s-]{2,10}$/;

// MongoDB connection management
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

const mongoOptions = {
  readPreference: 'nearest' as const,
  connectTimeoutMS: 10000, // 10 seconds
  socketTimeoutMS: 45000,  // 45 seconds
};

async function getMongoClient(): Promise<MongoClient> {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, mongoOptions);
    global._mongoClientPromise = client.connect()
      .catch(err => {
        console.error('MongoDB connection error:', err);
        throw err;
      });
  }
  return global._mongoClientPromise;
}

async function validateCreateRestaurantDto(data: any): Promise<CreateRestaurantDto> {
  if (!data.location || !data.postalCode) {
    throw new Error('Missing required fields: location and postalCode');
  }

  if (!COUNTRY_REGEX.test(data.location)) {
    throw new Error('Invalid location. Country code must be two letters');
  }

  if (!POSTAL_CODE_REGEX.test(data.postalCode)) {
    throw new Error('Invalid postal code format');
  }

  return {
    location: data.location.toUpperCase(),
    postalCode: data.postalCode,
    name: data.name?.trim(),
    cuisine: data.cuisine?.trim(),
  };
}

async function handleGetRestaurants(
  req: VercelRequest,
  res: VercelResponse,
  restaurantsColl: Collection<Restaurant>
) {
  const { location, postalCode } = req.query;

  if (!location || !COUNTRY_REGEX.test(String(location))) {
    return res.status(400).json({
      error: 'Invalid location. Must be a two-letter country code.'
    });
  }

  const query: { location: string; postalCode?: string } = {
    location: String(location).toUpperCase()
  };

  if (postalCode) {
    if (!POSTAL_CODE_REGEX.test(String(postalCode))) {
      return res.status(400).json({ error: 'Invalid postal code format' });
    }
    query.postalCode = String(postalCode);
  }

  const results = await restaurantsColl.find(query)
    .limit(100)  // Prevent large result sets
    .toArray();
  return res.status(200).json(results);
}

async function handleCreateRestaurant(
  req: VercelRequest,
  res: VercelResponse,
  restaurantsColl: Collection<Restaurant>
) {
  try {
    const validatedData = await validateCreateRestaurantDto(req.body);
    const restaurant: Restaurant = {
      ...validatedData,
      createdAt: new Date()
    };

    const insertResult = await restaurantsColl.insertOne(restaurant);
    return res.status(201).json({
      message: 'Restaurant created successfully',
      id: insertResult.insertedId
    });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : 'Invalid request data'
    });
  }
}

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const client = await getMongoClient();
    const db = client.db('restaurant_management');
    const restaurantsColl = db.collection<Restaurant>('restaurants');

    switch (req.method) {
      case 'GET':
        return handleGetRestaurants(req, res, restaurantsColl);
      case 'POST':
        return handleCreateRestaurant(req, res, restaurantsColl);
      default:
        return res.status(405).json({ error: 'Method not allowed. Use GET or POST.' });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      requestId: req.headers['x-request-id'] || 'unknown'
    });
  }
}
