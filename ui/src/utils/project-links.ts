import { getData } from './api';
import type { SettingsType } from '../types/api.types';

const letters: Record<string, string> = {а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'kh',ц:'ts',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};
export const slugify = (title: string) => [...title.toLowerCase()].map(char => letters[char] ?? char).join('').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const projectSlugs = () => {
  const settings = getData() as SettingsType;
  const projects = settings.projects.find(group => group.iso === 'en') || settings.projects[0];
  const used = new Set<string>();
  return projects.items.map(project => {
    const base = slugify(project.info.title) || 'untitled';
    let slug = base, suffix = 2;
    while (used.has(slug) || /^\d+$/.test(slug)) slug = `${base}-${suffix++}`;
    used.add(slug);
    return slug;
  });
};
export const projectPath = (index: number) => `/works/${projectSlugs()[index]}`;
export const projectIndex = (slug: string) => /^\d+$/.test(slug) ? Number(slug) : projectSlugs().indexOf(slug);
