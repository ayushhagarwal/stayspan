export type DashboardContext = { tabId: number; windowId: number; frameId: number }

export type DashboardNavigation = {
  findDashboardContexts: () => Promise<DashboardContext[]>
  reloadTab: (tabId: number) => Promise<unknown>
  focusWindow: (windowId: number) => Promise<unknown>
  createTab: () => Promise<unknown>
}

export async function openOrFocusDashboard(navigation: DashboardNavigation): Promise<void> {
  const contexts = await navigation.findDashboardContexts()
  const existing = contexts.find((context) => context.tabId >= 0 && context.windowId >= 0 && context.frameId === 0)
  if (!existing) {
    await navigation.createTab()
    return
  }
  await Promise.all([navigation.reloadTab(existing.tabId), navigation.focusWindow(existing.windowId)])
}
