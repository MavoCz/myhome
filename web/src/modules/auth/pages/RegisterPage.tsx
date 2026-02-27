import { useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import { FormField } from '../../../components/forms/FormField';
import { PasswordField } from '../../../components/forms/PasswordField';
import { useAuthStore } from '../../../stores/authStore';
import { customFetch } from 'common';

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (): string | null => {
    if (!email || !password || !displayName || !familyName) {
      return 'Please fill in all fields.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Please enter a valid email address.';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const data = await customFetch<{
        accessToken: string;
        refreshToken: string;
        user: {
          id: number;
          email: string;
          displayName: string;
          familyId: number;
          familyName: string;
          familyRole: string;
        };
      }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, displayName, familyName }),
      });

      setAuth(data.accessToken, data.refreshToken, data.user);
      navigate('/home');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography variant="h4" align="center" gutterBottom>
            Create Account
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 3 }}>
            Start your family's journey
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} data-testid="register-error-alert">
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormField
              label="Display Name"
              testId="register-display-name-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              autoFocus
            />
            <FormField
              label="Family Name"
              testId="register-family-name-input"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
            />
            <FormField
              label="Email"
              type="email"
              testId="register-email-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <PasswordField
              label="Password"
              testId="register-password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              helperText="At least 8 characters"
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading}
              sx={{ mt: 1 }}
              data-testid="register-submit-btn"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </Box>

          <Typography align="center" sx={{ mt: 3 }}>
            Already have an account?{' '}
            <Link component={RouterLink} to="/login" underline="hover">
              Sign in
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}
