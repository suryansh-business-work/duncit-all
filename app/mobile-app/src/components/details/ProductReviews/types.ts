export interface Review {
  id: string;
  user_name: string;
  rating: number;
  comment: string;
  images: string[];
  up_votes: number;
  down_votes: number;
  my_vote: number;
  seller_reply: string;
}
export interface Summary {
  average_rating: number;
  total: number;
}
