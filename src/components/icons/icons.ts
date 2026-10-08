/**
 * The PNG icons of the toolbar and the help, bundled with the app
 */

const files = import.meta.glob('../../assets/icons/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const ICONS: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split('/').pop()!.replace('.png', ''), url])
);

/** Address of an icon, by its name, e.g. icon('pencil') */
export const icon = (name: string): string => {
  const url = ICONS[name];
  if (!url) throw new Error(`Unknown icon '${name}'`);
  return url;
};
