import { Page } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { PhotoForm } from "../../components";

export default function ManageCode() {
  const breadcrumbs = [{ content: "Photo editing", url: "/" }];

  return (
    <Page>
      <TitleBar
        title="Generate Photos"
        breadcrumbs={breadcrumbs}
        primaryAction={null}
      />
      <PhotoForm />
    </Page>
  );
}
