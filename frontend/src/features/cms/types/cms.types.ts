export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
}

export interface BlogListItem {
  id: number;
  title: string;
  slug: string;
  category_name: string;
  author_name: string;
  summary: string;
  image: string | null;
  published_at: string | null;
}

export interface BlogDetail extends BlogListItem {
  content: string;
  is_published: boolean;
  created_at: string;
}

export interface Page {
  id: number;
  title: string;
  slug: string;
  content: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Slider {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  order: number;
}

export interface Advertisement {
  id: number;
  title: string;
  image: string;
  link: string;
  position: "header" | "sidebar" | "footer" | "popup";
}
