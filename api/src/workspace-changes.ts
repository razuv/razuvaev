import { BadRequestException } from '@nestjs/common';

export function applyWorkspaceChanges(groups: any[], changes: any): any[] {
  const invalid = () => { throw new BadRequestException('Некорректные изменения кейсов'); };
  if (!Array.isArray(changes)) invalid();
  const seen = new Set<string>();
  for (const change of changes) {
    if (!change || typeof change.iso !== 'string' || seen.has(change.iso) || !Array.isArray(change.upserts)) invalid();
    seen.add(change.iso);
    const group = groups.find(group => group.iso === change.iso);
    if (!group) invalid();
    const projects = new Map<string, any>([...group.items, ...(group.archive || [])].map(item => [item.id, item]));
    const updated = new Set<string>();
    for (const project of change.upserts) {
      if (!project || typeof project.id !== 'string' || !project.id || updated.has(project.id)) invalid();
      updated.add(project.id);
      projects.set(project.id, project);
    }
    const order = change.order ?? { items: group.items.map(item => item.id), archive: (group.archive || []).map(item => item.id) };
    if (!Array.isArray(order.items) || !Array.isArray(order.archive)) invalid();
    const ids = [...order.items, ...order.archive];
    if (ids.some(id => typeof id !== 'string' || !projects.has(id)) || new Set(ids).size !== ids.length || [...updated].some(id => !ids.includes(id))) invalid();
    group.items = order.items.map(id => projects.get(id));
    group.archive = order.archive.map(id => projects.get(id));
  }
  return groups;
}
