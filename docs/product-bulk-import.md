# VIBEYA product import API

This endpoint imports products into the existing Medusa backend without using desktop-browser automation. It is protected by Medusa's `/admin/*` user authentication.

## Upload image files

Use the existing Admin file endpoint first. Send each image as a repeated `files` multipart field to `POST /admin/uploads`. The response contains public file URLs. Use those URLs for `images`, `marketMedia`, and designer reference images in the manifest.

```bash
curl -X POST "https://api.vibeyastudio.com/admin/uploads" \
  -H "Authorization: Bearer $MEDUSA_ADMIN_TOKEN" \
  -F "files=@carousel-01.jpg" \
  -F "files=@carousel-02.jpg"
```

Never commit or print `MEDUSA_ADMIN_TOKEN`.

## Validate a batch

Call `POST /admin/vibeya/products/import` with `dryRun` omitted or set to `true`. It checks image URLs, product handles, option/variant consistency, market prices, categories, and fulfillment destinations without writing products.

```json
{
  "dryRun": true,
  "publish": false,
  "products": [
    {
      "title": "VIBEYA Custom Clear Backpack",
      "handle": "custom-clear-pvc-backpack-17-inch",
      "subtitle": "Personalize the front panel with an image upload or design prompt",
      "description": "A transparent 17-inch PVC backpack with a customizable front panel and mesh side pockets.",
      "images": [
        { "url": "https://api.vibeyastudio.com/static/carousel-01.jpg", "alt": "Custom clear backpack, front view" }
      ],
      "options": [{ "title": "Size", "values": ["One Size"] }],
      "variants": [
        {
          "title": "One Size",
          "sku": "VIBEYA-CLEAR-BACKPACK-OS",
          "manage_inventory": false,
          "options": { "Size": "One Size" },
          "prices": [
            { "amount": 24.99, "currency_code": "usd" },
            { "amount": 28.99, "currency_code": "cad" },
            { "amount": 384.99, "currency_code": "mxn" },
            { "amount": 3178.99, "currency_code": "jpy" }
          ]
        }
      ],
      "countries": ["us", "ca", "mx", "jp"],
      "fulfillmentLocationName": "China · Clear Backpack Dispatch",
      "freeShipping": true,
      "customizable": true,
      "customizationType": "prompt_and_upload",
      "printAreas": ["front_panel"],
      "seoKeywords": ["custom clear backpack", "personalized transparent backpack", "custom PVC backpack"],
      "marketMedia": {
        "us": ["https://api.vibeyastudio.com/static/en-01.jpg"],
        "mx": ["https://api.vibeyastudio.com/static/es-01.jpg"],
        "jp": ["https://api.vibeyastudio.com/static/ja-01.jpg"]
      }
    }
  ]
}
```

The sample is illustrative; use the exact verified market prices, production details, image URLs, and fulfillment location configured in the target environment.

## Commit the import

After reviewing the dry-run response, send the same manifest with `dryRun: false`. The endpoint creates products as drafts unless `publish: true` is explicitly set. Publishing requires localized product/SEO content for each selected market, localized carousel images for US, Mexico, and Japan (Canada reuses English), valid prices in every market currency, and a China fulfillment location that covers all selected countries. If `freeShipping: true`, the endpoint creates a zero-price manual shipping option for each applicable service zone unless one already exists.

The import is create-only: an existing handle returns `409` and is never silently overwritten. Batches are limited to 25 products, 30 gallery images per product, and 100 variants per product.

```bash
curl -X POST "https://api.vibeyastudio.com/admin/vibeya/products/import" \
  -H "Authorization: Bearer $MEDUSA_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @product-import.json
```

The response returns each created product ID and handle. Check the product in the Medusa admin and verify each storefront market before treating the import as complete.
