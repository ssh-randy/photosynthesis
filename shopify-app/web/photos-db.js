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
  db: null,
  ready: null,

  create: async function ({
    shopDomain,
    title,
    productId,
    variantId,
    handle,
    destination,
  }) {
    await this.ready;

    console.log('shopDomain: ' + shopDomain + "\n title: "+ title + "\n productId: " + productId + "\n varientId: " + variantId + "\n handle: " + handle + "\n destination: " + destination)

    const query = `
      INSERT INTO ${this.photosTableName}
      (shopDomain, title, productId, variantId, handle, destination, scans)
      VALUES (?, ?, ?, ?, ?, ?, 0)
      RETURNING id;
    `;

    const rawResults = await this.__query(query, [
      shopDomain,
      title,
      productId,
      variantId,
      handle,
      destination,
    ]);

    console.log('results: ' + rawResults)
    return rawResults[0].id;
  },

  update: async function (
    id,
    {
      title,
      productId,
      variantId,
      handle,
      discountId,
      discountCode,
      destination,
    }
  ) {
    await this.ready;

    const query = `
      UPDATE ${this.photosTableName}
      SET
        title = ?,
        productId = ?,
        variantId = ?,
        handle = ?,
        discountId = ?,
        discountCode = ?,
        destination = ?
      WHERE
        id = ?;
    `;

    await this.__query(query, [
      title,
      productId,
      variantId,
      handle,
      discountId,
      discountCode,
      destination,
      id,
    ]);
    return true;
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
      WHERE id = ?;
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

  __hasPhotosTable: async function () {
    const query = `
      SELECT name FROM sqlite_schema
      WHERE
        type = 'table' AND
        name = ?;
    `;
    const rows = await this.__query(query, [this.photosTableName]);
    return rows.length === 1;
  },

  /* Initializes the connection with the app's sqlite3 database */
  init: async function () {

    /* Initializes the connection to the database */
    this.db = this.db ?? new sqlite3.Database(DEFAULT_DB_FILE);

    const hasPhotosTable = await this.__hasPhotosTable();

    if (hasPhotosTable) {
      this.ready = Promise.resolve();

      /* Create the QR code table if it hasn't been created */
    } else {
      const query = `
        CREATE TABLE ${this.photosTableName} (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          shopDomain VARCHAR(511) NOT NULL,
          title VARCHAR(511) NOT NULL,
          productId VARCHAR(255) NOT NULL,
          variantId VARCHAR(255) NOT NULL,
          handle VARCHAR(255) NOT NULL,
          destination VARCHAR(255) NOT NULL,
          scans INTEGER,
          createdAt DATETIME NOT NULL DEFAULT (datetime(CURRENT_TIMESTAMP, 'localtime'))
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

  __increaseScanCount: async function (photo) {
    const query = `
      UPDATE ${this.photosTableName}
      SET scans = scans + 1
      WHERE id = ?
    `;
    await this.__query(query, [photo.id]);
  },

};

