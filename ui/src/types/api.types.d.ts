export type Social = "email" | "linkedin" | "telegram" | "medium" | "dribble" | "behance" | "facebook";

export interface SettingsType {
  languages: {
    name: string;
    iso: string;
  }[];
  biography: {
    iso: string;
    text: string;
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
        theme: {
          background: string;
          textColor: string;
        };
        content: {
          title: string;
          text: string;
        }[];
      }
    }[];
  }[];
};
