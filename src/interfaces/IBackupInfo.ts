/** Um backup do banco, como o `backup-service` o descreve. `path` é o caminho no HOST do arquivo. */
export interface IBackupInfo {
  id: string;
  fileName: string;
  path: string;
  sizeBytes: number;
  /** Ausente em arquivos que apareceram na pasta sem passar pelo serviço. */
  sha256?: string | null;
  createdAt: string;
  createdBy?: string | null;
  encrypted: boolean;
}

/** Corpo de `POST /api/v1/backups`; sem `passphrase` o arquivo sai sem cifra. */
export interface IBackupRequest {
  passphrase?: string;
  passphraseConfirmation?: string;
}
