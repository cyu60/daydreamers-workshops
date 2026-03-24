export interface Workshop {
  id: string;
  slug: string;
  title: string;
  description: string;
  fullDescription: string;
  instructorIds: string[];
  date: string | null;
  duration: string;
  price: number; // cents
  capacity: number;
  spotsRemaining: number;
  coverImage: string | null;
  tags: string[];
  status: "Published" | "Draft" | "Sold Out";
  stripePriceId: string;
}

export interface Instructor {
  id: string;
  slug: string;
  name: string;
  role: string;
  bio: string;
  photo: string | null;
  linkedin: string | null;
}
