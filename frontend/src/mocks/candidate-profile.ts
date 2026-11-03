import type { CandidateProfile } from "../features/candidate-profile/types";

export function createProfilePreview(): CandidateProfile {
  return {
    name: "Nguyễn Minh An",
    email: "minhan@example.com",
    phone: "",
    dob: "1998-06-15",
    title: "Lập trình viên Backend Laravel",
    experience_years: 3,
    bio: "",
    city: "Hồ Chí Minh",
    address: "",
    linkedin: "",
    github: "",
    portfolio: "",
    skill_ids: [1, 2, 6],
  };
}
