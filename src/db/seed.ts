import type { Database } from "./database";
import { addDays, eachNight, nightsBetween, nowIso, todayISO } from "@/lib/date";
import { computeQuote } from "@/lib/money";
import { hashPassword } from "@/lib/password";
import { newId } from "@/lib/ids";

/**
 * Demo seed. Idempotent: guarded by the `seeded_at` row in app_meta.
 * Dates are generated relative to "today" so the marketplace always looks live.
 */

const DEMO_PASSWORD = "password123";

type PropertySeed = {
  id: string;
  ownerId: string;
  title: string;
  city: string;
  state: string;
  neighborhood: string;
  type: string;
  lat: number;
  lng: number;
  price: number;
  cleaning: number;
  guests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  rating: number;
  reviews: number;
  featured: boolean;
  scene: string;
  description: string;
  amenities: string[];
  rules: { min: number; max: number; policy: "flexible" | "moderate" | "strict"; note: string };
  status?: "draft" | "pending" | "published" | "rejected";
  views: number;
};

const AMENITIES: { id: string; name: string; icon: string }[] = [
  { id: "amn_wifi", name: "Fast Wi-Fi", icon: "wifi" },
  { id: "amn_pool", name: "Private pool", icon: "pool" },
  { id: "amn_kitchen", name: "Full kitchen", icon: "kitchen" },
  { id: "amn_ac", name: "Air conditioning", icon: "ac" },
  { id: "amn_parking", name: "Free parking", icon: "parking" },
  { id: "amn_workspace", name: "Dedicated workspace", icon: "workspace" },
  { id: "amn_breakfast", name: "Breakfast included", icon: "breakfast" },
  { id: "amn_beach", name: "Beach access", icon: "beach" },
  { id: "amn_view", name: "Scenic view", icon: "mountain" },
  { id: "amn_fireplace", name: "Fireplace", icon: "fireplace" },
  { id: "amn_pets", name: "Pets welcome", icon: "pet" },
  { id: "amn_tv", name: "Smart TV", icon: "tv" },
  { id: "amn_washer", name: "Washer & dryer", icon: "washer" },
  { id: "amn_garden", name: "Garden", icon: "garden" },
  { id: "amn_bonfire", name: "Bonfire pit", icon: "bonfire" },
  { id: "amn_gym", name: "Gym access", icon: "gym" },
  { id: "amn_power", name: "Power backup", icon: "power" },
  { id: "amn_hotwater", name: "Hot water", icon: "water" },
];

const OWNERS = [
  {
    id: "usr_arjun",
    email: "arjun@nivas.test",
    name: "Arjun Mehta",
    business: "Mehta Stays",
    color: "#234A3D",
    phone: "+91 98200 11223",
    bio: "Third-generation host from Goa. I restore old Portuguese houses and run them with a small local team.",
  },
  {
    id: "usr_priya",
    email: "priya@nivas.test",
    name: "Priya Nair",
    business: "Nair Escapes",
    color: "#B0602F",
    phone: "+91 98470 55221",
    bio: "Architect turned host. I look after a handful of coastal homes across Kerala.",
  },
  {
    id: "usr_rohan",
    email: "rohan@nivas.test",
    name: "Rohan Kapoor",
    business: "Kapoor Homes",
    color: "#3C5A7A",
    phone: "+91 98190 77112",
    bio: "City apartments for people who want to live like locals, not tourists.",
  },
  {
    id: "usr_meera",
    email: "meera@nivas.test",
    name: "Meera Iyer",
    business: "Iyer Heritage",
    color: "#7A4A63",
    phone: "+91 99280 33445",
    bio: "Custodian of two havelis and a mountain cabin. Heritage is a responsibility, not a theme.",
  },
];

const GUESTS = [
  { id: "usr_kavya", email: "kavya@nivas.test", name: "Kavya Sharma", color: "#8A5A3B", phone: "+91 98100 44556" },
  { id: "usr_dev", email: "dev@nivas.test", name: "Dev Patel", color: "#2F5D50", phone: "+91 98250 99110" },
  { id: "usr_sara", email: "sara@nivas.test", name: "Sara Khan", color: "#9C5B45", phone: "+91 98330 77664" },
  { id: "usr_vikram", email: "vikram@nivas.test", name: "Vikram Singh", color: "#3E4C59", phone: "+91 99990 12233" },
];

