import TextField, { type TextFieldProps } from '@mui/material/TextField';

type FormFieldProps = TextFieldProps & {
  label: string;
};

export function FormField({ label, ...props }: FormFieldProps) {
  return <TextField label={label} fullWidth {...props} />;
}
