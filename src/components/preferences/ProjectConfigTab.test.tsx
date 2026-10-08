import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../test/test-utils';
import ProjectConfigTab from './ProjectConfigTab';
import { Backend, setBackend } from '../../services/backend';

const loadProjectFile = vi.fn();
const saveProjectFile = vi.fn();
setBackend({ loadProjectFile, saveProjectFile } as unknown as Backend);

const project = () => ({
  name: 'test-project',
  images: {
    path: 'images/{id}.tif',
    ids: ['a', 'b'],
    thumbnails: false,
    metadata: false,
  },
  classes: [{ name: 'Cloud', colour: [255, 255, 0, 70], description: 'Cloud pixels' }],
  views: { RGB: { type: 'image', data: ['$B4', '$B3', '$B2'] } },
  view_groups: { default: ['RGB'] },
  segmentation: { mask_area: [0, 0, 10, 10], ai_model: false },
});

const loaded = async (savesTo: 'hub' | 'download' = 'download') => {
  loadProjectFile.mockResolvedValue({ config: project(), location: 'demo/p.json', savesTo });
  render(<ProjectConfigTab />);
  await waitFor(() => expect(screen.getByDisplayValue('test-project')).toBeInTheDocument());
};

describe('ProjectConfigTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows that it is loading', () => {
    loadProjectFile.mockImplementation(() => new Promise(() => {}));
    render(<ProjectConfigTab />);
    expect(screen.getByText('Loading configuration...')).toBeInTheDocument();
  });

  it('says when the project cannot be read', async () => {
    loadProjectFile.mockRejectedValue(new Error('Could not read the project (404)'));
    render(<ProjectConfigTab />);
    await waitFor(() => expect(screen.getByText(/Could not read the project/)).toBeInTheDocument());
  });

  it('downloads the edited project, keeping what the form does not show', async () => {
    await loaded();
    saveProjectFile.mockResolvedValue('download');
    fireEvent.change(screen.getByDisplayValue('test-project'), { target: { value: 'renamed' } });

    fireEvent.click(screen.getByText('Download the project file'));

    await waitFor(() => expect(screen.getByText(/Project downloaded/)).toBeInTheDocument());
    const saved = saveProjectFile.mock.calls[0][0];
    expect(saved.name).toBe('renamed');
    expect(saved.images.ids).toEqual(['a', 'b']);
    expect(saved.segmentation.mask_area).toEqual([0, 0, 10, 10]);
  });

  it('saves to the dataset when the project is on the Hub', async () => {
    await loaded('hub');
    saveProjectFile.mockResolvedValue('hub');

    fireEvent.click(screen.getByText('Save the project to its dataset'));

    await waitFor(() => expect(screen.getByText(/Project saved to its dataset/)).toBeInTheDocument());
  });

  it('does not save a project that cannot work', async () => {
    loadProjectFile.mockResolvedValue({
      config: { ...project(), images: { path: 'images/{id}.png' } },
      location: 'p.json',
      savesTo: 'download',
    });
    render(<ProjectConfigTab />);
    await waitFor(() => expect(screen.getByDisplayValue('test-project')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Download the project file'));

    await waitFor(() => expect(screen.getByText(/Validation failed: images.path must point to COG files/)).toBeInTheDocument());
    expect(saveProjectFile).not.toHaveBeenCalled();
  });
});