const PROPERTIES: PropertySeed[] = [
  {
    id: "prp_siolim",
    ownerId: "usr_arjun",
    title: "Villa Siolim",
    city: "Goa",
    state: "Goa",
    neighborhood: "Siolim",
    type: "villa",
    lat: 15.6122,
    lng: 73.7689,
    price: 1450000,
    cleaning: 120000,
    guests: 6,
    bedrooms: 3,
    beds: 4,
    baths: 3,
    rating: 4.94,
    reviews: 128,
    featured: true,
    scene: "villa",
    views: 982,
    description:
      "A laterite-and-lime villa tucked behind a lane of coconut palms in north Goa. The house opens entirely to a central courtyard, with a 12-metre pool that catches the last light of the day.\n\nWe restored it over three years with local masons, keeping the original oyster-shell windows and adding only what a modern stay needs: good water pressure, quiet air conditioning and a kitchen you will actually want to cook in.\n\nIt is a five-minute drive from Siolim bridge, twelve minutes from Anjuna, and far enough from the beach road that you only hear frogs at night.",
    amenities: ["amn_pool", "amn_wifi", "amn_kitchen", "amn_ac", "amn_parking", "amn_workspace", "amn_garden", "amn_power"],
    rules: { min: 2, max: 21, policy: "moderate", note: "No parties. Quiet hours after 10 pm." },
  },
  {
    id: "prp_palm",
    ownerId: "usr_arjun",
    title: "The Palm House",
    city: "Goa",
    state: "Goa",
    neighborhood: "Anjuna",
    type: "villa",
    lat: 15.5735,
    lng: 73.7406,
    price: 980000,
    cleaning: 90000,
    guests: 4,
    bedrooms: 2,
    beds: 3,
    baths: 2,
    rating: 4.88,
    reviews: 96,
    featured: true,
    scene: "beach",
    views: 761,
    description:
      "A two-bedroom whitewashed house set in a working coconut grove, ten minutes on foot from Anjuna's quieter northern stretch. The veranda runs the length of the house and is where most guests end up spending the afternoon.\n\nThe kitchen is small but complete, the beds are firm, and there is a outdoor shower under the frangipani. We keep two bicycles for guests.\n\nAnjuna flea market is a short ride away on Wednesdays. The rest of the week the lane is almost silent.",
    amenities: ["amn_wifi", "amn_kitchen", "amn_ac", "amn_beach", "amn_parking", "amn_garden", "amn_pets", "amn_hotwater"],
    rules: { min: 2, max: 14, policy: "flexible", note: "Pets welcome on request." },
  },
  {
    id: "prp_haveli",
    ownerId: "usr_meera",
    title: "Amrapali Haveli",
    city: "Jaipur",
    state: "Rajasthan",
    neighborhood: "Old City",
    type: "heritage",
    lat: 26.9239,
    lng: 75.8267,
    price: 720000,
    cleaning: 70000,
    guests: 8,
    bedrooms: 4,
    beds: 5,
    baths: 4,
    rating: 4.96,
    reviews: 174,
    featured: true,
    scene: "haveli",
    views: 1204,
    description:
      "An 1890s haveli inside the old city walls, restored with the same sandstone from the original quarry. Four bedrooms open onto a courtyard with a marble fountain; the roof terrace looks straight at Nahargarh Fort.\n\nBreakfast is served on the terrace — poha, kachori, seasonal fruit and filter coffee. Our caretaker Ram Singh has been with the family for thirty years and will arrange a guide if you want one.\n\nThe lanes around the house are best explored on foot. Leave the car at the gate; everything worth seeing is within twenty minutes.",
    amenities: ["amn_breakfast", "amn_wifi", "amn_ac", "amn_view", "amn_workspace", "amn_power", "amn_hotwater", "amn_tv"],
    rules: { min: 2, max: 30, policy: "moderate", note: "Smoking only on the terrace." },
  },
  {
    id: "prp_cedar",
    ownerId: "usr_meera",
    title: "Cedar & Cloud",
    city: "Manali",
    state: "Himachal Pradesh",
    neighborhood: "Naggar Road",
    type: "cabin",
    lat: 32.2432,
    lng: 77.1892,
    price: 560000,
    cleaning: 50000,
    guests: 4,
    bedrooms: 2,
    beds: 3,
    baths: 2,
    rating: 4.91,
    reviews: 87,
    featured: false,
    scene: "cabin",
    views: 623,
    description:
      "A cedar-shingled cabin built into a slope above the Beas, with deodar forest on three sides and a view of the Pir Panjal range from the deck. The wood stove keeps the living room warm through the evening.\n\nThere are two bedrooms, both with wool quilts and electric blankets, and a small kitchen stocked with tea, honey and local rajma for your first night.\n\nThe road to Naggar is steep but paved. In winter we recommend a four-wheel drive.",
    amenities: ["amn_fireplace", "amn_view", "amn_wifi", "amn_kitchen", "amn_parking", "amn_bonfire", "amn_hotwater", "amn_pets"],
    rules: { min: 2, max: 10, policy: "strict", note: "No shoes indoors. Bonfire only in the pit." },
  },
  {
    id: "prp_kadal",
    ownerId: "usr_priya",
    title: "Kadal Beach House",
    city: "Varkala",
    state: "Kerala",
    neighborhood: "Papanasam",
    type: "beach house",
    lat: 8.7379,
    lng: 76.7163,
    price: 1120000,
    cleaning: 100000,
    guests: 6,
    bedrooms: 3,
    beds: 4,
    baths: 3,
    rating: 4.93,
    reviews: 143,
    featured: true,
    scene: "beach",
    views: 894,
    description:
      "Perched on the red laterite cliff at Varkala, Kadal has an unbroken line of sight to the Arabian Sea. Three bedrooms, a long veranda, and a plunge pool that seems to spill into the horizon.\n\nWe built it with a local architect using lime plaster and reclaimed teak. The windows are deliberately large — you will wake up to the sea whether you plan to or not.\n\nSteps lead down to the beach; the cliff path with its cafes is a two-minute walk in the other direction.",
    amenities: ["amn_beach", "amn_pool", "amn_wifi", "amn_kitchen", "amn_ac", "amn_breakfast", "amn_view", "amn_hotwater"],
    rules: { min: 3, max: 21, policy: "moderate", note: "Children must be supervised near the cliff edge." },
  },
  {
    id: "prp_indiranagar",
    ownerId: "usr_rohan",
    title: "Indiranagar Loft",
    city: "Bengaluru",
    state: "Karnataka",
    neighborhood: "Indiranagar",
    type: "apartment",
    lat: 12.9719,
    lng: 77.6412,
    price: 430000,
    cleaning: 40000,
    guests: 3,
    bedrooms: 1,
    beds: 2,
    baths: 1,
    rating: 4.79,
    reviews: 68,
    featured: false,
    scene: "apartment",
    views: 512,
    description:
      "A top-floor loft on a quiet residential street, five minutes from 100 Feet Road. Double-height windows, a mezzanine bedroom and a desk that faces the rain tree outside.\n\nThe building has a lift, backup power and secure parking. The kitchen is compact but has everything for a long stay, including a proper coffee setup.\n\nThis is a residential lane — please keep late-night noise indoors.",
    amenities: ["amn_wifi", "amn_workspace", "amn_ac", "amn_kitchen", "amn_washer", "amn_parking", "amn_gym", "amn_power"],
    rules: { min: 2, max: 60, policy: "flexible", note: "No guests beyond those booked." },
  },
  {
    id: "prp_brass",
    ownerId: "usr_rohan",
    title: "The Brass Suite",
    city: "Mumbai",
    state: "Maharashtra",
    neighborhood: "Kala Ghoda",
    type: "suite",
    lat: 18.9311,
    lng: 72.8318,
    price: 690000,
    cleaning: 60000,
    guests: 2,
    bedrooms: 1,
    beds: 1,
    baths: 1,
    rating: 4.87,
    reviews: 112,
    featured: false,
    scene: "suite",
    views: 688,
    description:
      "A single suite in a restored art-deco building behind Kala Ghoda, with arched windows, brass fittings and a bed you will not want to leave. Designed for two.\n\nThe room is serviced daily. Breakfast is a short walk away at any of three institutions we will point you to. The Jehangir Art Gallery and the waterfront are both under ten minutes on foot.\n\nExpect city noise. This is the middle of Bombay, and that is rather the point.",
    amenities: ["amn_wifi", "amn_ac", "amn_breakfast", "amn_tv", "amn_hotwater", "amn_workspace", "amn_power"],
    rules: { min: 1, max: 14, policy: "strict", note: "Adults only. No visitors after 9 pm." },
  },
  {
    id: "prp_kochi",
    ownerId: "usr_priya",
    title: "Fort Kochi Courtyard",
    city: "Kochi",
    state: "Kerala",
    neighborhood: "Fort Kochi",
    type: "heritage",
    lat: 9.9658,
    lng: 76.2422,
    price: 590000,
    cleaning: 55000,
    guests: 5,
    bedrooms: 2,
    beds: 3,
    baths: 2,
    rating: 4.84,
    reviews: 76,
    featured: false,
    scene: "haveli",
    views: 431,
    description:
      "A Dutch-era house on Princess Street with a private courtyard, jackfruit tree and rooms that stay cool without air conditioning for most of the year.\n\nTwo bedrooms, both with attached baths, a reading room and a kitchen that guests are welcome to use. We keep the original terracotta floor tiles polished with coconut oil.\n\nThe Chinese fishing nets, St Francis Church and the best fish curry in Kochi are all within a ten-minute radius.",
    amenities: ["amn_wifi", "amn_breakfast", "amn_kitchen", "amn_ac", "amn_garden", "amn_pets", "amn_hotwater", "amn_tv"],
    rules: { min: 2, max: 14, policy: "moderate", note: "Courtyard gate closes at 10 pm." },
  },
  {
    id: "prp_aravalli",
    ownerId: "usr_meera",
    title: "Aravalli Retreat",
    city: "Udaipur",
    state: "Rajasthan",
    neighborhood: "Badi Lake",
    type: "farmhouse",
    lat: 24.5854,
    lng: 73.7125,
    price: 1680000,
    cleaning: 150000,
    guests: 10,
    bedrooms: 5,
    beds: 6,
    baths: 5,
    rating: 4.97,
    reviews: 59,
    featured: true,
    scene: "villa",
    views: 1102,
    description:
      "A five-bedroom farmhouse on eight acres near Badi Lake, built around a 40-metre pool and a lawn that runs to the edge of the property. This is the house for a family reunion or a small celebration.\n\nThe kitchen is staffed if you want it — our cook makes a dal baati worth planning a trip around. Otherwise it is entirely yours.\n\nUdaipur city is twenty minutes away. The drive back at night, with the lake on one side and nothing on the other, is half the reason to stay here.",
    amenities: ["amn_pool", "amn_wifi", "amn_kitchen", "amn_ac", "amn_parking", "amn_breakfast", "amn_garden", "amn_bonfire", "amn_power", "amn_tv"],
    rules: { min: 3, max: 30, policy: "moderate", note: "Events by prior arrangement only." },
  },
  {
    id: "prp_bandra",
    ownerId: "usr_arjun",
    title: "Bandra Sea View",
    city: "Mumbai",
    state: "Maharashtra",
    neighborhood: "Bandra West",
    type: "apartment",
    lat: 19.0596,
    lng: 72.8295,
    price: 840000,
    cleaning: 80000,
    guests: 4,
    bedrooms: 2,
    beds: 2,
    baths: 2,
    rating: 4.82,
    reviews: 91,
    featured: false,
    scene: "suite",
    views: 645,
    description:
      "A fourteenth-floor apartment on Carter Road with windows full of the Arabian Sea. Two bedrooms, two baths and a balcony wide enough for breakfast for four.\n\nThe building is quiet, secure and has two lifts. The promenade below is where the city walks at sunset; you can be part of it in under a minute.\n\nWe keep the kitchen stocked with the basics and leave a list of our favourite Bandra places — none of them tourist traps.",
    amenities: ["amn_wifi", "amn_ac", "amn_kitchen", "amn_gym", "amn_parking", "amn_view", "amn_washer", "amn_power"],
    rules: { min: 2, max: 21, policy: "moderate", note: "Building rules require guest ID at security." },
  },
  {
    id: "prp_naldehra",
    ownerId: "usr_priya",
    title: "Naldehra Pines",
    city: "Shimla",
    state: "Himachal Pradesh",
    neighborhood: "Naldehra",
    type: "cabin",
    lat: 31.1048,
    lng: 77.1734,
    price: 490000,
    cleaning: 45000,
    guests: 3,
    bedrooms: 1,
    beds: 2,
    baths: 1,
    rating: 4.76,
    reviews: 42,
    featured: false,
    scene: "cabin",
    views: 318,
    description:
      "A one-bedroom pine cabin at the edge of the Naldehra golf course, with a wood stove, a deep window seat and very little else competing for your attention.\n\nIt is small on purpose. Two people, perhaps a third on the daybed. The kitchenette handles breakfast and tea; dinner is a ten-minute walk at the club or a short drive into Shimla.\n\nBring a book. The internet works, but you probably should not.",
    amenities: ["amn_fireplace", "amn_view", "amn_wifi", "amn_kitchen", "amn_parking", "amn_bonfire", "amn_hotwater"],
    rules: { min: 2, max: 7, policy: "strict", note: "No smoking indoors. Do not feed the monkeys." },
  },
  {
    id: "prp_colaba",
    ownerId: "usr_rohan",
    title: "Colaba Studio",
    city: "Mumbai",
    state: "Maharashtra",
    neighborhood: "Colaba Causeway",
    type: "studio",
    lat: 18.9156,
    lng: 72.8266,
    price: 380000,
    cleaning: 35000,
    guests: 2,
    bedrooms: 1,
    beds: 1,
    baths: 1,
    rating: 4.68,
    reviews: 37,
    featured: false,
    scene: "apartment",
    views: 287,
    description:
      "A compact, well-designed studio off Colaba Causeway — the most walkable address in Mumbai. Everything you need is within a ten-minute walk, including the Gateway of India.\n\nThe apartment is on the third floor of a heritage building with no lift, so pack light. Inside it is bright, quiet and recently redone, with a proper shower and a small desk.\n\nBest for solo travellers and couples who plan to be out all day.",
    amenities: ["amn_wifi", "amn_ac", "amn_kitchen", "amn_workspace", "amn_hotwater", "amn_tv", "amn_power"],
    rules: { min: 1, max: 10, policy: "flexible", note: "Third floor, no lift. No smoking." },
  },
  {
    id: "prp_sunset",
    ownerId: "usr_meera",
    title: "Sunset Ridge Cottage",
    city: "Lonavala",
    state: "Maharashtra",
    neighborhood: "Tungarli",
    type: "villa",
    lat: 18.7481,
    lng: 73.4072,
    price: 640000,
    cleaning: 60000,
    guests: 4,
    bedrooms: 2,
    beds: 2,
    baths: 2,
    rating: 0,
    reviews: 0,
    featured: false,
    scene: "cabin",
    views: 12,
    status: "pending",
    description:
      "A two-bedroom cottage on the Tungarli ridge with a valley-facing deck, a small pool and a garden full of birds. Twenty minutes from Lonavala station, far enough from the highway to hear them.\n\nNewly listed. Photographs are from the first week of November; the garden will be fuller by the monsoon.",
    amenities: ["amn_pool", "amn_wifi", "amn_kitchen", "amn_parking", "amn_garden", "amn_view", "amn_hotwater"],
    rules: { min: 2, max: 14, policy: "moderate", note: "No loud music after 9 pm." },
  },
  {
    id: "prp_draft",
    ownerId: "usr_rohan",
    title: "Whitefield Garden Flat",
    city: "Bengaluru",
    state: "Karnataka",
    neighborhood: "Whitefield",
    type: "apartment",
    lat: 12.9698,
    lng: 77.7500,
    price: 390000,
    cleaning: 40000,
    guests: 3,
    bedrooms: 1,
    beds: 2,
    baths: 1,
    rating: 0,
    reviews: 0,
    featured: false,
    scene: "apartment",
    views: 3,
    status: "draft",
    description:
      "A garden-facing one-bedroom flat in a gated community. Draft listing — owner is still adding photographs and finalising the amenities list.",
    amenities: ["amn_wifi", "amn_ac", "amn_kitchen", "amn_parking", "amn_gym"],
    rules: { min: 2, max: 30, policy: "moderate", note: "" },
  },
];

