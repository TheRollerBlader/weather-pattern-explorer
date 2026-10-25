import { CityLocation } from '../types/weather';

export const SAMPLE_CITIES: CityLocation[] = [
  {
    id: 'nyc',
    name: 'New York',
    country: 'United States',
    countryCode: 'US',
    latitude: 40.7128,
    longitude: -74.006,
    elevation: 10,
    timezone: 'America/New_York',
    admin1: 'New York'
  },
  {
    id: 'london',
    name: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    latitude: 51.5074,
    longitude: -0.1278,
    elevation: 25,
    timezone: 'Europe/London',
    admin1: 'England'
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    latitude: 35.6762,
    longitude: 139.6503,
    elevation: 40,
    timezone: 'Asia/Tokyo',
    admin1: 'Tokyo'
  },
  {
    id: 'sydney',
    name: 'Sydney',
    country: 'Australia',
    countryCode: 'AU',
    latitude: -33.8688,
    longitude: 151.2093,
    elevation: 19,
    timezone: 'Australia/Sydney',
    admin1: 'New South Wales'
  },
  {
    id: 'nairobi',
    name: 'Nairobi',
    country: 'Kenya',
    countryCode: 'KE',
    latitude: -1.2921,
    longitude: 36.8219,
    elevation: 1795,
    timezone: 'Africa/Nairobi',
    admin1: 'Nairobi'
  },
  {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    countryCode: 'FR',
    latitude: 48.8566,
    longitude: 2.3522,
    elevation: 35,
    timezone: 'Europe/Paris',
    admin1: 'Île-de-France'
  },
  {
    id: 'cairo',
    name: 'Cairo',
    country: 'Egypt',
    countryCode: 'EG',
    latitude: 30.0444,
    longitude: 31.2357,
    elevation: 23,
    timezone: 'Africa/Cairo',
    admin1: 'Cairo'
  },
  {
    id: 'reykjavik',
    name: 'Reykjavik',
    country: 'Iceland',
    countryCode: 'IS',
    latitude: 64.1466,
    longitude: -21.9426,
    elevation: 15,
    timezone: 'Atlantic/Reykjavik',
    admin1: 'Capital Region'
  }
];
