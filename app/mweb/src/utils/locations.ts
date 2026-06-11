// Reference list of cities and their common zones / neighbourhoods.
// Used as autocomplete suggestions; users may type their own (freeSolo).
export interface CityZones {
  city: string;
  zones: string[];
}

export const CITY_ZONES: CityZones[] = [
  {
    city: 'Bengaluru',
    zones: [
      'Indiranagar',
      'Koramangala',
      'Whitefield',
      'HSR Layout',
      'Jayanagar',
      'JP Nagar',
      'BTM Layout',
      'Marathahalli',
      'Electronic City',
      'Hebbal',
      'Banashankari',
      'Malleshwaram',
      'Bellandur',
      'Sarjapur Road',
      'Yelahanka',
    ],
  },
  {
    city: 'Mumbai',
    zones: [
      'Andheri',
      'Bandra',
      'Powai',
      'Juhu',
      'Worli',
      'Lower Parel',
      'Dadar',
      'Goregaon',
      'Malad',
      'Borivali',
      'Thane',
      'Navi Mumbai',
      'Colaba',
      'Versova',
    ],
  },
  {
    city: 'Delhi',
    zones: [
      'Connaught Place',
      'Saket',
      'Hauz Khas',
      'Greater Kailash',
      'Vasant Kunj',
      'Karol Bagh',
      'Dwarka',
      'Rohini',
      'Janakpuri',
      'Lajpat Nagar',
      'Defence Colony',
      'Chanakyapuri',
    ],
  },
  {
    city: 'Gurugram',
    zones: [
      'Cyber City',
      'Golf Course Road',
      'MG Road',
      'Sohna Road',
      'Sector 14',
      'Sector 29',
      'Sector 56',
      'DLF Phase 1',
      'DLF Phase 2',
      'DLF Phase 3',
      'DLF Phase 5',
    ],
  },
  {
    city: 'Noida',
    zones: [
      'Sector 18',
      'Sector 62',
      'Sector 137',
      'Greater Noida',
      'Noida Extension',
      'Sector 50',
      'Sector 78',
    ],
  },
  {
    city: 'Hyderabad',
    zones: [
      'Banjara Hills',
      'Jubilee Hills',
      'Gachibowli',
      'HITEC City',
      'Madhapur',
      'Kondapur',
      'Kukatpally',
      'Begumpet',
      'Secunderabad',
      'Ameerpet',
    ],
  },
  {
    city: 'Pune',
    zones: [
      'Koregaon Park',
      'Viman Nagar',
      'Hinjewadi',
      'Baner',
      'Aundh',
      'Wakad',
      'Kothrud',
      'Hadapsar',
      'Magarpatta',
      'Kharadi',
      'Camp',
    ],
  },
  {
    city: 'Chennai',
    zones: [
      'T. Nagar',
      'Anna Nagar',
      'Velachery',
      'OMR',
      'Adyar',
      'Nungambakkam',
      'Mylapore',
      'Besant Nagar',
      'Tambaram',
      'Porur',
    ],
  },
  {
    city: 'Kolkata',
    zones: [
      'Park Street',
      'Salt Lake',
      'New Town',
      'Ballygunge',
      'Howrah',
      'Alipore',
      'Esplanade',
      'Behala',
      'Tollygunge',
    ],
  },
  {
    city: 'Ahmedabad',
    zones: [
      'Satellite',
      'Bodakdev',
      'SG Highway',
      'Navrangpura',
      'Vastrapur',
      'Maninagar',
      'Bopal',
      'Gota',
    ],
  },
  {
    city: 'Jaipur',
    zones: [
      'C-Scheme',
      'Malviya Nagar',
      'Vaishali Nagar',
      'Mansarovar',
      'Jagatpura',
      'Tonk Road',
    ],
  },
];

export const CITY_NAMES: string[] = CITY_ZONES.map((c) => c.city);

export const zonesForCity = (city: string | undefined | null): string[] => {
  if (!city) return [];
  const match = CITY_ZONES.find(
    (c) => c.city.toLowerCase() === city.toLowerCase()
  );
  return match?.zones ?? [];
};