const REVIEW_TEXT = [
  {
    rating: 5,
    comment:
      "We came for four nights and stayed seven. The house is even better than the photographs — every detail has been thought about, from the water pressure to the beach towels. Arjun answered within minutes every time.",
    cleanliness: 5, accuracy: 5, communication: 5, location: 5, value: 5,
  },
  {
    rating: 5,
    comment:
      "An extraordinary stay. Breakfast on the terrace at sunrise, then a walk through the old city before the crowds. Ram Singh looked after us like family.",
    cleanliness: 5, accuracy: 5, communication: 5, location: 5, value: 4,
  },
  {
    rating: 4,
    comment:
      "Beautiful home in a great location. The kitchen is compact for cooking for four, but everything else was faultless. Would happily return.",
    cleanliness: 5, accuracy: 4, communication: 5, location: 5, value: 4,
  },
  {
    rating: 5,
    comment:
      "The photographs do not do the view justice. Waking up to the sea every morning was the highlight of our trip. Check-in was smooth and the pool was spotless.",
    cleanliness: 5, accuracy: 5, communication: 4, location: 5, value: 5,
  },
  {
    rating: 4,
    comment:
      "Very comfortable, thoughtfully designed and spotlessly clean. The lane is noisy during the day, which is simply Mumbai. Host was extremely responsive.",
    cleanliness: 5, accuracy: 5, communication: 5, location: 4, value: 4,
  },
  {
    rating: 5,
    comment:
      "We booked for a family reunion and it worked perfectly. Staff were helpful without ever intruding. The pool and the lawn kept the children busy all day.",
    cleanliness: 5, accuracy: 5, communication: 5, location: 4, value: 5,
  },
];

