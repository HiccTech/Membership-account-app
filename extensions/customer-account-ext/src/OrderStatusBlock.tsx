import {
  BlockStack,
  reactExtension,
  TextBlock,
  Banner,
  useApi,
  Card,
  Divider,
} from "@shopify/ui-extensions-react/customer-account";
export default reactExtension("customer-account.page.render", () => (
  <PromotionBanner />
));

function PromotionBanner() {
  const { i18n } = useApi();

  return (
    <>
      <Banner>
        <TextBlock>Mia is great</TextBlock>
      </Banner>
      <Divider />
      <Card>Card card</Card>
    </>
  );
}
