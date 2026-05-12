export interface UserProfileData {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  grade: string;
  board: string;
  leaderboardOptIn: boolean;
}

export interface EditProfileFormData {
  name: string;
  grade: string;
  board: string;
  image?: string | null;
  leaderboardOptIn: boolean;
}
