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

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
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
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setAuth(data.accessToken, data.refreshToken, data.user);
      navigate('/home');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
      <Card sx={{ width: '100%' }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography variant="h4" align="center" gutterBottom>
            Welcome Back
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 3 }}>
            Sign in to your family account
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} data-testid="login-error-alert">
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormField
              label="Email"
              type="email"
              testId="login-email-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
            <PasswordField
              label="Password"
              testId="login-password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading}
              sx={{ mt: 1 }}
              data-testid="login-submit-btn"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Box>

          <Typography align="center" sx={{ mt: 3 }}>
            Don't have an account?{' '}
            <Link component={RouterLink} to="/register" underline="hover">
              Sign up
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}
