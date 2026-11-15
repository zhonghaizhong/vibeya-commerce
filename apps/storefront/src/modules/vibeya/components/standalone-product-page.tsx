export default function StandaloneProductPage() {
  return (
    <>
      <style>{`
        body:has(.vibeya-standalone-product-frame) > main > [data-vibeya-shell-announcement],
        body:has(.vibeya-standalone-product-frame) > main > header[data-vibeya-shell-nav],
        body:has(.vibeya-standalone-product-frame) > main > footer {
          display: none !important;
        }
        body:has(.vibeya-standalone-product-frame) > main {
          min-height: 100vh;
          overflow: hidden;
        }
      `}</style>
      <iframe
        className="vibeya-standalone-product-frame"
        src="/vibeya/index.html?v=storefront-seo-copy-20261115-1#product-mg8014061?standalone=1"
        title="Custom Metal Bottle Cap Wall Sign"
        style={{ display: "block", width: "100%", height: "100vh", border: 0 }}
      />
    </>
  )
}
