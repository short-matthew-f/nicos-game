// What each building offers at its door. Data only: edit freely as Nico's ideas change.
export interface MenuItem { id: string; label: string; price: number; boost: number }   // boost: seconds of speedy walking
export interface Place { building: string; title: string; text: string; menu?: MenuItem[]; action?: string }

export const BOOST = { speed: 1.35, max: 180 };   // walk-speed multiplier while full of lunch; cap in s

export const PLACES: Place[] = [
  { building: 'burger', title: 'Burger Barn', action: 'Go in', text: 'What can I get you?', menu: [   // (you go inside to order: world/rooms.ts)
    { id: 'burger', label: '🍔 Burger', price: 5, boost: 90 },
    { id: 'fries', label: '🍟 Fries', price: 3, boost: 40 },
    { id: 'shake', label: '🥤 Milkshake', price: 4, boost: 60 },
  ] },
  { building: 'icecream', title: 'Ice Cream', action: 'Get ice cream', text: 'Twelve flavours! What would you like?', menu: [
    { id: 'cone', label: '🍦 Cone', price: 2, boost: 30 },
    { id: 'sundae', label: '🍨 Sundae', price: 4, boost: 70 },
    { id: 'float', label: '🥤 Root beer float', price: 3, boost: 50 },
  ] },
  { building: 'school', title: 'School', text: "School's out for the summer. The janitor waves at you from the hallway." },
  { building: 'hospital', title: 'Hospital', text: 'The nurse at the desk smiles. "Hope we don\'t see you in here for a while!"' },
  { building: 'home', title: "Nico's house", text: 'Home sweet home. Mom left a note: "Be back by dinner!"' },
  { building: 'garage', title: 'Garage', text: 'Your garage.' },   // (the workbench card is in main.ts)
  { building: 'fire', title: 'Fire Station', text: 'The firefighters are polishing the truck. When the alarm rings, it races out!' },
  { building: 'parts', title: 'Parts & Tools', action: 'Shop', text: 'Wheels, axles, bodies and tools.' },
  { building: 'toys', title: 'Toy Shop', text: 'Shelves and shelves of toys. One day, yours could be on them.' },
  { building: 'barn', title: 'The farm', text: 'The farmer waves from the hay loft. "Mind the chickens, they\'re in charge here!"' },
  { building: 'poolhouse', title: 'Pool', text: 'The lifeguard says the pool opens very soon. "Bring your swimsuit!"' },
  { building: 'cabin', title: 'Ranger station', action: 'Visit the ranger', text: 'Maps, binoculars and a big book of animals.' },
  { building: 'storage', title: 'Storage Units', action: 'Auction', text: 'Storage unit auctions.' },
];

/** Buy an item if there's enough money: the new money and boost, or null. */
export function buy(money: number, boost: number, item: MenuItem): { money: number; boost: number } | null {
  if (item.price > money) return null;
  return { money: money - item.price, boost: Math.min(BOOST.max, boost + item.boost) };
}
