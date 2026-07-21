/** Values managed by the address form (Profile Settings › Address Book). */
export interface AddressFormValues {
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
}

/** A saved address as served by `myAddresses`. */
export interface UserAddress extends AddressFormValues {
  id: string;
  email: string;
}

export const blankAddressValues: AddressFormValues = {
  label: 'Home',
  name: '',
  phone: '',
  line1: '',
  line2: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  is_default: false,
};
