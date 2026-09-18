import { fireEvent, render, screen } from '@testing-library/react';
import { Principal } from '@icp-sdk/core/principal';
import { describe, expect, it } from 'vitest';
import { PlacementAdminSettingsPanel } from '../src/lab/PlacementAdminSettingsPanel';
import { backendFromAssignment, createPlacementAdminController } from '../src/lab/placementAdminSettings';
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

  it('applies country-level policy changes before club-level backend assignment', () => {
    const controller = createPlacementAdminController({
      countries: [
        {
          country: 'AU',
          allowedBackends: ['supabase'],
          policies: [
            { backend: 'supabase', enabled: true, targetAlias: 'supabase-au-primary', version: 'v1' },
            { backend: 'icp', enabled: false, targetAlias: 'icp-au-disabled', version: 'v1' },
          ],
        },
      ],
      clubs: [],
    });

    expect(() =>
      controller.assignClub({ clubId: 'club-au', country: 'AU', backend: 'icp', targetAlias: 'icp-au-disabled', version: 'v1' }),
    ).toThrow('Backend is not allowed in AU');

    controller.setCountryPolicy({
      country: ' au ',
      allowedBackends: ['supabase', 'icp', 'icp'],
      policies: [
        { backend: 'supabase', enabled: true, targetAlias: 'supabase-au-primary', version: 'v1' },
        { backend: 'icp', enabled: true, targetAlias: 'icp-au-local', version: 'v2' },
      ],
    });

    controller.assignClub({ clubId: 'club-au', country: 'au', backend: 'icp', targetAlias: 'icp-au-local', version: 'v2' });

    expect(controller.settings().countries.find(policy => policy.country === 'AU')?.allowedBackends).toEqual(['supabase', 'icp']);
    expect(controller.decision('club-au')).toEqual({
      clubId: 'club-au',
      country: 'AU',
      backend: 'icp',
      targetAlias: 'icp-au-local',
      version: 'v2',
    });
  });

  it('lets one club move between approved Supabase and ICP targets without changing other clubs', () => {
    const controller = createPlacementAdminController({
      countries: [
        {
          country: 'US',
          allowedBackends: ['icp', 'supabase'],
          policies: [
            { backend: 'icp', enabled: true, targetAlias: 'icp-us-local', version: 'v1' },
            { backend: 'supabase', enabled: true, targetAlias: 'supabase-us-primary', version: 'v2' },
          ],
        },
      ],
      clubs: [
        { clubId: 'club-static', country: 'US', backend: 'supabase', targetAlias: 'supabase-us-primary', version: 'v2' },
      ],
    });

    controller.assignClub({ clubId: 'club-switching', country: 'US', backend: 'supabase', targetAlias: 'supabase-us-primary', version: 'v2' });
    controller.assignClub({ clubId: 'club-switching', country: 'US', backend: 'icp', targetAlias: 'icp-us-local', version: 'v1' });

    expect(controller.decision('club-switching')).toMatchObject({ backend: 'icp', targetAlias: 'icp-us-local' });
    expect(controller.decision('club-static')).toMatchObject({ backend: 'supabase', targetAlias: 'supabase-us-primary' });
  });

  it('converts club assignments to the exact backend routing payload', () => {
    const canister = Principal.fromText('aaaaa-aa');

    expect(backendFromAssignment({ clubId: 'club-au', country: 'AU', backend: 'supabase', targetAlias: 'supabase-au-primary', version: 'v1' })).toEqual({
      Supabase: { environment: 'supabase-au-primary' },
    });
    expect(backendFromAssignment({ clubId: 'club-us', country: 'US', backend: 'icp', targetAlias: 'icp-us-local', version: 'v1' }, canister)).toEqual({
      Icp: { canister },
    });
    expect(() => backendFromAssignment({ clubId: 'club-us', country: 'US', backend: 'icp', targetAlias: 'icp-us-local', version: 'v1' })).toThrow('ICP target requires a canister principal');
  });

  it('exposes approved club-level assignments in the settings panel and rejects disallowed country/backend pairs', () => {
    const controller = createPlacementAdminController({
      countries: [
        {
          country: 'AU',
          allowedBackends: ['supabase'],
          policies: [
            { backend: 'supabase', enabled: true, targetAlias: 'supabase-au-primary', version: 'v1' },
            { backend: 'icp', enabled: false, targetAlias: 'icp-au-disabled', version: 'v1' },
          ],
        },
        {
          country: 'US',
          allowedBackends: ['icp', 'supabase'],
          policies: [
            { backend: 'icp', enabled: true, targetAlias: 'icp-us-local', version: 'v1' },
            { backend: 'supabase', enabled: true, targetAlias: 'supabase-us-primary', version: 'v2' },
          ],
        },
      ],
      clubs: [],
    });

    render(<PlacementAdminSettingsPanel controller={controller} />);

    fireEvent.change(screen.getByLabelText('Club ID'), { target: { value: 'club-us' } });
    fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'US' } });
    fireEvent.change(screen.getByLabelText('Backend'), { target: { value: 'icp' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign approved target' }));

    expect(screen.getByRole('status').textContent).toContain('club-us is assigned to US · icp · icp-us-local v1');
    expect(controller.decision('club-us')).toEqual({
      clubId: 'club-us',
      country: 'US',
      backend: 'icp',
      targetAlias: 'icp-us-local',
      version: 'v1',
    });

    fireEvent.change(screen.getByLabelText('Club ID'), { target: { value: 'club-au' } });
    fireEvent.change(screen.getByLabelText('Country'), { target: { value: 'AU' } });
    fireEvent.change(screen.getByLabelText('Backend'), { target: { value: 'icp' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign approved target' }));

    expect(screen.getByRole('status').textContent).toContain('No approved icp target for AU');
    expect(controller.decision('club-au')).toBeUndefined();
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