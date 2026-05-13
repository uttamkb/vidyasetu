export interface UserProfileData {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  grade: string;
  board: string;
  state: string | null;
  district: string | null;
  school: string | null;
  leaderboardOptIn: boolean;
}

export interface EditProfileFormData {
  name: string;
  grade: string;
  board: string;
  state: string;
  district?: string;
  school?: string;
  image?: string | null;
  leaderboardOptIn: boolean;
}
