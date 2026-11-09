import React from "react"

import AddAddress from "../address-card/add-address"
import EditAddress from "../address-card/edit-address-modal"
import { HttpTypes } from "@medusajs/types"

type AddressBookProps = {
  customer: HttpTypes.StoreCustomer
  region: HttpTypes.StoreRegion
  openAddAddress?: boolean
}

const AddressBook: React.FC<AddressBookProps> = ({
  customer,
  region,
  openAddAddress = false,
}) => {
  const addresses = customer.addresses ?? []
  return (
    <div className="w-full">
      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <AddAddress
          region={region}
          addresses={addresses}
          openOnMount={openAddAddress}
        />
        {addresses.map((address) => {
          return (
            <EditAddress region={region} address={address} key={address.id} />
          )
        })}
      </div>
    </div>
  )
}

export default AddressBook
