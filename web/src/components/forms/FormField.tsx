import TextField, { type TextFieldProps } from '@mui/material/TextField';

type FormFieldProps = TextFieldProps & {
  label: string;
  testId?: string;
};

export function FormField({ label, testId, ...props }: FormFieldProps) {
  return (
    <TextField
      label={label}
      fullWidth
      {...props}
      slotProps={{
        ...props.slotProps,
        htmlInput: {
          ...(props.slotProps?.htmlInput as object),
          ...(testId ? { 'data-testid': testId } : {}),
        },
      }}
    />
  );
}
