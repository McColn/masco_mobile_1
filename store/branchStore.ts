// store/branchStore.ts
import { create } from 'zustand';
import type { Office } from '@/lib/types';
import { TokenStorage } from '@/lib/api';
import { BranchService } from '@/lib/services';

interface BranchState {
  branches: Office[];
  selectedBranch: Office | null;
  isLoading: boolean;
  // viewingHQ: true when HQ user has NOT switched to a branch
  viewingHQ: boolean;

  loadBranches: () => Promise<void>;
  switchBranch: (branch: Office, clearCache?: () => void) => Promise<void>;
  switchToHQ: (clearCache?: () => void) => void;
}

export const useBranchStore = create<BranchState>((set, get) => ({
  branches: [],
  selectedBranch: null,
  isLoading: false,
  viewingHQ: true,

  loadBranches: async () => {
    set({ isLoading: true });
    try {
      const branches = await BranchService.list();
      // For branch users: only 1 branch, selected = true
      // For HQ users: multiple branches, find selected or default to first non-HQ
      const selected = branches.find((b: any) => b.selected)
        ?? branches.find((b: any) => b.name?.toUpperCase() !== 'HQ')
        ?? branches[0]
        ?? null;

      // Is this a single-branch user (not HQ)?
      const isHQUser = branches.length > 1;
      const viewingHQ = isHQUser
        ? (selected?.name?.toUpperCase() === 'HQ')
        : false;

      if (selected?.id) {
        await TokenStorage.setOfficeId(selected.id);
      }
      set({ branches, selectedBranch: selected, isLoading: false, viewingHQ });
    } catch {
      set({ isLoading: false });
    }
  },

  switchBranch: async (branch: Office, clearCache?: () => void) => {
    try {
      await BranchService.switch(branch.id);
      await TokenStorage.setOfficeId(branch.id);

      const isHQBranch = branch.name?.toUpperCase() === 'HQ';

      set({
        selectedBranch: branch,
        viewingHQ: isHQBranch,
        branches: get().branches.map((b) => ({
          ...b,
          selected: b.id === branch.id,
        })),
      });

      // Invalidate queries so screens refetch with new X-Office-Id header
      // Screens show stale data immediately, fresh data loads in background
      if (clearCache) clearCache();

    } catch (e) {
      console.warn('[BRANCH] switchBranch failed:', e);
    }
  },

  switchToHQ: (clearCache?: () => void) => {
    // Find HQ office in branches list
    const hqBranch = get().branches.find(b => b.name?.toUpperCase() === 'HQ');
    if (hqBranch) {
      TokenStorage.setOfficeId(hqBranch.id);
      set({
        selectedBranch: hqBranch,
        viewingHQ: true,
        branches: get().branches.map(b => ({ ...b, selected: b.id === hqBranch.id })),
      });
    } else {
      // No explicit HQ branch — just mark viewingHQ = true
      set({ viewingHQ: true });
    }
    if (clearCache) clearCache();
  },
}));

// ── Selector helpers ─────────────────────────────────────────────────────────
// Use these instead of manual isHQ checks throughout the app

/** True if this user can see HQ menus (superuser + currently viewing HQ) */
export function selectIsHQView(
  isSuperuser: boolean,
  viewingHQ: boolean,
  branchCount: number
): boolean {
  if (!isSuperuser && branchCount <= 1) return false;   // pure branch user
  return viewingHQ;                                      // HQ user viewing HQ
}

/** True if user has HQ access at all (regardless of current view) */
export function selectIsHQUser(isSuperuser: boolean, branchCount: number): boolean {
  return isSuperuser || branchCount > 1;
}
