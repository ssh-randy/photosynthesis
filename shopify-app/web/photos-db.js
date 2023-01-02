/*
  This file interacts with the app's database and is used by the app's REST APIs.
*/

import sqlite3 from "sqlite3";
import path from "path";
import shopify from "./shopify.js";

const DEFAULT_DB_FILE = path.join(process.cwd(), "database.sqlite");
const DEFAULT_PURCHASE_QUANTITY = 1;

export const PhotosDB = {
  photosTableName: "photos",
  photosGeneratedTableName: "photos_generated",
  db: null,
  ready: null,

  create: async function ({
    photoId,
    shopDomain,
    name,
    url,
  }) {
    await this.ready;

    const query = `
      INSERT INTO ${this.photosTableName}
      (photo_id, product_id, variant_id, shopDomain, name, url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      RETURNING id;
    `;

    const rawResults = await this.__query(query, [
      photoId,
      shopDomain,
      name,
      url,
    ]);

    console.log('results: ' + rawResults)
    return rawResults[0].id;
  },

  list: async function (shopDomain) {
    await this.ready;
    console.log('calling db.list, shopDomain: ' + shopDomain)
    const query = `
      SELECT * FROM ${this.photosTableName}
      WHERE shopDomain = ?;
    `;

    console
    const results = await this.__query(query, [shopDomain]);

    console.log('results of dbQuery: ' + results)
    return results;
  },

  get: async function (id) {
    await this.ready;
    const query = `
      SELECT * FROM ${this.photosTableName}
      WHERE photo_id = ?;
    `;
    const rows = await this.__query(query, [id]);
    if (!Array.isArray(rows) || rows?.length !== 1) return undefined;

    return rows[0];
  },

  delete: async function (id) {
    await this.ready;
    const query = `
      DELETE FROM ${this.photosTableName}
      WHERE id = ?;
    `;
    await this.__query(query, [id]);
    return true;
  },

  /* Private */

  /*
    Used to check whether to create the database.
    Also used to make sure the database and table are set up before the server starts.
  */

  __hasTable: async function (tableName) {
    const query = `
      SELECT name FROM sqlite_schema
      WHERE
        type = 'table' AND
        name = ?;
    `;
    const rows = await this.__query(query, [tableName]);
    return rows.length === 1;
  },

  /* Initializes the connection with the app's sqlite3 database */
  init: async function () {

    /* Initializes the connection to the database */
    this.db = this.db ?? new sqlite3.Database(DEFAULT_DB_FILE);

    const hasPhotosTable = await this.__hasTable(this.photosTableName);

    const hasPhotosGeneratedTable = await this.__hasTable(this.photosGeneratedTableName);
    console.log('hasPhotosTable: ' + hasPhotosTable)
    if (hasPhotosTable) {
      this.ready = Promise.resolve();

      /* Create the base photo table if it hasn't been created */
    } else {
      const query = `
        CREATE TABLE ${this.photosTableName} (
          photo_id UUID PRIMARY KEY,
          product_id VARCHAR(255) NOT NULL,
          variant_id VARCHAR(255) NOT NULL,
          shopDomain VARCHAR(511) NOT NULL,
          name VARCHAR(511) NOT NULL,
          url VARCHAT(255) NOT NULL,
          createdAt DATETIME NOT NULL DEFAULT (datetime(CURRENT_TIMESTAMP, 'localtime'))
        )
      `;

      /* Tell the various CRUD methods that they can execute */
      this.ready = this.__query(query);
    }

    if (hasPhotosGeneratedTable) {
      this.ready = Promise.resolve();

      /* Create the generated photo table if it hasn't been created */
    } else {
      const query = `
        CREATE TABLE ${this.photosGeneratedTableName} (
          photo_id UUID NOT NULL,
          generated_id INTEGER,
          prompt TEXT,
          url VARCHAR(255),
          createdAt DATETIME NOT NULL DEFAULT (datetime(CURRENT_TIMESTAMP, 'localtime')),
          PRIMARY KEY(photo_id, generated_id)
        )
      `;

      /* Tell the various CRUD methods that they can execute */
      this.ready = this.__query(query);
    }
  },

  /* Perform a query on the database. Used by the various CRUD methods. */
  __query: function (sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, result) => {
        if (err) {
          reject(err);
          console.log(err)
          return;
        }
        resolve(result);
      });
    });
  },

};

