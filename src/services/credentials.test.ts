import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { CredentialsFile, WrongCredentials, unlock } from './credentials';

// Accounts made with scripts/credentials.mjs, with few iterations to be quick
const folder = mkdtempSync(join(tmpdir(), 'iris-credentials-'));
const path = join(folder, 'credentials.json');
writeFileSync(path, JSON.stringify({ version: 2, kdf: 'PBKDF2-SHA256', iterations: 1000, salt: 'c2FsdHNhbHRzYWx0c2FsdA==', users: {} }));

const run = (args: string[], env: Record<string, string> = {}) => spawnSync(
  process.execPath, [resolve(__dirname, '../../scripts/credentials.mjs'), ...args, '--file', path],
  { env: { ...process.env, ...env }, encoding: 'utf8' }
);

describe('credentials.json', () => {
  it('opens the entry of each user with their password', async () => {
    expect(run(['add', 'alice', '--role', 'admin'], { IRIS_PASSWORD: 'correct horse battery', HF_TOKEN: 'hf_alice' }).status).toBe(0);
    expect(run(['add', 'bob'], { IRIS_PASSWORD: 'another long secret' }).status).toBe(0);
    const file: CredentialsFile = JSON.parse(readFileSync(path, 'utf8'));

    expect(Object.keys(file.users)).toHaveLength(2);
    expect(JSON.stringify(file)).not.toMatch(/alice|bob|hf_alice/);
    expect(await unlock(file, 'alice', 'correct horse battery'))
      .toEqual({ user: 'alice', role: 'admin', hfToken: 'hf_alice' });
    expect(await unlock(file, 'bob', 'another long secret'))
      .toEqual({ user: 'bob', role: 'annotator', hfToken: null });
  });

  it('refuses wrong names and passwords alike', async () => {
    const file: CredentialsFile = JSON.parse(readFileSync(path, 'utf8'));
    await expect(unlock(file, 'alice', 'wrong password!!')).rejects.toBeInstanceOf(WrongCredentials);
    await expect(unlock(file, 'carol', 'correct horse battery')).rejects.toBeInstanceOf(WrongCredentials);
  });

  it('removes users and refuses short passwords', async () => {
    expect(run(['add', 'carol'], { IRIS_PASSWORD: 'short' }).status).toBe(1);
    expect(run(['add', '../carol'], { IRIS_PASSWORD: 'a sufficiently long password' }).status).toBe(1);
    expect(run(['remove', 'bob']).status).toBe(0);
    const file: CredentialsFile = JSON.parse(readFileSync(path, 'utf8'));
    expect(Object.keys(file.users)).toHaveLength(1);
    await expect(unlock(file, 'bob', 'another long secret')).rejects.toBeInstanceOf(WrongCredentials);
    expect(run(['remove', 'bob']).status).toBe(1);
  });
});
