export interface UserProfileData {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  grade: string;
  board: string;
}

export interface EditProfileFormData {
  name: string;
  grade: string;
  board: string;
}
