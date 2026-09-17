import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createPlacementAdminController } from '../src/lab/placementAdminSettings';
import { PlacementAdminSettingsPage } from '../src/pages/PlacementAdminSettingsPage';

describe('placement admin settings', () => {
  it('rejects a club backend that its country does not allow', () => {
    const controller = createPlacementAdminController({
      countries: [{ country: 'AU', allowedBackends: ['supabase'], policies: [{ backend: 'supabase', enabled: true, targetAlias: 'supabase-au', version: 'v1' }, { backend: 'icp', enabled: true, targetAlias: 'icp-au', version: 'v1' }] }],
      clubs: [],
    });
    expect(() => controller.assignClub({ clubId: 'club-a', country: 'AU', backend: 'icp', targetAlias: 'icp-au', version: 'v1' })).toThrow('Backend is not allowed in AU');
  });

  it('requires an approved target version and preserves country assignment', () => {
    const controller = createPlacementAdminController({
      countries: [{ country: 'US', allowedBackends: ['icp', 'supabase'], policies: [{ backend: 'icp', enabled: true, targetAlias: 'icp-singapore', version: 'v2' }, { backend: 'supabase', enabled: true, targetAlias: 'supabase-us', version: 'v1' }] }],
      clubs: [],
    });
    expect(() => controller.assignClub({ clubId: 'club-us', country: 'US', backend: 'icp', targetAlias: 'icp-singapore', version: 'v1' })).toThrow('Target version is not approved');
    controller.assignClub({ clubId: 'club-us', country: 'US', backend: 'icp', targetAlias: 'icp-singapore', version: 'v2' });
    expect(controller.decision('club-us')).toEqual({ clubId: 'club-us', country: 'US', backend: 'icp', targetAlias: 'icp-singapore', version: 'v2' });
  });

  it('renders the ICP lab unavailable state by default and the app-admin surface when the app opts into supabase mode', () => {
    const controller = createPlacementAdminController({
      countries: [{ country: 'AU', allowedBackends: ['supabase'], policies: [{ backend: 'supabase', enabled: true, targetAlias: 'supabase-au-primary', version: 'v1' }] }],
      clubs: [],
    });

    const { unmount } = render(<PlacementAdminSettingsPage controller={controller} />);
    expect(screen.getByRole('heading', { name: /placement settings are unavailable in icp lab mode/i })).toBeTruthy();

    unmount();
    window.history.pushState({}, '', '/?backend=supabase');
    render(<PlacementAdminSettingsPage controller={controller} />);

    expect(screen.getByRole('heading', { name: /infrastructure \/ placement settings/i })).toBeTruthy();
    expect(screen.getAllByText(/country policy always wins over club selection/i).length).toBeGreaterThan(0);
    window.history.pushState({}, '', '/');
  });
});