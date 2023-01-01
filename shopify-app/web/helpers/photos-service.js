import shopify from "../shopify.js";
import { PhotosDB } from "../photos-db.js";

/*
  The app's database stores the productId and the discountId.
  This query is used to get the fields the frontend needs for those IDs.
  By querying the Shopify GraphQL Admin API at runtime, data can't become stale.
  This data is also queried so that the full state can be saved to the database, in order to generate QR code links.
*/
const PAGE_ADMIN_QUERY = `
  query nodes($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        handle
        title
        images(first: 1) {
          edges {
            node {
              url
            }
          }
        }
      }
      ... on ProductVariant {
        id
      }
      ... on DiscountCodeNode {
        id
      }
    }
  }
`;

export async function getPhotoOr404(req, res, checkDomain = true) {
  try {
    const response = await PhotosDB.get(req.params.id);
    if (
      response === undefined ||
      (checkDomain &&
        (await getShopUrlFromSession(req, res)) !== response.shopDomain)
    ) {
      res.status(404).send();
    } else {
      return response;
    }
  } catch (error) {
    res.status(500).send(error.message);
  }

  return undefined;
}

export async function getShopUrlFromSession(req, res) {
  return `https://${res.locals.shopify.session.shop}`;
}

/*
Expect body to contain
title: string
productId: string
variantId: string
handle: string
discountId: string
discountCode: string
destination: string
*/
export async function parsePhotoBody(req, res) {

  return {
    title: req.body.title,
    productId: req.body.productId,
    variantId: req.body.variantId,
    handle: req.body.handle,
    destination: req.body.destination,
  };
}

/*
  Replaces the productId with product data queried from the Shopify GraphQL Admin API
*/
export async function formatPhotoResponse(req, res, rawCodeData) {
  const ids = [];
  console.log('rawCodeData: ' + rawCodeData.productId)
  /* Get every product, variant and discountID that was queried from the database */
  rawCodeData.forEach(({ productId, variantId }) => {
    ids.push(productId);
    ids.push(variantId);

  });

  /* Instantiate a new GraphQL client to query the Shopify GraphQL Admin API */
  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });

  /* Query the Shopify GraphQL Admin API */
  const adminData = await client.query({
    data: {
      query: PAGE_ADMIN_QUERY,

      /* The IDs that are pulled from the app's database are used to query product, variant and discount information */
      variables: { ids },
    },
  });

  /*
    Replace the product, discount and variant IDs with the data fetched using the Shopify GraphQL Admin API.
  */
  const formattedData = rawCodeData.map((photo) => {
    const product = adminData.body.data.nodes.find(
      (node) => photo.productId === node?.id
    ) || {
      title: "Deleted product",
    };

    const discountDeleted =
    photo.discountId &&
      !adminData.body.data.nodes.find((node) => photo.discountId === node?.id);

    /*
      Merge the data from the app's database with the data queried from the Shopify GraphQL Admin API
    */
    const formattedPhoto = {
      ...photo,
      product,
    };

    /* Since product.id already exists, productId isn't required */
    delete formattedPhoto.productId;

    return formattedPhoto;
  });

  return formattedData;
}
