import { AppShell } from '@/shared/components';
import { routes } from '@/shared/constants';
import { ownerNav } from '../constants/nav';

// The owner's frame: the shared app shell with the owner's menu.
export const OwnerLayout = () => <AppShell nav={ownerNav} notificationsTo={routes.owner.notifications} />;
