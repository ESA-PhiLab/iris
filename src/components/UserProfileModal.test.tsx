import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/test-utils';
import { UserProfileModal } from './UserProfileModal';
import { Backend, Profile, setBackend } from '../services/backend';

const loadProfile = vi.fn();
setBackend({ loadProfile } as unknown as Backend);

const profile = (changes: Partial<Profile> = {}): Profile => ({
  id: 0,
  name: 'testuser',
  admin: true,
  tested: true,
  created: '',
  image_seed: 0,
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
  is_current_user: true,
  canSignOut: true,
  ...changes,
});

describe('UserProfileModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <UserProfileModal isOpen={false} onClose={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows loading state when open', () => {
    loadProfile.mockImplementation(() => new Promise(() => {}));

    render(<UserProfileModal isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Loading profile...')).toBeInTheDocument();
  });

  it('displays user profile data when loaded', async () => {
    loadProfile.mockResolvedValue(profile());

    render(<UserProfileModal isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    expect(screen.getByText('this is you')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('tested')).toBeInTheDocument();
    expect(screen.getByText('1234')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Download my masks')).toBeInTheDocument();
  });

  it('displays error message on failure', async () => {
    loadProfile.mockRejectedValue(new Error('Not Found'));

    render(<UserProfileModal isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load profile/)).toBeInTheDocument();
    });
  });

  it('shows the logout button when the site has accounts', async () => {
    loadProfile.mockResolvedValue(profile());

    render(<UserProfileModal isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });
  });

  it('does not show the logout button without accounts', async () => {
    loadProfile.mockResolvedValue(profile({ name: 'local', canSignOut: false }));

    render(<UserProfileModal isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('local')).toBeInTheDocument();
    });

    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
  });
});
