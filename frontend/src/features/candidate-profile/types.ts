export type CandidateProfile = {
  name: string;
  email: string;
  phone: string;
  dob: string;
  title: string;
  experience_years: number;
  bio: string;
  city: string;
  address: string;
  linkedin: string;
  github: string;
  portfolio: string;
  skill_ids: number[];
};

export const PROFILE_SKILLS = [
  { id: 1, name: "PHP" },
  { id: 2, name: "Laravel" },
  { id: 3, name: "ReactJS" },
  { id: 4, name: "NextJS" },
  { id: 5, name: "TypeScript" },
  { id: 6, name: "MySQL" },
  { id: 7, name: "RESTful API" },
  { id: 8, name: "Docker" },
  { id: 9, name: "Figma / UI Design" },
  { id: 10, name: "SEO & Content" },
] as const;
export const MAX_PROFILE_SKILLS = 10;
export const MAX_CV_BYTES = 5 * 1024 * 1024;
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
