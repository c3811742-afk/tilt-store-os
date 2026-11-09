import { useNavigate } from 'react-router';
import { Button, Card, Stack, Text } from '@/shared/components';
import { routes } from '@/shared/constants';
import { useLocale } from '@/shared/hooks';
import { vars } from '@/shared/theme';

// Shown instead of the counter until the cashier opens a shift.
export const ShiftGate = () => {
  const { text } = useLocale();
  const navigate = useNavigate();
  return (
    <Card>
      <Stack gap={vars.spacing[3]} align="flex-start">
        <Text as="h2" variant="h3">
          {text.cashier.shiftNeeded}
        </Text>
        <Button onClick={() => navigate(routes.cashier.shift)}>{text.cashier.openShift}</Button>
      </Stack>
    </Card>
  );
};
