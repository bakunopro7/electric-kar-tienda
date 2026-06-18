import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as TypesenseClient } from 'typesense';
import type { ConfigurationOptions } from 'typesense/lib/Typesense/Configuration';
import type {
  DocumentImportParameters,
  ImportResponse,
  SearchParams,
  SearchResponse,
} from 'typesense/lib/Typesense/Documents';
import type { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';
import {
  PRODUCTS_ALIAS,
  PRODUCTS_COLLECTION,
  ProductDocument,
  productsCollectionSchema,
} from './product-document';

/**
 * Transport-level wrapper around the Typesense Node client.
 *
 * Knows NOTHING about `Producto` — it owns hosts/keys, collection bootstrap,
 * health/readiness, and raw search/import/upsert/delete. It degrades gracefully:
 * if Typesense is unreachable at boot it logs a warning, sets `ready = false`,
 * and NEVER throws (the Nest app must still start). Every method short-circuits
 * when not ready.
 */
@Injectable()
export class TypesenseService implements OnModuleInit {
  private readonly logger = new Logger(TypesenseService.name);
  private readonly client: TypesenseClient;
  private ready = false;

  constructor(private readonly config: ConfigService) {
    const options: ConfigurationOptions = {
      nodes: [
        {
          host: this.config.get<string>('TYPESENSE_HOST', 'localhost'),
          port: Number(this.config.get<string>('TYPESENSE_PORT', '8108')),
          protocol: this.config.get<string>('TYPESENSE_PROTOCOL', 'http'),
        },
      ],
      apiKey: this.config.get<string>('TYPESENSE_API_KEY', 'dev_local_key'),
      connectionTimeoutSeconds: 5,
    };
    this.client = new TypesenseClient(options);
  }

  /**
   * Best-effort bootstrap: ensure the physical collection and the alias exist.
   * MUST NOT throw — on any failure we log and stay `ready = false` so the app
   * boots and the search proxy can fall back to Prisma.
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.ensureCollection(productsCollectionSchema);
      await this.ensureAlias(PRODUCTS_ALIAS, PRODUCTS_COLLECTION);
      this.ready = true;
      this.logger.log(
        `Typesense listo (alias '${PRODUCTS_ALIAS}' -> '${PRODUCTS_COLLECTION}')`,
      );
    } catch (error) {
      this.ready = false;
      this.logger.warn(
        `Typesense no disponible en el arranque; el buscador usará el fallback de Prisma. Detalle: ${this.describe(error)}`,
      );
    }
  }

  /** Whether Typesense was reachable and bootstrapped successfully. */
  isHealthy(): boolean {
    return this.ready;
  }

  /** Idempotently create a collection if it does not already exist. */
  async ensureCollection(schema: CollectionCreateSchema): Promise<void> {
    const exists = await this.client.collections(schema.name).exists();
    if (!exists) {
      await this.client.collections().create(schema);
    }
  }

  /** Force-create a collection (drops any existing one of the same name first). */
  async createCollection(schema: CollectionCreateSchema): Promise<void> {
    await this.dropCollection(schema.name);
    await this.client.collections().create(schema);
  }

  /** Drop a collection; a missing collection is treated as a no-op. */
  async dropCollection(name: string): Promise<void> {
    try {
      await this.client.collections(name).delete();
    } catch (error) {
      if (!this.isNotFound(error)) {
        throw error;
      }
    }
  }

  /** Point an alias at a target collection (upsert semantics). */
  async ensureAlias(alias: string, target: string): Promise<void> {
    await this.client.aliases().upsert(alias, { collection_name: target });
  }

  /** Alias upsert used by the reindex command for the swap step. */
  async upsertAlias(alias: string, target: string): Promise<void> {
    await this.ensureAlias(alias, target);
  }

  /** Upsert a single document into a collection (defaults to the public alias). */
  async upsertDocument(
    doc: ProductDocument,
    collection: string = PRODUCTS_ALIAS,
  ): Promise<void> {
    if (!this.ready) {
      return;
    }
    await this.client.collections(collection).documents().upsert(doc);
  }

  /**
   * Delete a single document by id. A missing document is a no-op (idempotent);
   * any other error propagates to the caller.
   */
  async deleteDocument(
    id: string,
    collection: string = PRODUCTS_ALIAS,
  ): Promise<void> {
    if (!this.ready) {
      return;
    }
    try {
      await this.client.collections(collection).documents(id).delete();
    } catch (error) {
      if (!this.isNotFound(error)) {
        throw error;
      }
    }
  }

  /** Raw search against a collection/alias. */
  async search(
    collection: string,
    params: SearchParams<ProductDocument>,
  ): Promise<SearchResponse<ProductDocument>> {
    return this.client
      .collections<ProductDocument>(collection)
      .documents()
      .search(params);
  }

  /** Bulk import documents (used by the reindex command). */
  async import(
    collection: string,
    docs: ProductDocument[],
    action: DocumentImportParameters['action'] = 'upsert',
  ): Promise<ImportResponse[]> {
    return this.client
      .collections<ProductDocument>(collection)
      .documents()
      .import(docs, { action });
  }

  private isNotFound(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'httpStatus' in error &&
      (error as { httpStatus?: number }).httpStatus === 404
    );
  }

  private describe(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
