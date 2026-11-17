import { permanentRedirect } from "next/navigation"

export default async function StorePage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  permanentRedirect(`/${countryCode}/products`)
}
