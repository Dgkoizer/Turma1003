export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'student';
}

export interface NewsItem {
  id: number;
  title: string;
  content: string;
  image_url?: string;
  created_at: string;
}

export interface Activity {
  id: number;
  title: string;
  image_url: string;
  active: number;
}

export interface ReportCard {
  id: number;
  user_id: number;
  file_url: string;
  file_name: string;
  period: string;
  created_at: string;
  student_name?: string;
}
