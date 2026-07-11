import { describe, expect, it, vi } from 'vitest'
import { openOrFocusDashboard, type DashboardNavigation } from './navigation'

function navigation(contexts: DashboardNavigation extends { findDashboardContexts: () => Promise<infer T> } ? T : never) {
  return {
    findDashboardContexts: vi.fn().mockResolvedValue(contexts),
    reloadTab: vi.fn().mockResolvedValue(undefined),
    focusWindow: vi.fn().mockResolvedValue(undefined),
    createTab: vi.fn().mockResolvedValue(undefined),
  }
}

describe('dashboard navigation', () => {
  it('creates a dashboard tab when none is open', async () => {
    const browser = navigation([])
    await openOrFocusDashboard(browser)
    expect(browser.createTab).toHaveBeenCalledOnce()
    expect(browser.reloadTab).not.toHaveBeenCalled()
  })

  it('reloads and focuses the existing dashboard instead of creating another tab', async () => {
    const browser = navigation([{ tabId: 14, windowId: 3, frameId: 0 }])
    await openOrFocusDashboard(browser)
    expect(browser.reloadTab).toHaveBeenCalledWith(14)
    expect(browser.focusWindow).toHaveBeenCalledWith(3)
    expect(browser.createTab).not.toHaveBeenCalled()
  })
})
