// One shared pool of hotel photography. Backend photos win when present.
export const HOTEL_IMGS = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=80',
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=900&q=80',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=900&q=80',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=900&q=80',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=900&q=80',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=900&q=80',
];

export const hotelImage = (id: number, photos?: string[]) =>
  photos?.[0] ?? HOTEL_IMGS[Math.abs(id) % HOTEL_IMGS.length];

export const CITIES = [
  { name: 'Goa',       img: HOTEL_IMGS[3] },
  { name: 'Mumbai',    img: HOTEL_IMGS[0] },
  { name: 'Delhi',     img: HOTEL_IMGS[2] },
  { name: 'Bangalore', img: HOTEL_IMGS[4] },
];
