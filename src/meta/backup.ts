// Dormant step-0 contract: no identifiers, persistence, plugin registration or stores.
import type { Profile } from './profile';
import type { BackupKeyMeta, BackupReason, BackupRestoreResult, CloudBackupStatus } from './m13types';
export async function backupStatus(): Promise<CloudBackupStatus> {
  return { enabled: false, account: false, on: false, lastAt: null, full: false };
}
export async function setBackupOn(_on: boolean): Promise<CloudBackupStatus> {
  return backupStatus();
}
export async function maybeBackup(_p: Profile, _reason: BackupReason): Promise<boolean> {
  return false;
}
export async function listBackups(): Promise<BackupKeyMeta[]> {
  return [];
}
export async function restoreBackup(_key: string): Promise<BackupRestoreResult> {
  return 'unavailable';
}
export async function undoRestore(): Promise<boolean> {
  return false;
}
