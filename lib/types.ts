export interface ProjectDTO {
  id: string;
  title: string;
  description: string | null;
  url: string;
  source: string;
  company: string | null;
  country: string | null;
  role: string | null;
  techStack: string[];
  contactEmail: string | null;
  contactUrl: string | null;
  foundAt: string;
  status: string;
  isApplied: boolean;
  appliedAt: string | null;
  notes: string | null;
}

export interface ContactDTO {
  id: string;
  company: string | null;
  website: string;
  email: string | null;
  phone: string | null;
  linkedIn: string | null;
  country: string | null;
  source: string | null;
  status: string;
  createdAt: string;
}

export interface ApplicationDTO {
  id: string;
  projectId: string;
  coverLetter: string;
  sentAt: string;
  method: string;
  status: string;
  replyAt: string | null;
  notes: string | null;
  project: ProjectDTO;
}
