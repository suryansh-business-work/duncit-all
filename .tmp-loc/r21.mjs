import { apply } from "./e.mjs";

// ---------- login.form.tsx
apply("packages/user-context/src/login-screen/login.form.tsx", [
  [
    "import type { LoginFormValues } from './login.types';\nimport { loginInitialValues } from './login.types';\nimport { inkCta } from './glass';",
    "import type { LoginFormValues } from './login.types';\nimport { loginInitialValues } from './login.types';\nimport { inkCta } from './glass';\nimport { sessionT, type SessionTranslate } from '../i18n';",
  ],
  [
    "export const loginSchema = yup.object({\n  email: yup\n    .string()\n    .trim()\n    .email('Enter a valid e-mail address')\n    .required('E-mail address is required'),\n  password: yup.string().required('Password is required'),\n});",
    "/** Built from the caller's translator, so the messages follow the reader. */\nexport const buildLoginSchema = (t: SessionTranslate) =>\n  yup.object({\n    email: yup\n      .string()\n      .trim()\n      .email(t('session.login.emailInvalid'))\n      .required(t('session.login.emailRequired')),\n    password: yup.string().required(t('session.login.passwordRequired')),\n  });",
  ],
  [
    "interface Props {\n  loading?: boolean;\n  onSubmit: (values: LoginFormValues) => Promise<void> | void;\n  onForgotPassword: () => void;\n}",
    "interface Props {\n  loading?: boolean;\n  onSubmit: (values: LoginFormValues) => Promise<void> | void;\n  onForgotPassword: () => void;\n  /** The mounting surface's translator; the shipped English when omitted. */\n  t?: SessionTranslate;\n}",
  ],
  [
    "export default function LoginForm({ loading, onSubmit, onForgotPassword }: Readonly<Props>) {\n  const [showPwd, setShowPwd] = useState(false);\n  const formik = useFormik<LoginFormValues>({\n    initialValues: loginInitialValues,\n    validationSchema: loginSchema,",
    "export default function LoginForm({\n  loading,\n  onSubmit,\n  onForgotPassword,\n  t = sessionT,\n}: Readonly<Props>) {\n  const [showPwd, setShowPwd] = useState(false);\n  const formik = useFormik<LoginFormValues>({\n    initialValues: loginInitialValues,\n    validationSchema: buildLoginSchema(t),",
  ],
  ['          placeholder="e-mail address"', "          placeholder={t('session.login.email')}"],
  ['          placeholder="password"', "          placeholder={t('session.login.password')}"],
  [
    'aria-label="toggle password visibility"',
    "aria-label={t('session.login.togglePassword')}",
  ],
  [
    "          Forgot password?\n        </Link>",
    "          {t('session.login.forgotPassword')}\n        </Link>",
  ],
  [
    "            Authorized personnel only. Sign in with your Duncit credentials to access the operations portal.\n          </Typography>",
    "            {t('session.login.authorizedOnly')}\n          </Typography>",
  ],
  ['            aria-label="sign in"', "            aria-label={t('session.login.submit')}"],
]);
