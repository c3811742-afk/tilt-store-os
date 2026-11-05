import type { Branch, User } from '@/shared/types';

// The demo's staff. GenZ's owners and staff aren't named in public sources, so every name here is a
// placeholder to replace with the real team (Staff, users & permissions).
export const demoPassword = 'genz2026';

export const seedPeople = (branches: Branch[], createdAt: string): User[] => {
  let count = 0;
  const user = (name: string, roleIds: string[], branchIds: string[], extra: Partial<User> = {}): User => {
    count += 1;
    const username = name.toLowerCase().replace(/[^a-z]+/g, '.');
    return {
      id: `u-${count}`,
      name,
      phone: `0100000${String(count).padStart(4, '0')}`,
      email: `${username}@example.com`,
      username,
      password: demoPassword,
      roleIds,
      branchIds,
      pin: String(1000 + count * 7).slice(-4),
      approvalPin: roleIds.includes('role-manager') || roleIds.includes('role-owner') ? String(2000 + count * 13).slice(-4) : undefined,
      status: 'active',
      mustChangePassword: false,
      createdAt,
      ...extra,
    };
  };
  const all = branches.map((branch) => branch.id);
  const id = (key: string) => branches.find((branch) => branch.id === key)?.id ?? key;

  return [
    user('Omar Fawzy', ['role-owner'], all),
    user('Nadine Samir', ['role-owner'], all),
    user('Karim Adel', ['role-manager'], [id('b-park-mall'), id('b-online')]),
    user('Salma Ashraf', ['role-cashier'], [id('b-park-mall')]),
    user('Youssef Hany', ['role-cashier'], [id('b-park-mall')]),
    user('Mostafa Gamal', ['role-storekeeper'], [id('b-park-mall')]),
    user('Hana Wael', ['role-manager'], [id('b-royal-park')]),
    user('Ziad Emad', ['role-cashier'], [id('b-royal-park')]),
    user('Farida Mohsen', ['role-cashier', 'role-storekeeper'], [id('b-royal-park')]),
    user('Faisal Al-Harbi', ['role-manager'], [id('b-souq7')]),
    user('Reem Al-Qahtani', ['role-cashier'], [id('b-souq7')]),
    user('Abdullah Al-Zahrani', ['role-storekeeper'], [id('b-souq7')]),
    user('Mariam Tamer', ['role-online'], [id('b-online')]),
    user('Hassan Ragab', ['role-storekeeper'], [id('b-warehouse')]),
    user('Mahmoud Saeed', ['role-driver'], [id('b-warehouse'), id('b-park-mall'), id('b-royal-park')]),
    user('Kracked Studios team', ['role-brand'], [], { brandId: 'br-kracked-studios' }),
    user('Ali Mostafa', ['role-cashier'], [id('b-park-mall')], { status: 'inactive' }),
  ];
};
