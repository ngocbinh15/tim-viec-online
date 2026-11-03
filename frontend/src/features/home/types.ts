export type HomeJobCard = {
  id: number;
  title: string;
  company: string;
  city: string;
  salary: string;
  mark: string;
  brand: string;
  featured: boolean;
  logo?: string | null;
};

export type HomeCategory = {
  name: string;
  count: number;
  icon:
    | "briefcase"
    | "accounting"
    | "building"
    | "factory"
    | "monitor"
    | "marketing"
    | "design"
    | "people";
  href: string;
};

export type HomeCompany = {
  id: number;
  name: string;
  mark: string;
  brand: string;
  count: number;
  location: string;
  logo?: string | null;
};
