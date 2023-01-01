/*
  The custom REST API to support the app frontend.
  Handlers combine application data from qr-codes-db.js with helpers to merge the Shopify GraphQL Admin API data.
  The Shop is the Shop that the current user belongs to. For example, the shop that is using the app.
  This information is retrieved from the Authorization header, which is decoded from the request.
  The authorization header is added by App Bridge in the frontend code.
*/

import express from "express";

import shopify from "../shopify.js";
import { PhotosDB } from "../photos-db.js";
import {
  getPhotoOr404,
  getShopUrlFromSession,
  parsePhotoBody,
  formatPhotoResponse,
} from "../helpers/photos-service.js";

const DISCOUNTS_QUERY = `
  query discounts($first: Int!) {
    codeDiscountNodes(first: $first) {
      edges {
        node {
          id
          codeDiscount {
            ... on DiscountCodeBasic {
              codes(first: 1) {
                edges {
                  node {
                    code
                  }
                }
              }
            }
            ... on DiscountCodeBxgy {
              codes(first: 1) {
                edges {
                  node {
                    code
                  }
                }
              }
            }
            ... on DiscountCodeFreeShipping {
              codes(first: 1) {
                edges {
                  node {
                    code
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export default function applyPhotoApiEndpoints(app) {
  app.use(express.json());

  app.post("/api/photos", async (req, res) => {

    try {
      const id = await PhotosDB.create({
        ...(await parsePhotoBody(req)),

        /* Get the shop from the authorization header to prevent users from spoofing the data */
        shopDomain: await getShopUrlFromSession(req, res),
      });
      const response = await formatPhotoResponse(req, res, [
        await PhotosDB.get(id),
      ]);
      res.status(201).send(response[0]);
    } catch (error) {
      res.status(500).send(error.message);
    }
  });

  app.patch("/api/photos/:id", async (req, res) => {
    const qrcode = await getPhotoOr404(req, res);

    if (qrcode) {
      try {
        await PhotosDB.update(req.params.id, await parsePhotoBody(req));
        const response = await formatPhotoResponse(req, res, [
          await PhotosDB.read(req.params.id),
        ]);
        res.status(200).send(response[0]);
      } catch (error) {
        res.status(500).send(error.message);
      }
    }
  });

  app.get("/api/photos", async (req, res) => {
    try {
      const rawCodeData = await PhotosDB.list(
        await getShopUrlFromSession(req, res)
      );

      const response = await formatPhotoResponse(req, res, rawCodeData);
      res.status(200).send(response);
    } catch (error) {
      console.error(error);
      res.status(500).send(error.message);
    }
  });

  app.get("/api/photos/:id", async (req, res) => {
    const qrcode = await getPhotoOr404(req, res);

    if (qrcode) {
      const formattedQrCode = await formatPhotoResponse(req, res, [qrcode]);
      res.status(200).send(formattedQrCode[0]);
    }
  });

  app.delete("/api/photos/:id", async (req, res) => {
    const qrcode = await getPhotoOr404(req, res);

    if (qrcode) {
      await PhotosDB.delete(req.params.id);
      res.status(200).send();
    }
  });
}
