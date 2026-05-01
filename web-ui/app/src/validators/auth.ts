import * as yup from 'yup';

const phoneRegex = /^[0-9]{6,15}$/;
const extRegex = /^\+?[0-9]{1,5}$/;

export const registerSchema = yup.object({
  first_name: yup.string().min(1).max(60).required('First name is required'),
  last_name: yup.string().min(1).max(60).required('Last name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  phone_number: yup.string().matches(phoneRegex, 'Invalid phone').required('Phone is required'),
  phone_extension: yup.string().matches(extRegex, 'Invalid extension').required('Required'),
  password: yup.string().min(8, 'Min 8 characters').required('Password is required'),
  dob: yup.date().max(new Date(), 'DOB must be in the past').required('DOB is required'),
  city: yup.string().optional(),
  zone: yup.string().optional(),
});

export const loginSchema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(8, 'Min 8 characters').required('Password is required'),
});
