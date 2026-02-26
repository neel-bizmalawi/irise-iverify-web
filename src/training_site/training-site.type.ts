export interface TrainingSite {
  training_point_id: number;
  training_site: string;
  district: string | null;
  traditional_authority: string | null;
  total_people: number | null;
  status: 'active' | 'inactive';
  created_date: Date;
}