// Adds and removes the accounts of IRIS in credentials.json
//
//   node scripts/credentials.mjs add <user> [--role admin|annotator] [--file credentials.json]
//   node scripts/credentials.mjs remove <user> [--file credentials.json]
//
// The password is asked for (or read from IRIS_PASSWORD), the Hugging Face
// token of the user from HF_TOKEN. Each entry is encrypted with a key derived
// from "user:password", so the file can be published with the site: anyone
// who knows a password can read that user's token, so use fine-grained tokens
// limited to the project's dataset and bucket, and long random passwords.
import { webcrypto as crypto } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

const ITERATIONS = 600000;
const encoder = new TextEncoder();
const toBase64 = (bytes) => Buffer.from(bytes).toString('base64');
const toBase64Url = (bytes) => toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const usage = () => {
  console.error('Usage: node scripts/credentials.mjs add <user> [--role admin|annotator] [--file credentials.json]');
  console.error('       node scripts/credentials.mjs remove <user> [--file credentials.json]');
  process.exit(1);
};

const [command, user, ...rest] = process.argv.slice(2);
if (!['add', 'remove'].includes(command) || !user) usage();
if (user === '.' || user === '..' || /[\\/\u0000-\u001f]/.test(user)) {
  console.error('User names cannot contain path separators or control characters');
  process.exit(1);
}
const option = (name, fallback) => {
  const index = rest.indexOf(`--${name}`);
  return index >= 0 ? rest[index + 1] : fallback;
};
const role = option('role', 'annotator');
if (!['admin', 'annotator'].includes(role)) usage();
const path = option('file', 'credentials.json');

const userId = async (salt, name) => {
  const data = new Uint8Array([...Buffer.from(salt, 'base64'), ...encoder.encode(name)]);
  return toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', data)));
};

const askPassword = () => new Promise((resolve) => {
  if (process.env.IRIS_PASSWORD) return resolve(process.env.IRIS_PASSWORD);
  const input = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  input._writeToOutput = (text) => { if (text.includes('Password')) process.stdout.write(text); };
  input.question(`Password for ${user}: `, (answer) => {
    input.close();
    process.stdout.write('\n');
    resolve(answer);
  });
});

const file = existsSync(path)
  ? JSON.parse(readFileSync(path, 'utf8'))
  : { version: 2, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, salt: toBase64(crypto.getRandomValues(new Uint8Array(16))), users: {} };
if (file.version !== 2) {
  console.error(`${path} is of version ${file.version}: start a new file`);
  process.exit(1);
}
const id = await userId(file.salt, user);

if (command === 'remove') {
  if (!file.users[id]) {
    console.error(`${path} has no user "${user}"`);
    process.exit(1);
  }
  delete file.users[id];
} else {
  const password = await askPassword();
  if (password.length < 16) {
    console.error('Use a password of at least 16 characters: the file is public');
    process.exit(1);
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const material = await crypto.subtle.importKey('raw', encoder.encode(`${user}:${password}`), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: file.iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );
  const payload = { user, role, hfToken: process.env.HF_TOKEN || null };
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(payload)));
  file.users[id] = { salt: toBase64(salt), iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) };
}

writeFileSync(path, `${JSON.stringify(file, null, 2)}\n`);
const count = Object.keys(file.users).length;
console.log(command === 'add'
  ? `${path}: "${user}" (${role}) ${process.env.HF_TOKEN ? 'with' : 'without'} a Hugging Face token, ${count} users`
  : `${path}: removed "${user}", ${count} users left`);
