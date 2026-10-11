import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { JSONFile } from 'lowdb/node';
import { Low } from 'lowdb';
import type { DatabaseState } from '../domain/types.js';

const emptyState = (): DatabaseState => ({ invoices: [], outbox: [] });

export class JsonDatabase {
  private readonly database: Low<DatabaseState>;
  private pendingWrite: Promise<void> = Promise.resolve();

  private constructor(filePath: string) {
    this.database = new Low(new JSONFile<DatabaseState>(filePath), emptyState());
  }

  static async open(filePath: string): Promise<JsonDatabase> {
    const absolutePath = resolve(filePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    const instance = new JsonDatabase(absolutePath);
    await instance.database.read();
    instance.database.data ??= emptyState();
    await instance.database.write();
    return instance;
  }

  async read(): Promise<DatabaseState> {
    await this.pendingWrite;
    await this.database.read();
    return structuredClone(this.database.data ?? emptyState());
  }

  async update<T>(mutate: (state: DatabaseState) => T): Promise<T> {
    let result!: T;
    const operation = this.pendingWrite.then(async () => {
      await this.database.read();
      this.database.data ??= emptyState();
      result = mutate(this.database.data);
      await this.database.write();
    });
    this.pendingWrite = operation.catch(() => undefined);
    await operation;
    return result;
  }
}