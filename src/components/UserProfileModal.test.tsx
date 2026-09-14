import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/test-utils';
import { UserProfileModal } from './UserProfileModal';
import type { UserProfile } from '../types/iris';

describe('UserProfileModal', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <UserProfileModal isOpen={false} onClose={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows loading state when open', () => {
    (global.fetch as any).mockImplementation(() => 
      new Promise(() => {}) // Never resolves
    );

    render(<UserProfileModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Loading profile...')).toBeInTheDocument();
  });

  it('displays user profile data when loaded', async () => {
    const mockProfile: UserProfile = {
      id: 1,
      name: 'testuser',
      admin: true,
      tested: true,
      created: '2024-01-01T00:00:00',
      image_seed: 12345,
      segmentation: {
        rank: 1,
        score: 1234,
        score_unverified: 56,
        n_masks: 42,
        last_masks: [
          {
            image_id: 'img_001',
            score: 95,
            score_unverified: false,
            last_modification: '2024-12-04 10:30:00',
            time_spent: '00:15:30'
          }
        ]
      },
      is_current_user: true
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfile
    });

    render(<UserProfileModal isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    expect(screen.getByText('this is you')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('tested')).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('displays error message on fetch failure', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found'
    });

    render(<UserProfileModal isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load profile/)).toBeInTheDocument();
    });
  });

  it('shows logout button for current user', async () => {
    const mockProfile: UserProfile = {
      id: 1,
      name: 'testuser',
      admin: false,
      tested: false,
      created: '2024-01-01T00:00:00',
      image_seed: 12345,
      segmentation: {
        rank: 1,
        score: 100,
        score_unverified: 0,
        n_masks: 5,
        last_masks: []
      },
      is_current_user: true
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfile
    });

    render(<UserProfileModal isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });
  });

  it('does not show logout button for other users', async () => {
    const mockProfile: UserProfile = {
      id: 2,
      name: 'otheruser',
      admin: false,
      tested: false,
      created: '2024-01-01T00:00:00',
      image_seed: 12345,
      segmentation: {
        rank: 2,
        score: 50,
        score_unverified: 0,
        n_masks: 2,
        last_masks: []
      },
      is_current_user: false
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfile
    });

    render(<UserProfileModal isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('otheruser')).toBeInTheDocument();
    });

    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
  });
});
