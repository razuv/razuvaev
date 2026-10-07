import type { ProjectItem, SettingsType } from '../../../shared/settings.types'

type Group = SettingsType['projects'][number]
export interface WorkspaceChange {
  iso: string
  upserts: ProjectItem[]
  order?: { items: string[]; archive: string[] }
}

// Compare against the last acknowledged save, including edits made during a request.
export function workspaceChanges(previous: Group[], current: Group[]): WorkspaceChange[] {
  return current.flatMap(group => {
    const old = previous.find(item => item.iso === group.iso)
    const oldProjects = new Map([...(old?.items || []), ...(old?.archive || [])].map(item => [item.id, item]))
    const upserts = [...group.items, ...(group.archive || [])].filter(item => JSON.stringify(item) !== JSON.stringify(oldProjects.get(item.id)))
    const order = { items: group.items.map(item => item.id!), archive: (group.archive || []).map(item => item.id!) }
    const oldOrder = { items: (old?.items || []).map(item => item.id), archive: (old?.archive || []).map(item => item.id) }
    const reordered = JSON.stringify(order) !== JSON.stringify(oldOrder)
    return upserts.length || reordered ? [{ iso: group.iso, upserts, ...(reordered ? { order } : {}) }] : []
  })
}
