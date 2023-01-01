import { useNavigate, TitleBar, Loading } from "@shopify/app-bridge-react";
import {
  Card,
  EmptyState,
  Layout,
  Page,
  SkeletonBodyText,
} from "@shopify/polaris";
import { useAppQuery } from "../hooks";

import { PhotoIndex } from "../components";


export default function HomePage() {
  /*
    Add an App Bridge useNavigate hook to set up the navigate function.
    This function modifies the top-level browser URL so that you can
    navigate within the embedded app and keep the browser in sync on reload.
  */
  const navigate = useNavigate();

  const {
    data: Photos,
    isLoading,
    isRefetching,
  } = useAppQuery({
    url: `/api/photos`,
    reactQueryOptions: {
      refetchOnReconnect: false,
    },
  });


  const CREATE_PHOTO_URL = "/photos/new";

  /* Set the QR codes to use in the list */
const photosMarkup = Photos?.length ? (
  <PhotoIndex Photos={Photos} loading={isRefetching} />
) : null;

  /* loadingMarkup uses the loading component from AppBridge and components from Polaris  */
  const loadingMarkup = isLoading ? (
    <Card sectioned>
      <Loading />
      <SkeletonBodyText />
    </Card>
  ) : null;

  /* Use Polaris Card and EmptyState components to define the contents of the empty state */
  const emptyStateMarkup =
    !isLoading && !Photos?.length ? (
      <Card sectioned>
        <EmptyState
          heading="Create unique QR codes for your product"
          /* This button will take the user to a Create a QR code page */
          action={{
            content: "Create QR code",
            onAction: () => navigate(CREATE_PHOTO_URL),
          }}
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <p>
            Allow customers to scan codes and buy products using their phones.
          </p>
        </EmptyState>
      </Card>
    ) : null;

  /*
    Use Polaris Page and TitleBar components to create the page layout,
    and include the empty state contents set above.
  */
  return (
    <Page fullWidth={!!photosMarkup}>
      <TitleBar
        title="QR codes"
        primaryAction={{
          content: "Create QR code",
          onAction: () => navigate(CREATE_PHOTO_URL),
        }}
      />
      <Layout>
        <Layout.Section>
          {loadingMarkup}
          {photosMarkup}
          {emptyStateMarkup}
        </Layout.Section>
      </Layout>
    </Page>
  );
}