function isoAt(daysFromNow: number, hour = 10): string {
  const base = new Date(`${addDays(todayISO(), daysFromNow)}T00:00:00.000Z`);
  base.setUTCHours(hour, (Math.abs(daysFromNow) * 7) % 60, 0, 0);
  return base.toISOString();
}

async function insertRow(db: Database, table: string, row: Record<string, unknown>) {
  const keys = Object.keys(row);
  const sql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys
    .map(() => "?")
    .join(", ")})`;
  await db.prepare(sql).bind(...keys.map((key) => row[key])).run();
}

export async function seedDatabase(db: Database) {
  const marker = await db.prepare("SELECT value FROM app_meta WHERE key = 'seeded_at'").first<{ value: string }>();
  if (marker) return;

  await db.exec("BEGIN");
  try {
    const now = nowIso();
    const password = hashPassword(DEMO_PASSWORD);

    // ------------------------------------------------------------------ users
    await insertRow(db, "users", {
      id: "usr_admin",
      email: "admin@nivas.test",
      password_hash: password,
      full_name: "Ananya Rao",
      phone: "+91 90000 10000",
      avatar_color: "#3B3A36",
      status: "active",
      created_at: isoAt(-420),
      updated_at: now,
    });
    await insertRow(db, "user_roles", { user_id: "usr_admin", role: "admin" });
    await insertRow(db, "user_roles", { user_id: "usr_admin", role: "guest" });

    for (const owner of OWNERS) {
      await insertRow(db, "users", {
        id: owner.id,
        email: owner.email,
        password_hash: password,
        full_name: owner.name,
        phone: owner.phone,
        avatar_color: owner.color,
        status: "active",
        created_at: isoAt(-300, 9),
        updated_at: now,
      });
      await insertRow(db, "user_roles", { user_id: owner.id, role: "owner" });
      await insertRow(db, "user_roles", { user_id: owner.id, role: "guest" });
      await insertRow(db, "owner_profiles", {
        user_id: owner.id,
        business_name: owner.business,
        bio: owner.bio,
        verification_status: "verified",
        payout_last4: "4821",
        created_at: isoAt(-298, 9),
      });
      await insertRow(db, "guest_profiles", {
        user_id: owner.id,
        phone: owner.phone,
        profile_image: null,
        created_at: isoAt(-298, 9),
      });
    }

    for (const guest of GUESTS) {
      await insertRow(db, "users", {
        id: guest.id,
        email: guest.email,
        password_hash: password,
        full_name: guest.name,
        phone: guest.phone,
        avatar_color: guest.color,
        status: "active",
        created_at: isoAt(-180, 12),
        updated_at: now,
      });
      await insertRow(db, "user_roles", { user_id: guest.id, role: "guest" });
      await insertRow(db, "guest_profiles", {
        user_id: guest.id,
        phone: guest.phone,
        profile_image: null,
        created_at: isoAt(-180, 12),
      });
    }

    // ------------------------------------------------------------- amenities
    for (const amenity of AMENITIES) {
      await insertRow(db, "amenities", amenity);
    }

    // ------------------------------------------------------------ properties
    for (const property of PROPERTIES) {
      const status = property.status ?? "published";
      await insertRow(db, "properties", {
        id: property.id,
        owner_id: property.ownerId,
        slug: property.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        title: property.title,
        description: property.description,
        property_type: property.type,
        city: property.city,
        state: property.state,
        country: "India",
        neighborhood: property.neighborhood,
        latitude: property.lat,
        longitude: property.lng,
        nightly_price: property.price,
        cleaning_fee: property.cleaning,
        currency: "INR",
        max_guests: property.guests,
        bedrooms: property.bedrooms,
        beds: property.beds,
        bathrooms: property.baths,
        rating_avg: property.rating,
        rating_count: property.reviews,
        view_count: property.views,
        featured: property.featured ? 1 : 0,
        status,
        rejection_note: null,
        created_at: isoAt(-240 + Math.floor(Math.random() * 40)),
        updated_at: now,
      });

      const galleryLabels = [
        "Exterior",
        "Living room",
        "Bedroom",
        "Bathroom",
        "Kitchen",
      ];
      for (let i = 0; i < galleryLabels.length; i += 1) {
        await insertRow(db, "property_images", {
          id: newId("img"),
          property_id: property.id,
          r2_key: `seed/${property.scene}/${i + 1}`,
          url: null,
          alt: `${property.title} — ${galleryLabels[i]}`,
          position: i,
          created_at: now,
        });
      }

      for (const amenityId of property.amenities) {
        await insertRow(db, "property_amenities", {
          property_id: property.id,
          amenity_id: amenityId,
        });
      }

      await insertRow(db, "property_rules", {
        property_id: property.id,
        check_in_time: "14:00",
        check_out_time: "11:00",
        min_nights: property.rules.min,
        max_nights: property.rules.max,
        cancellation_policy: property.rules.policy,
        house_rules: property.rules.note || null,
      });
    }

    // -------------------------------------------------------------- bookings
    const propertyMap = new Map(PROPERTIES.map((p) => [p.id, p]));
    const usedNights = new Set<string>();
    let bookingCounter = 1000;
    let paymentCounter = 0;

    type BookingSpec = {
      id: string;
      propertyId: string;
      guestId: string;
      from: number;
      to: number;
      guests: number;
      status: "booked" | "completed" | "cancelled" | "expired";
      paid: boolean;
      refund?: number;
      createdFrom?: number;
    };

    const specs: BookingSpec[] = [
      { id: "bkg_siolim_kavya", propertyId: "prp_siolim", guestId: "usr_kavya", from: 7, to: 11, guests: 4, status: "booked", paid: true },
      { id: "bkg_palm_dev", propertyId: "prp_palm", guestId: "usr_dev", from: 2, to: 5, guests: 2, status: "booked", paid: true },
      { id: "bkg_haveli_sara", propertyId: "prp_haveli", guestId: "usr_sara", from: 19, to: 23, guests: 6, status: "booked", paid: true },
      { id: "bkg_cedar_kavya", propertyId: "prp_cedar", guestId: "usr_kavya", from: 37, to: 40, guests: 2, status: "booked", paid: true },
      { id: "bkg_kadal_sara", propertyId: "prp_kadal", guestId: "usr_sara", from: 45, to: 50, guests: 5, status: "booked", paid: true },
      { id: "bkg_loft_sara", propertyId: "prp_indiranagar", guestId: "usr_sara", from: 12, to: 14, guests: 2, status: "booked", paid: true },
      { id: "bkg_loft_vikram", propertyId: "prp_indiranagar", guestId: "usr_vikram", from: -34, to: -31, guests: 2, status: "completed", paid: true },
      { id: "bkg_brass_sara", propertyId: "prp_brass", guestId: "usr_sara", from: -45, to: -42, guests: 2, status: "completed", paid: true },
      { id: "bkg_bandra_dev", propertyId: "prp_bandra", guestId: "usr_dev", from: -20, to: -17, guests: 3, status: "completed", paid: true },
      { id: "bkg_aravalli_kavya", propertyId: "prp_aravalli", guestId: "usr_kavya", from: -70, to: -65, guests: 8, status: "completed", paid: true },
      { id: "bkg_naldehra_sara", propertyId: "prp_naldehra", guestId: "usr_sara", from: -12, to: -9, guests: 2, status: "completed", paid: true },
      { id: "bkg_kochi_dev", propertyId: "prp_kochi", guestId: "usr_dev", from: -5, to: -3, guests: 4, status: "completed", paid: true },
      { id: "bkg_colaba_kavya", propertyId: "prp_colaba", guestId: "usr_kavya", from: -2, to: -1, guests: 2, status: "completed", paid: true },
      { id: "bkg_kadal_dev_cancel", propertyId: "prp_kadal", guestId: "usr_dev", from: -6, to: -3, guests: 2, status: "cancelled", paid: true, refund: 1 },
      { id: "bkg_haveli_vikram_cancel", propertyId: "prp_haveli", guestId: "usr_vikram", from: 55, to: 58, guests: 4, status: "cancelled", paid: true, refund: 1 },
      { id: "bkg_palm_vikram_expired", propertyId: "prp_palm", guestId: "usr_vikram", from: 61, to: 63, guests: 2, status: "expired", paid: false },
    ];

    // historic completed stays that make the owner revenue charts meaningful
    const historic: Array<[string, string, number, number]> = [
      ["prp_siolim", "usr_sara", -96, 4],
      ["prp_kadal", "usr_kavya", -88, 5],
      ["prp_aravalli", "usr_dev", -80, 3],
      ["prp_haveli", "usr_dev", -61, 4],
      ["prp_bandra", "usr_sara", -55, 3],
      ["prp_brass", "usr_kavya", -49, 2],
      ["prp_palm", "usr_sara", -41, 3],
      ["prp_kochi", "usr_kavya", -39, 2],
      ["prp_indiranagar", "usr_dev", -28, 5],
      ["prp_cedar", "usr_vikram", -26, 3],
      ["prp_naldehra", "usr_kavya", -18, 2],
      ["prp_bandra", "usr_vikram", -15, 4],
    ];
    historic.forEach(([propertyId, guestId, start, nights], index) => {
      specs.push({
        id: `bkg_hist_${index + 1}`,
        propertyId,
        guestId,
        from: start,
        to: start + nights,
        guests: 2,
        status: "completed",
        paid: true,
      });
    });

    const completedByProperty = new Map<string, string[]>();

    for (const spec of specs) {
      const property = propertyMap.get(spec.propertyId)!;
      let checkIn = addDays(todayISO(), spec.from);
      let checkOut = addDays(todayISO(), spec.to);
      let attempts = 0;
      while (
        eachNight(checkIn, checkOut).some((night) => usedNights.has(`${spec.propertyId}:${night}`)) &&
        attempts < 40
      ) {
        checkIn = addDays(checkIn, 3);
        checkOut = addDays(checkOut, 3);
        attempts += 1;
      }
      const nights = Math.max(1, nightsBetween(checkIn, checkOut));
      const quote = computeQuote({
        nightlyPrice: property.price,
        cleaningFee: property.cleaning,
        nights,
      });

      bookingCounter += 1;
      const createdAt = isoAt(Math.min(spec.from - 6, -1), 11);
      const status = spec.status;
      const paymentStatus =
        status === "cancelled" ? "refunded" : spec.paid ? "paid" : "unpaid";

      await insertRow(db, "bookings", {
        id: spec.id,
        code: `NVS-${bookingCounter}`,
        property_id: spec.propertyId,
        guest_id: spec.guestId,
        check_in: checkIn,
        check_out: checkOut,
        nights,
        guests: Math.min(spec.guests, property.guests),
        nightly_price: property.price,
        subtotal: quote.subtotal,
        cleaning_fee: quote.cleaningFee,
        service_fee: quote.serviceFee,
        tax_amount: quote.taxAmount,
        total_amount: quote.total,
        currency: "INR",
        status,
        payment_status: paymentStatus,
        hold_expires_at: status === "expired" ? isoAt(spec.from - 1, 9) : null,
        cancelled_at: status === "cancelled" ? isoAt(spec.from - 3, 15) : null,
        cancellation_reason: status === "cancelled" ? "Cancelled by guest" : null,
        created_at: createdAt,
        updated_at: now,
      });
      if (status !== "expired") {
        for (const night of eachNight(checkIn, checkOut)) {
          usedNights.add(`${spec.propertyId}:${night}`);
          await insertRow(db, "booking_nights", {
            property_id: spec.propertyId,
            stay_date: night,
            booking_id: spec.id,
          });
        }
      }

      if (spec.paid) {
        paymentCounter += 1;
        const paymentId = `pay_seed_${paymentCounter}`;
        await insertRow(db, "payments", {
          id: paymentId,
          booking_id: spec.id,
          provider: "razorpay",
          provider_order_id: `order_seed_${paymentCounter}`,
          provider_payment_id: `pay_seed_gw_${paymentCounter}`,
          amount: quote.total,
          currency: "INR",
          status: status === "cancelled" ? "refunded" : "paid",
          method: paymentCounter % 3 === 0 ? "upi" : "card",
          failure_reason: null,
          created_at: createdAt,
          updated_at: now,
        });

        if (spec.refund) {
          await insertRow(db, "refunds", {
            id: `rfd_seed_${paymentCounter}`,
            payment_id: paymentId,
            booking_id: spec.id,
            amount: quote.total,
            reason: "Guest cancelled before check-in",
            status: "completed",
            provider_refund_id: `rfnd_seed_${paymentCounter}`,
            created_at: isoAt(spec.from - 3, 16),
            updated_at: now,
          });
        }

        if (status !== "cancelled") {
          await insertRow(db, "commissions", {
            id: `com_seed_${paymentCounter}`,
            booking_id: spec.id,
            platform_fee: quote.platformFee,
            owner_amount: quote.ownerAmount,
            currency: "INR",
            created_at: createdAt,
          });
        }
      }

      if (status === "completed") {
        const list = completedByProperty.get(spec.propertyId) ?? [];
        list.push(spec.id);
        completedByProperty.set(spec.propertyId, list);
      }
    }

    // --------------------------------------------------------------- reviews
    const reviewSpecs: Array<[string, string, number, string]> = [];
    const completedBookings = specs.filter((s) => s.status === "completed");
    completedBookings.slice(0, 8).forEach((spec, index) => {
      reviewSpecs.push([
        spec.id,
        spec.propertyId,
        index % REVIEW_TEXT.length,
        spec.guestId,
      ]);
    });
    // every published property should have at least one visible review
    for (const property of PROPERTIES.filter((p) => (p.status ?? "published") === "published")) {
      if (!reviewSpecs.some(([, propertyId]) => propertyId === property.id)) {
        const completed = completedByProperty.get(property.id);
        if (completed?.[0]) {
          reviewSpecs.push([completed[0], property.id, 0, "usr_kavya"]);
        }
      }
    }

    let reviewIndex = 0;
    for (const [bookingId, propertyId, textIndex] of reviewSpecs) {
      const text = REVIEW_TEXT[textIndex];
      const booking = specs.find((s) => s.id === bookingId)!;
      reviewIndex += 1;
      await insertRow(db, "reviews", {
        id: `rev_seed_${reviewIndex}`,
        property_id: propertyId,
        booking_id: bookingId,
        guest_id: booking.guestId,
        rating: text.rating,
        cleanliness: text.cleanliness,
        accuracy: text.accuracy,
        communication: text.communication,
        location: text.location,
        value: text.value,
        comment: text.comment,
        status: "published",
        created_at: isoAt(booking.to + 1, 10),
      });
    }

    // ---------------------------------------------------------- conversations
    const conversations: Array<{
      id: string;
      bookingId: string;
      propertyId: string;
      ownerId: string;
      guestId: string;
      subject: string;
      messages: Array<[string, string, number]>;
    }> = [
      {
        id: "cnv_siolim",
        bookingId: "bkg_siolim_kavya",
        propertyId: "prp_siolim",
        ownerId: "usr_arjun",
        guestId: "usr_kavya",
        subject: "Villa Siolim · arrival details",
        messages: [
          ["usr_kavya", "Hi Arjun! We're arriving around 6pm on the 20th. Will that be alright for check-in?", -3],
          ["usr_arjun", "Absolutely. I'll leave the gate code with you the morning of. The caretaker, Sunil, will be there to help with bags.", -3],
          ["usr_kavya", "Perfect. One more thing — is the pool heated?", -2],
          ["usr_arjun", "It isn't, but in November the water is usually 28–29°C by afternoon. Most guests swim in the evening. I'll leave extra towels out.", -2],
        ],
      },
      {
        id: "cnv_haveli",
        bookingId: "bkg_haveli_sara",
        propertyId: "prp_haveli",
        ownerId: "usr_meera",
        guestId: "usr_sara",
        subject: "Amrapali Haveli · breakfast & airport pickup",
        messages: [
          ["usr_sara", "Hello Meera, could you arrange an airport pickup? We land at 7:40am.", -1],
          ["usr_meera", "Of course. Our driver charges ₹1,400 for the airport run, paid directly to him. I'll book him for 8am — he'll wait with a name board.", -1],
          ["usr_sara", "That would be wonderful, thank you. And do you serve non-vegetarian breakfast?", 0],
          ["usr_meera", "We do, on request. I'll note it for all four mornings. See you soon!", 0],
        ],
      },
      {
        id: "cnv_cedar",
        bookingId: "bkg_cedar_kavya",
        propertyId: "prp_cedar",
        ownerId: "usr_meera",
        guestId: "usr_kavya",
        subject: "Cedar & Cloud · road conditions",
        messages: [
          ["usr_kavya", "Is the road up to the cabin alright in late December? We're driving from Chandigarh in a sedan.", -1],
          ["usr_meera", "A sedan is fine if there's no fresh snow. I'll send you a condition report two days before. If snow is forecast, park in Naggar and I'll arrange the last 2km.", 0],
        ],
      },
    ];

    for (const conversation of conversations) {
      const last = conversation.messages[conversation.messages.length - 1];
      await insertRow(db, "conversations", {
        id: conversation.id,
        booking_id: conversation.bookingId,
        property_id: conversation.propertyId,
        subject: conversation.subject,
        last_message_at: isoAt(last[2], 14),
        last_message_preview: last[1],
        created_at: isoAt(conversation.messages[0][2] - 1, 9),
      });
      for (const member of [conversation.ownerId, conversation.guestId]) {
        await insertRow(db, "conversation_members", {
          conversation_id: conversation.id,
          user_id: member,
          last_read_at: isoAt(0, 8),
        });
      }
      let messageIndex = 0;
      for (const [senderId, body, dayOffset] of conversation.messages) {
        messageIndex += 1;
        await insertRow(db, "messages", {
          id: `msg_${conversation.id}_${messageIndex}`,
          conversation_id: conversation.id,
          sender_id: senderId,
          body,
          created_at: isoAt(dayOffset, 9 + messageIndex * 2),
        });
      }
    }

    // --------------------------------------------------------------- payouts
    const payouts: Array<[string, number, number, "paid" | "scheduled"]> = [
      ["usr_arjun", 48600000, -60, "paid"],
      ["usr_arjun", 37200000, -30, "scheduled"],
      ["usr_priya", 29800000, -60, "paid"],
      ["usr_priya", 24100000, -30, "scheduled"],
      ["usr_rohan", 13200000, -60, "paid"],
      ["usr_rohan", 15600000, -30, "scheduled"],
      ["usr_meera", 51400000, -60, "paid"],
      ["usr_meera", 44800000, -30, "scheduled"],
    ];
    for (let index = 0; index < payouts.length; index += 1) {
      const [ownerId, amount, days, status] = payouts[index];
      const start = addDays(todayISO(), days);
      await insertRow(db, "payouts", {
        id: `pyo_seed_${index + 1}`,
        owner_id: ownerId,
        amount,
        currency: "INR",
        period_start: addDays(start, -30),
        period_end: start,
        status,
        reference: status === "paid" ? `NEFT-${48210 + index}` : null,
        created_at: isoAt(days, 12),
        paid_at: status === "paid" ? isoAt(days, 12) : null,
      });
    }

    // ------------------------------------------------------------- wishlists
    await insertRow(db, "wishlists", {
      id: "wsh_kavya",
      user_id: "usr_kavya",
      name: "Saved stays",
      created_at: isoAt(-70, 8),
    });
    for (const propertyId of ["prp_kadal", "prp_haveli", "prp_bandra"]) {
      await insertRow(db, "wishlist_items", {
        wishlist_id: "wsh_kavya",
        property_id: propertyId,
        created_at: isoAt(-40, 8),
      });
    }

    // --------------------------------------------------------- notifications
    const notifications: Array<[string, string, string, string, string, number]> = [
      ["usr_kavya", "booking.confirmed", "Your stay at Villa Siolim is confirmed", "Booking NVS-1001 · 4 nights · 20–24 Nov. Arjun will share arrival details a day before check-in.", "in_app", -3],
      ["usr_arjun", "booking.created", "New reservation at Villa Siolim", "Kavya Sharma booked 4 nights. Payout of ₹48,600 is scheduled for the next cycle.", "in_app", -3],
      ["usr_meera", "payout.scheduled", "Payout scheduled", "₹4,48,000 will be transferred to your account on the 1st.", "email", -2],
      ["usr_sara", "message.received", "New message from Meera Iyer", "We do, on request. I'll note it for all four mornings.", "in_app", 0],
    ];
    for (const [userId, type, title, body, channel, days] of notifications) {
      await insertRow(db, "notifications", {
        id: newId("ntf"),
        user_id: userId,
        type,
        title,
        body,
        channel,
        status: days < 0 ? "read" : "sent",
        read_at: days < 0 ? isoAt(days, 12) : null,
        created_at: isoAt(days, 12),
      });
    }

    // --------------------------------------------------------------- audit
    const audits: Array<[string, string, string, number]> = [
      ["property.approved", "prp_siolim", "Approved listing after documentation check", -38],
      ["property.approved", "prp_haveli", "Approved listing after documentation check", -32],
      ["payout.released", "usr_meera", "Released November payout batch", -30],
      ["user.verified", "usr_priya", "Owner identity verified via PAN + bank proof", -21],
    ];
    for (const [action, entityId, metadata, days] of audits) {
      await insertRow(db, "audit_logs", {
        id: newId("aud"),
        actor_id: "usr_admin",
        action,
        entity_type: action.split(".")[0],
        entity_id: entityId,
        metadata,
        created_at: isoAt(days, 10),
      });
    }

    // --------------------------------------------------------------- outbox
    const outbox: Array<[string, string, string, number]> = [
      ["booking.confirmed", "bkg_siolim_kavya", "booking", -3],
      ["booking.created", "bkg_palm_dev", "booking", -2],
      ["payout.scheduled", "usr_meera", "payout", -1],
    ];
    for (const [type, aggregateId, aggregateType, days] of outbox) {
      await insertRow(db, "outbox_events", {
        id: newId("evt"),
        type,
        aggregate_type: aggregateType,
        aggregate_id: aggregateId,
        payload: JSON.stringify({ type, aggregateId, seeded: true }),
        status: "published",
        attempts: 1,
        available_at: isoAt(days, 10),
        published_at: isoAt(days, 10),
        last_error: null,
        created_at: isoAt(days, 10),
      });
    }

    await db
      .prepare("INSERT INTO app_meta (key, value) VALUES ('seeded_at', ?)")
      .bind(now)
      .run();
    await db
      .prepare("INSERT INTO app_meta (key, value) VALUES ('seed_version', '1')")
      .run();

    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}

export const DEMO_ACCOUNTS = {
  password: DEMO_PASSWORD,
  guest: "kavya@nivas.test",
  owner: "arjun@nivas.test",
  admin: "admin@nivas.test",
};
