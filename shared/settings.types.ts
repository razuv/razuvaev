export type Social = "email" | "linkedin" | "telegram" | "medium" | "dribble" | "behance" | "facebook";

export interface SettingsType {
  tv?: TvTrack[];
  languages: {
    name: string;
    iso: string;
  }[];
  biography: {
    iso: string;
    text: string;
    cv?: {
      title: string;
      intro: string;
      approach: string;
      highlights: string[];
      history: string;
      toolsTitle: string;
      roles: { company: string; period: string; role: string; text: string; link?: string }[];
      tools: { name: string; icon: string }[];
    };
    footer?: { title: string; text: string; cvLabel: string };
    hero?: {
      title: string;
      subtitle: string;
      video?: string;
      worked: HeroProofGroup;
      featured: HeroProofGroup;
    };
    categories?: string[];
    contacts: {
      type: Social;
      link: string;
      visible: boolean;
    }[];
    feed: {
      image: string;
      text: string;
      link: string;
    }[];
  }[];
  projects: {
    iso: string;
    items: ProjectItem[];
    archive?: ProjectItem[];
  }[];
};

export interface TvTrack {
  id: string;
  video: string;
  cover: string;
  artist: string;
  album: string;
  title: string;
  youtube?: string;
  spotify?: string;
  yandex?: string;
  apple?: string;
}

export interface ProjectItem {
      id?: string;
      rules: {
        nda: boolean;
        listing?: 'default' | 'featured' | 'archive';
        ndaPassword?: string;
        details: boolean;
        showTitle?: boolean;
        syncMedia?: boolean;
      };
      info: {
        title: string;
        year: string;
        logo?: string;
        summary?: string;
        link: string;
        images: { link: string }[];
      };
      details: {
        industry?: string;
        tags?: string[];
        theme: {
          background: string;
          textColor: string;
          accentColor?: string;
        };
        content: {
          title: string;
          text: string;
        }[];
        blocks?: CaseBlock[];
      };
}

export interface HeroProofGroup {
  label: string;
  tooltip: string;
  link: string;
  items: {
    image: string;
    alt: string;
    link?: string;
  }[];
}

export type CaseBlockType =
  | 'heading' | 'carousel' | 'video' | 'image' | 'slides' | 'gallery'
  | 'text-image' | 'numbers' | 'text-text' | 'text' | 'iframe'
  | 'team-thanks' | 'team' | 'thanks' | 'mentions';

export interface CaseBlock {
  id: string;
  type: CaseBlockType;
  title?: string;
  text?: string;
  secondaryTitle?: string;
  secondaryText?: string;
  images?: string[];
  video?: string;
  iframe?: string;
  items?: { id?: string; value: string; text: string; image?: string; link?: string; period?: string; source?: string; role?: string }[];
  syncMedia?: boolean;
  spacing?: number;
  hidden?: boolean;
  caption?: string;
  alt?: string;
  poster?: string;
}
