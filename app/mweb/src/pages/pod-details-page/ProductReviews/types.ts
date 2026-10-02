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
  seller_reply_at: string | null;
  created_at: string;
}
