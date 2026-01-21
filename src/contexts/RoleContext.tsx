import { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'cashier' | 'barber';

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  userName: string;
  setUserName: (name: string) => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>('cashier');
  const [userName, setUserName] = useState('Alex');

  return (
    <RoleContext.Provider value={{ role, setRole, userName, setUserName }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
