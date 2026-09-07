export type Social = "email" | "linkedin" | "telegram" | "medium" | "dribble" | "behance" | "facebook";

export interface SettingsType {
  languages: {
    name: string;
    iso: string;
  }[];
  biography: {
    iso: string;
    text: string;
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
    items: {
      rules: {
        nda: boolean;
        ndaPassword?: string;
        details: boolean;
        syncMedia?: boolean;
      };
      info: {
        title: string;
        year: string;
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
      }
    }[];
  }[];
};

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
  | 'team-thanks' | 'team' | 'thanks';

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
  items?: { value: string; text: string }[];
}
