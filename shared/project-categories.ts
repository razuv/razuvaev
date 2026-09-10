import type { SettingsType } from './settings.types';

const defaults = {
  en: ['Product', 'Communication', 'Web', 'Event', 'Art Direction', 'Branding', 'Pet Project'],
  ru: ['Продукт', 'Коммуникация', 'Веб', 'Ивент', 'Арт-дирекшн', 'Брендинг', 'Личный проект'],
  sr: ['Производ', 'Комуникација', 'Веб', 'Догађај', 'Арт дирекција', 'Брендинг', 'Лични пројекат'],
};
const key = (value: string) => value.normalize('NFKC').toLowerCase().replace(/[\s–—-]+/g, ' ').trim();
const aliases = [
  ['Product Design', 'Продуктовый дизайн'],
  ['Communication Design', 'Graphic Design', 'Коммуникационный дизайн', 'Графический дизайн'],
  ['Web Design', 'Веб-дизайн'],
  ['Event Design', 'Дизайн мероприятий'],
  ['Арт-дирекшн', 'Арт-дирекшен', 'Арт-дирекция'],
  ['Identity', 'Айдентика', 'Typography', 'Типографика'],
  ['Pet Projects'],
];

/** Canonical labels are the editable categories, in the same order as the project filter. */
export function normalizeProjectCategories(settings: SettingsType): SettingsType {
  const lookup = new Map<string, number>();
  Object.values(defaults).forEach(labels => labels.forEach((label, index) => lookup.set(key(label), index)));
  aliases.forEach((labels, index) => labels.forEach(label => lookup.set(key(label), index)));
  settings.biography.forEach(bio => bio.categories?.forEach((label, index) => lookup.set(key(label), index)));
  for (const group of settings.projects) {
    const labels = settings.biography.find(bio => bio.iso === group.iso)?.categories || defaults[group.iso as keyof typeof defaults] || defaults.en;
    for (const project of [...group.items, ...(group.archive || [])]) {
      const details = project.details;
      const legacy = (details.content[0]?.title || '').split(',').map(value => value.trim()).filter(Boolean);
      const industry = details.industry ?? legacy[0] ?? '';
      const tags = details.tags ?? legacy.slice(1);
      const industryIndex = lookup.get(key(industry));
      // Older records put the first design category in the industry field.
      details.industry = industryIndex === undefined ? industry.trim() : '';
      const candidates = industryIndex === undefined ? tags : [industry, ...tags];
      details.tags = [...new Set(candidates.flatMap(tag => tag.split(/[,;\n]/)).flatMap(tag => {
        const index = lookup.get(key(tag));
        return index !== undefined && labels[index] ? [labels[index]] : [];
      }))];
    }
  }
  return settings;
}
