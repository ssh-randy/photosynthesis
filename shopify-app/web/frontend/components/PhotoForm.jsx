import { useState, useCallback } from "react";
import {
  Banner,
  Card,
  Form,
  FormLayout,
  TextField,
  Button,
  ChoiceList,
  Select,
  Thumbnail,
  Icon,
  Stack,
  TextStyle,
  Layout,
  EmptyState,
} from "@shopify/polaris";
import {
  ContextualSaveBar,
  ResourcePicker,
  useAppBridge,
  useNavigate,
} from "@shopify/app-bridge-react";
import { ImageMajor, AlertMinor } from "@shopify/polaris-icons";

/* Import the useAuthenticatedFetch hook included in the Node app template */
import { useAuthenticatedFetch, useAppQuery } from "../hooks";

/* Import custom hooks for forms */
import { useForm, useField, notEmptyString } from "@shopify/react-form";

export function PhotoForm({ Photo: InitialPhoto }) {
  const [Photo, setPhoto] = useState(InitialPhoto);
  const [showResourcePicker, setShowResourcePicker] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(Photo?.product);
  const navigate = useNavigate();
  const appBridge = useAppBridge();
  const fetch = useAuthenticatedFetch();
  const deletedProduct = Photo?.product?.title === "Deleted product";

  /**
   * 
   * Save Form, hits the PATCH endpoint for photos
   */
  const onSubmit = useCallback(
    (body) => {
      (async () => {
        const parsedBody = body;
        parsedBody.destination = parsedBody.destination[0];
        const PhotoId = Photo?.id;
        /* construct the appropriate URL to send the API request to based on whether the QR code is new or being updated */
        const url = PhotoId ? `/api/photos/${PhotoId}` : "/api/photos";
        /* a condition to select the appropriate HTTP method: PATCH to update a QR code or POST to create a new QR code */
        const method = PhotoId ? "PATCH" : "POST";
        /* use (authenticated) fetch from App Bridge to send the request to the API and, if successful, clear the form to reset the ContextualSaveBar and parse the response JSON */
        const response = await fetch(url, {
          method,
          body: JSON.stringify(parsedBody),
          headers: { "Content-Type": "application/json" },
        });
        if (response.ok) {
          makeClean();
          const Photo = await response.json();
          /* if this is a new QR code, then save the QR code and navigate to the edit page; this behavior is the standard when saving resources in the Shopify admin */
          if (!PhotoId) {
            navigate(`/photos/${Photo.id}`);
            /* if this is a QR code update, update the QR code state in this component */
          } else {
            setPhoto(Photo);
          }
        }
      })();
      return { status: "success" };
    },
    [Photo, setPhoto]
  );


  /*
    Sets up the form state with the useForm hook.

    Accepts a "fields" object that sets up each individual field with a default value and validation rules.

    Returns a "fields" object that is destructured to access each of the fields individually, so they can be used in other parts of the component.

    Returns helpers to manage form state, as well as component state that is based on form state.
  */
  const {
    fields: {
      title,
      productId,
      variantId,
      handle,
      destination,
    },
    dirty,
    reset,
    submitting,
    submit,
    makeClean,
  } = useForm({
    fields: {
      title: useField({
        value: Photo?.title || "",
        validates: [notEmptyString("Please name your QR code")],
      }),
      productId: useField({
        value: deletedProduct ? "Deleted product" : Photo?.product?.id || "",
        validates: [notEmptyString("Please select a product")],
      }),
      variantId: useField({Photo}?.variantId || ""),
      handle: useField(Photo?.handle || ""),
      destination: useField(
        Photo?.destination ? [Photo.destination] : ["product"]
      ),
    },
    onSubmit,
  });

  const PhotoURL = Photo
    ? new URL(`/photos/${Photo.id}/image`, location.toString()).toString()
    : null;

  /*
    This function is called with the selected product whenever the user clicks "Add" in the ResourcePicker.

    It takes the first item in the selection array and sets the selected product to an object with the properties from the "selection" argument.

    It updates the form state using the "onChange" methods attached to the form fields.

    Finally, closes the ResourcePicker.
  */
  const handleProductChange = useCallback(({ selection }) => {
    setSelectedProduct({
      title: selection[0].title,
      images: selection[0].images,
      handle: selection[0].handle,
    });
    productId.onChange(selection[0].id);
    variantId.onChange(selection[0].variants[0].id);
    handle.onChange(selection[0].handle);
    setShowResourcePicker(false);
  }, []);

  /*
    This function updates the form state whenever a user selects a new discount option.
  */
  const handleDiscountChange = useCallback((id) => {
    discountId.onChange(id);
    discountCode.onChange(DISCOUNT_CODES[id] || "");
  }, []);

  /*
    This function is called when a user clicks "Select product" or cancels the ProductPicker.

    It switches between a show and hide state.
  */
  const toggleResourcePicker = useCallback(
    () => setShowResourcePicker(!showResourcePicker),
    [showResourcePicker]
  );

  /**
   * This callback handles calling the deletion API
   */
  const [isDeleting, setIsDeleting] = useState(false);
  const deletePhoto = useCallback(async () => {
    reset();
    /* The isDeleting state disables the download button and the delete QR code button to show the merchant that an action is in progress */
    setIsDeleting(true);
    const response = await fetch(`/api/photos/${Photo.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
  
    if (response.ok) {
      navigate(`/`);
    }
  }, [Photo]);
    
  /*
    This function runs when a user clicks the "Go to destination" button.

    It uses data from the App Bridge context as well as form state to construct destination URLs using the URL helpers you created.
  */
  const goToDestination = useCallback(() => {
    if (!selectedProduct) return;
    const data = {
      host: appBridge.hostOrigin,
      productHandle: handle.value || selectedProduct.handle,
      variantId: variantId.value,
    };

    const targetURL =
      deletedProduct || destination.value[0] === "product"
        ? productViewURL(data)
        : productCheckoutURL(data);

    window.open(targetURL, "_blank", "noreferrer,noopener");
  }, [Photo, selectedProduct, destination, handle, variantId]);


  /*
    These variables are used to display product images, and will be populated when image URLs can be retrieved from the Admin.
  */
  const imageSrc = selectedProduct?.images?.edges?.[0]?.node?.url;
  const originalImageSrc = selectedProduct?.images?.[0]?.originalSrc;
  const altText =
    selectedProduct?.images?.[0]?.altText || selectedProduct?.title;

  /* The form layout, created using Polaris and App Bridge components. */
  return (
    <Stack vertical>
      {deletedProduct && (
        <Banner
          title="The product for this QR code no longer exists."
          status="critical"
        >
          <p>
            Scans will be directed to a 404 page, or you can choose another
            product for this QR code.
          </p>
        </Banner>
      )}
      <Layout>
        <Layout.Section>
          <Form>
            <ContextualSaveBar
              saveAction={{
                label: "Save",
                onAction: submit,
                loading: submitting,
                disabled: submitting,
              }}
              discardAction={{
                label: "Discard",
                onAction: reset,
                loading: submitting,
                disabled: submitting,
              }}
              visible={dirty}
              fullWidth
            />
            <FormLayout>
              <Card sectioned title="Title">
                <TextField
                  {...title}
                  label="Title"
                  labelHidden
                  helpText="Only store staff can see this title"
                />
              </Card>

              <Card
                title="Product"
                actions={[
                  {
                    content: productId.value
                      ? "Change product"
                      : "Select product",
                    onAction: toggleResourcePicker,
                  },
                ]}
              >
                <Card.Section>
                  {showResourcePicker && (
                    <ResourcePicker
                      resourceType="Product"
                      showVariants={false}
                      selectMultiple={false}
                      onCancel={toggleResourcePicker}
                      onSelection={handleProductChange}
                      open
                    />
                  )}
                  {productId.value ? (
                    <Stack alignment="center">
                      {imageSrc || originalImageSrc ? (
                        <Thumbnail
                          source={imageSrc || originalImageSrc}
                          alt={altText}
                        />
                      ) : (
                        <Thumbnail
                          source={ImageMajor}
                          color="base"
                          size="small"
                        />
                      )}
                      <TextStyle variation="strong">
                        {selectedProduct.title}
                      </TextStyle>
                    </Stack>
                  ) : (
                    <Stack vertical spacing="extraTight">
                      <Button onClick={toggleResourcePicker}>
                        Select product
                      </Button>
                      {productId.error && (
                        <Stack spacing="tight">
                          <Icon source={AlertMinor} color="critical" />
                          <TextStyle variation="negative">
                            {productId.error}
                          </TextStyle>
                        </Stack>
                      )}
                    </Stack>
                  )}
                </Card.Section>
                <Card.Section title="Scan Destination">
                  <ChoiceList
                    title="Scan destination"
                    titleHidden
                    choices={[
                      { label: "Link to product page", value: "product" },
                      {
                        label: "Link to checkout page with product in the cart",
                        value: "checkout",
                      },
                    ]}
                    selected={destination.value}
                    onChange={destination.onChange}
                  />
                </Card.Section>
              </Card>
            </FormLayout>
          </Form>
        </Layout.Section>
        <Layout.Section secondary>
          <Card sectioned title="QR code">
            {Photo ? (
              <EmptyState imageContained={true} image={PhotoURL} />
            ) : (
              <EmptyState>
                <p>Your QR code will appear here after you save.</p>
              </EmptyState>
            )}
            <Stack vertical>
              <Button
                fullWidth
                primary
                download
                url={PhotoURL}
                disabled={!Photo || isDeleting}
              >
                Download
              </Button>
              <Button
                fullWidth
                onClick={goToDestination}
                disabled={!selectedProduct}
              >
                Go to destination
              </Button>
            </Stack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          {Photo?.id && (
            <Button
              outline
              destructive
              onClick={deletePhoto}
              loading={isDeleting}
            >
              Delete QR code
            </Button>
          )}
        </Layout.Section>
      </Layout>
    </Stack>
  );
}

/* Builds a URL to the selected product */
function productViewURL({ host, productHandle }) {
  const url = new URL(host);
  const productPath = `/products/${productHandle}`;

  url.pathname = productPath;

  return url.toString();
}

/* Builds a URL to a checkout that contains the selected product */
function productCheckoutURL({ host, variantId, quantity = 1 }) {
  const url = new URL(host);
  const id = variantId.replace(
    /gid:\/\/shopify\/ProductVariant\/([0-9]+)/,
    "$1"
  );

  url.pathname = `/cart/${id}:${quantity}`;

  return url.toString();
}

